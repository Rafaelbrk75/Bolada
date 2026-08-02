/**
 * Camada de aplicação: orquestra os módulos de domínio (puros) com
 * repositórios e gateway de pagamento. É a única camada que conhece
 * persistência — as rotas HTTP (src/http) só chamam métodos daqui.
 *
 * Três garantias estruturais implementadas aqui:
 *  - C1: todo cartão autorizado acaba capturado ou liberado — nunca "esquecido".
 *  - C2: operações que mexem no mesmo jogo são serializadas (mutex por jogoId),
 *        evitando oversell/corrida; capturas são idempotentes.
 *  - C3: toda transição de estado despacha os EFEITOS declarados na máquina de
 *        estados e registra evento no log imutável (auditoria/conciliação).
 */

import { randomUUID } from 'node:crypto';
import { EfeitoJogo, EventoJogo, StatusJogo, transicionar } from '../domain/jogo';
import { ConfigTaxas, TAXAS_PADRAO } from '../domain/pagamento';
import { diasBloqueioPorNoShow, politicaCancelamento } from '../domain/cancelamento';
import { EntradaEspera, expirouJanela, promoverProximo } from '../domain/waitlist';
import {
  GatewayPagamento,
  JogoResumo,
  ResultadoInscricao,
  inscreverJogador,
} from '../services/inscricao';
import { ErroConflito, ErroNaoEncontrado, ErroRequisicaoInvalida } from './erros';
import {
  CreditoRepositorio,
  EventoRegistro,
  EventoRepositorio,
  Jogo,
  JogoRepositorio,
  Participacao,
  ParticipacaoRepositorio,
  Repasse,
  RepasseItem,
  RepasseRepositorio,
  Usuario,
  UsuarioRepositorio,
} from '../infra/repositorios/tipos';

export interface CriarJogoInput {
  campoId: string;
  quadraId: string;
  organizadorId: string;
  titulo: string;
  nivel: string;
  inicio: Date;
  fim: Date;
  capacidade: number;
  minimoJogadores: number;
  prazoConfirmacao: Date;
  precoVagaCentavos: number;
  publico?: boolean;
}

function pctBps(valorCentavos: number, bps: number): number {
  return Math.round((valorCentavos * bps) / 10_000);
}

export class JogoAppService {
  constructor(
    private readonly jogoRepo: JogoRepositorio,
    private readonly participacaoRepo: ParticipacaoRepositorio,
    private readonly creditoRepo: CreditoRepositorio,
    private readonly eventoRepo: EventoRepositorio,
    private readonly usuarioRepo: UsuarioRepositorio,
    private readonly repasseRepo: RepasseRepositorio,
    private readonly gateway: GatewayPagamento,
    private readonly cfg: ConfigTaxas = TAXAS_PADRAO
  ) {}

  // ---------- C2: serialização por jogo ----------
  // Fila de promessas por chave: cada operação encadeia após a anterior do mesmo
  // jogo, então nunca há duas leituras-de-vagas + escrita interleaved. É o
  // stand-in em processo do `SELECT ... FOR UPDATE` do backend real.
  private readonly filas = new Map<string, Promise<unknown>>();

  private comTrava<T>(chave: string, fn: () => Promise<T>): Promise<T> {
    const anterior = this.filas.get(chave) ?? Promise.resolve();
    const resultado = anterior.then(() => fn());
    // guarda uma versão que engole erros, pra falha de uma op não travar a fila.
    this.filas.set(
      chave,
      resultado.then(
        () => undefined,
        () => undefined
      )
    );
    return resultado;
  }

  private travaJogo<T>(jogoId: string, fn: () => Promise<T>): Promise<T> {
    return this.comTrava(`jogo:${jogoId}`, fn);
  }

  // ---------- helpers de leitura ----------

  private async getJogoOuFalhar(id: string): Promise<Jogo> {
    const jogo = await this.jogoRepo.buscarPorId(id);
    if (!jogo) throw new ErroNaoEncontrado('jogo', id);
    return jogo;
  }

  private async getParticipacaoOuFalhar(id: string): Promise<Participacao> {
    const p = await this.participacaoRepo.buscarPorId(id);
    if (!p) throw new ErroNaoEncontrado('participação', id);
    return p;
  }

  private jogoParaResumo(jogo: Jogo, participacoes: Participacao[]): JogoResumo {
    const vagasPagas = participacoes.filter(
      (p) => p.status === 'autorizada' || p.status === 'confirmada'
    ).length;
    return {
      id: jogo.id,
      status: jogo.status,
      capacidade: jogo.capacidade,
      minimoJogadores: jogo.minimoJogadores,
      vagasPagas,
      precoVagaCentavos: jogo.precoVagaCentavos,
      nivel: jogo.nivel,
    };
  }

  private async registrarEvento(
    tipo: string,
    entidadeId: string,
    atorId: string | undefined,
    dados: Record<string, unknown>,
    momento: Date
  ): Promise<void> {
    await this.eventoRepo.registrar({ tipo, entidadeId, atorId, dados, criadoEm: momento });
  }

  // ---------- C3: transição + despacho de efeitos ----------

  /**
   * Única porta de mudança de status: valida a transição, persiste, registra
   * evento e EXECUTA os efeitos declarados. `executarEfeitos` tem checagem de
   * exaustividade (`never`), então um efeito novo sem handler quebra o build —
   * é impossível voltar a "ignorar efeitos" silenciosamente.
   */
  private async aplicarTransicao(
    jogo: Jogo,
    evento: EventoJogo,
    momento: Date,
    ator?: string
  ): Promise<Jogo> {
    let destino;
    try {
      destino = transicionar(jogo.status, evento);
    } catch (e) {
      throw new ErroConflito((e as Error).message);
    }
    const de = jogo.status;
    jogo.status = destino.para;
    jogo.atualizadoEm = momento;
    await this.jogoRepo.atualizar(jogo);
    await this.registrarEvento(
      `jogo.${evento}`,
      jogo.id,
      ator,
      { de, para: destino.para, efeitos: destino.efeitos },
      momento
    );
    await this.executarEfeitos(jogo, destino.efeitos, momento);
    return jogo;
  }

  private async executarEfeitos(
    jogo: Jogo,
    efeitos: EfeitoJogo[],
    momento: Date
  ): Promise<void> {
    for (const efeito of efeitos) {
      const participacoes = await this.participacaoRepo.listarPorJogo(jogo.id);
      switch (efeito) {
        case 'capturar_pagamentos_autorizados':
          await this.efeitoCapturar(jogo, participacoes, momento);
          break;
        case 'liberar_autorizacoes':
          await this.efeitoLiberar(jogo, participacoes, momento);
          break;
        case 'reembolsar_pagamentos':
          await this.efeitoReembolsar(jogo, participacoes, momento);
          break;
        case 'notificar_jogadores_confirmacao':
          await this.efeitoNotificar(jogo, participacoes, 'jogo_confirmado', momento);
          break;
        case 'notificar_cancelamento':
          await this.efeitoNotificar(jogo, participacoes, 'jogo_cancelado', momento);
          break;
        case 'abrir_janela_avaliacao':
          await this.registrarEvento('jogo.janela_avaliacao_aberta', jogo.id, undefined, {}, momento);
          break;
        case 'registrar_no_shows':
          await this.efeitoRegistrarNoShows(jogo, participacoes, momento);
          break;
        case 'incluir_em_repasse':
          await this.efeitoIncluirEmRepasse(jogo, participacoes, momento);
          break;
        default: {
          // Exaustividade: se um EfeitoJogo novo entrar no domínio sem handler,
          // isto vira erro de compilação (never) — não passa batido.
          const _exaustivo: never = efeito;
          throw new Error(`efeito não tratado: ${String(_exaustivo)}`);
        }
      }
    }
  }

  /** Captura pré-autorizações de cartão. Idempotente: pula quem já capturou. */
  private async efeitoCapturar(
    jogo: Jogo,
    participacoes: Participacao[],
    momento: Date
  ): Promise<void> {
    for (const p of participacoes) {
      if (p.status === 'autorizada' && p.paymentId && !p.capturado) {
        await this.gateway.capturar(p.paymentId);
        p.status = 'confirmada';
        p.capturado = true;
        p.atualizadoEm = momento;
        await this.participacaoRepo.atualizar(p);
        await this.registrarEvento(
          'pagamento.capturado',
          jogo.id,
          p.usuarioId,
          { participacaoId: p.id, paymentId: p.paymentId, valorCentavos: p.split?.totalCobradoCentavos },
          momento
        );
      }
    }
  }

  /** Void nas pré-autorizações não capturadas (cartão de jogo cancelado). */
  private async efeitoLiberar(
    jogo: Jogo,
    participacoes: Participacao[],
    momento: Date
  ): Promise<void> {
    for (const p of participacoes) {
      if (p.status === 'autorizada' && p.paymentId) {
        await this.gateway.liberarAutorizacao(p.paymentId);
        p.status = 'cancelada';
        p.atualizadoEm = momento;
        await this.participacaoRepo.atualizar(p);
        await this.registrarEvento(
          'pagamento.autorizacao_liberada',
          jogo.id,
          p.usuarioId,
          { participacaoId: p.id, paymentId: p.paymentId },
          momento
        );
      }
    }
  }

  /** Reembolso integral de quem já foi cobrado (Pix ou cartão capturado). */
  private async efeitoReembolsar(
    jogo: Jogo,
    participacoes: Participacao[],
    momento: Date
  ): Promise<void> {
    for (const p of participacoes) {
      if (p.status === 'confirmada' && p.capturado && p.paymentId && p.split) {
        const total = p.split.totalCobradoCentavos;
        await this.gateway.reembolsar(p.paymentId, total);
        p.valorReembolsadoCentavos = total;
        p.status = 'reembolsada';
        p.atualizadoEm = momento;
        await this.participacaoRepo.atualizar(p);
        await this.registrarEvento(
          'pagamento.reembolsado',
          jogo.id,
          p.usuarioId,
          { participacaoId: p.id, paymentId: p.paymentId, valorCentavos: total },
          momento
        );
      }
    }
  }

  private async efeitoNotificar(
    jogo: Jogo,
    participacoes: Participacao[],
    tipo: 'jogo_confirmado' | 'jogo_cancelado',
    momento: Date
  ): Promise<void> {
    // Notifica todo mundo que teve engajamento no jogo (pagou ou entrou na fila).
    // Push real fica pendente de infra de notificação — aqui vira evento auditável.
    const alvos = participacoes.filter((p) => p.paymentId || p.posicaoEspera !== undefined);
    for (const p of alvos) {
      await this.registrarEvento(
        `notificacao.${tipo}`,
        jogo.id,
        p.usuarioId,
        { participacaoId: p.id },
        momento
      );
    }
  }

  private async efeitoRegistrarNoShows(
    jogo: Jogo,
    participacoes: Participacao[],
    momento: Date
  ): Promise<void> {
    // A1: quem deu check-in conclui; quem não deu vira no_show (sem reembolso),
    // conta no histórico e recebe bloqueio progressivo (diasBloqueioPorNoShow).
    let noShows = 0;
    for (const p of participacoes) {
      if (p.status !== 'confirmada') continue;
      const usuario = await this.usuarioRepo.obterOuCriar(p.usuarioId);

      if (p.checkinEm) {
        p.status = 'concluida';
        p.atualizadoEm = momento;
        await this.participacaoRepo.atualizar(p);
        usuario.jogosRealizados += 1;
        await this.usuarioRepo.atualizar(usuario);
        await this.registrarEvento('participacao.concluida', jogo.id, p.usuarioId, { participacaoId: p.id }, momento);
      } else {
        p.status = 'no_show';
        p.atualizadoEm = momento;
        await this.participacaoRepo.atualizar(p);

        usuario.noShows += 1;
        const dias = diasBloqueioPorNoShow(usuario.noShows);
        if (dias > 0) {
          usuario.bloqueadoAte = new Date(momento.getTime() + dias * 86_400_000);
        }
        await this.usuarioRepo.atualizar(usuario);
        noShows++;
        await this.registrarEvento(
          'participacao.no_show',
          jogo.id,
          p.usuarioId,
          { participacaoId: p.id, totalNoShows: usuario.noShows, bloqueioDias: dias },
          momento
        );
      }
    }
    await this.registrarEvento('jogo.no_shows_registrados', jogo.id, undefined, { quantidade: noShows }, momento);
  }

  private async efeitoIncluirEmRepasse(
    jogo: Jogo,
    participacoes: Participacao[],
    momento: Date
  ): Promise<void> {
    // Na liquidação, sinalizamos no log quais transações ficam ELEGÍVEIS para
    // repasse (concluídas ou no-show — em ambas a quadra fica com o dinheiro).
    // O fechamento em lote por quadra é feito por `fecharRepasse` (A2).
    const itens = participacoes
      .filter(
        (p) => (p.status === 'concluida' || p.status === 'no_show') && p.capturado && p.split
      )
      .map((p) => ({ participacaoId: p.id, valorQuadraCentavos: p.split!.valorQuadraCentavos }));
    const totalQuadra = itens.reduce((s, i) => s + i.valorQuadraCentavos, 0);
    await this.registrarEvento(
      'repasse.itens_incluidos',
      jogo.id,
      undefined,
      { quantidade: itens.length, valorQuadraCentavos: totalQuadra, itens },
      momento
    );
  }

  /** Cancela quem sobrou na waitlist quando o jogo inteiro é cancelado. */
  private async cancelarWaitlistRestante(jogoId: string, momento: Date): Promise<void> {
    const parts = await this.participacaoRepo.listarPorJogo(jogoId);
    for (const p of parts) {
      if (p.status === 'em_espera' || p.status === 'reservada') {
        p.status = 'cancelada';
        p.atualizadoEm = momento;
        await this.participacaoRepo.atualizar(p);
      }
    }
  }

  // ---------- ciclo de vida do jogo ----------

  async criarJogo(input: CriarJogoInput): Promise<Jogo> {
    if (input.capacidade < 2 || input.capacidade > 30) {
      throw new ErroRequisicaoInvalida('capacidade deve estar entre 2 e 30');
    }
    if (input.minimoJogadores <= 0 || input.minimoJogadores > input.capacidade) {
      throw new ErroRequisicaoInvalida('minimoJogadores deve ser > 0 e <= capacidade');
    }
    if (input.fim <= input.inicio) {
      throw new ErroRequisicaoInvalida('fim deve ser depois do início');
    }
    if (input.prazoConfirmacao > input.inicio) {
      throw new ErroRequisicaoInvalida('prazoConfirmacao deve ser <= início');
    }
    if (!Number.isInteger(input.precoVagaCentavos) || input.precoVagaCentavos < 0) {
      throw new ErroRequisicaoInvalida('precoVagaCentavos deve ser inteiro >= 0');
    }

    const agora = new Date();
    const jogo: Jogo = {
      id: randomUUID(),
      campoId: input.campoId,
      quadraId: input.quadraId,
      organizadorId: input.organizadorId,
      titulo: input.titulo,
      nivel: input.nivel,
      inicio: input.inicio,
      fim: input.fim,
      capacidade: input.capacidade,
      minimoJogadores: input.minimoJogadores,
      prazoConfirmacao: input.prazoConfirmacao,
      precoVagaCentavos: input.precoVagaCentavos,
      status: 'rascunho',
      publico: input.publico ?? true,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    const criado = await this.jogoRepo.criar(jogo);
    await this.registrarEvento('jogo.criado', criado.id, input.organizadorId, {}, agora);
    return criado;
  }

  async obterJogo(id: string): Promise<Jogo> {
    return this.getJogoOuFalhar(id);
  }

  async listarJogos(filtro?: { status?: StatusJogo; publico?: boolean }): Promise<Jogo[]> {
    return this.jogoRepo.listar(filtro);
  }

  async listarParticipacoes(jogoId: string): Promise<Participacao[]> {
    await this.getJogoOuFalhar(jogoId);
    return this.participacaoRepo.listarPorJogo(jogoId);
  }

  async listarEventos(jogoId: string): Promise<EventoRegistro[]> {
    await this.getJogoOuFalhar(jogoId);
    return this.eventoRepo.listarPorEntidade(jogoId);
  }

  async obterUsuario(id: string): Promise<Usuario> {
    return this.usuarioRepo.obterOuCriar(id);
  }

  // ---------- A1: check-in ----------

  /** Registra presença. Sem check-in até o `finalizar`, a participação vira no-show. */
  async fazerCheckin(participacaoId: string, momento: Date = new Date()): Promise<Participacao> {
    const p = await this.getParticipacaoOuFalhar(participacaoId);
    return this.travaJogo(p.jogoId, async () => {
      const pp = await this.getParticipacaoOuFalhar(participacaoId);
      if (pp.status !== 'confirmada') {
        throw new ErroConflito('só é possível check-in em participação confirmada e paga');
      }
      const jogo = await this.getJogoOuFalhar(pp.jogoId);
      if (jogo.status !== 'confirmado' && jogo.status !== 'em_andamento') {
        throw new ErroConflito('check-in só fica disponível a partir da confirmação do jogo');
      }
      pp.checkinEm = momento;
      pp.atualizadoEm = momento;
      await this.participacaoRepo.atualizar(pp);
      await this.registrarEvento('participacao.checkin', pp.jogoId, pp.usuarioId, { participacaoId: pp.id }, momento);
      return pp;
    });
  }

  // ---------- A2: repasses ----------

  /**
   * Estorno administrativo (disputa/chargeback) de uma transação já capturada.
   * Devolve o total ao jogador; a parte da quadra já repassada é debitada no
   * próximo `fecharRepasse` como item de compensação.
   */
  async estornarParticipacao(participacaoId: string, momento: Date = new Date()): Promise<Participacao> {
    const p = await this.getParticipacaoOuFalhar(participacaoId);
    return this.travaJogo(p.jogoId, async () => {
      const pp = await this.getParticipacaoOuFalhar(participacaoId);
      if (!pp.capturado || !pp.paymentId || !pp.split) {
        throw new ErroConflito('não há pagamento capturado para estornar');
      }
      if (pp.status === 'reembolsada') throw new ErroConflito('participação já reembolsada');
      const total = pp.split.totalCobradoCentavos;
      await this.gateway.reembolsar(pp.paymentId, total);
      pp.valorReembolsadoCentavos = total;
      pp.status = 'reembolsada';
      pp.atualizadoEm = momento;
      await this.participacaoRepo.atualizar(pp);
      await this.registrarEvento(
        'pagamento.estornado',
        pp.jogoId,
        pp.usuarioId,
        { participacaoId: pp.id, valorCentavos: total, jaRepassado: pp.repasseId !== undefined },
        momento
      );
      return pp;
    });
  }

  async obterRepasse(id: string): Promise<{ repasse: Repasse; itens: RepasseItem[] }> {
    const repasse = await this.repasseRepo.buscarPorId(id);
    if (!repasse) throw new ErroNaoEncontrado('repasse', id);
    const itens = await this.repasseRepo.listarItens(id);
    return { repasse, itens };
  }

  async listarRepasses(quadraId?: string): Promise<Repasse[]> {
    return this.repasseRepo.listar(quadraId ? { quadraId } : undefined);
  }

  /**
   * Fecha o repasse de uma quadra num período (lote semanal). Coleta a parte da
   * quadra de cada transação capturada de jogos LIQUIDADOS no período que ainda
   * não entrou em repasse, e desconta estornos de ciclos anteriores ainda não
   * compensados. Idempotente por (quadra, período). Cada item é auditável.
   */
  async fecharRepasse(
    quadraId: string,
    periodoInicio: Date,
    periodoFim: Date,
    momento: Date = new Date()
  ): Promise<{ repasse: Repasse; itens: RepasseItem[] }> {
    return this.comTrava(`repasse:${quadraId}`, async () => {
      if (periodoFim <= periodoInicio) {
        throw new ErroRequisicaoInvalida('periodoFim deve ser depois de periodoInicio');
      }
      const jaExiste = (await this.repasseRepo.listar({ quadraId })).some(
        (r) =>
          r.periodoInicio.getTime() === periodoInicio.getTime() &&
          r.periodoFim.getTime() === periodoFim.getTime()
      );
      if (jaExiste) {
        throw new ErroConflito('repasse já fechado para esta quadra e período');
      }

      const repasseId = randomUUID();
      const itens: RepasseItem[] = [];
      const jogosQuadra = (await this.jogoRepo.listar()).filter((j) => j.quadraId === quadraId);

      // 1) créditos: transações capturadas de jogos liquidados no período, ainda não repassadas.
      for (const jogo of jogosQuadra) {
        if (jogo.status !== 'liquidado') continue;
        if (jogo.inicio < periodoInicio || jogo.inicio >= periodoFim) continue;
        const parts = await this.participacaoRepo.listarPorJogo(jogo.id);
        for (const p of parts) {
          const contabiliza =
            p.capturado && p.split && (p.status === 'concluida' || p.status === 'no_show') && !p.repasseId;
          if (contabiliza) {
            itens.push({
              repasseId,
              participacaoId: p.id,
              valorCentavos: p.split!.valorQuadraCentavos,
              tipo: 'credito',
            });
            p.repasseId = repasseId;
            p.atualizadoEm = momento;
            await this.participacaoRepo.atualizar(p);
          }
        }
      }

      // 2) compensações: transações desta quadra já repassadas em ciclo anterior,
      //    depois estornadas e ainda não compensadas -> item negativo agora.
      for (const jogo of jogosQuadra) {
        const parts = await this.participacaoRepo.listarPorJogo(jogo.id);
        for (const p of parts) {
          const compensa =
            p.repasseId && p.repasseId !== repasseId && p.status === 'reembolsada' && !p.compensadoEm && p.split;
          if (compensa) {
            itens.push({
              repasseId,
              participacaoId: p.id,
              valorCentavos: -p.split!.valorQuadraCentavos,
              tipo: 'estorno_compensacao',
            });
            p.compensadoEm = momento;
            p.atualizadoEm = momento;
            await this.participacaoRepo.atualizar(p);
          }
        }
      }

      const valorCentavos = itens.reduce((s, i) => s + i.valorCentavos, 0);
      const repasse: Repasse = {
        id: repasseId,
        quadraId,
        periodoInicio,
        periodoFim,
        valorCentavos,
        status: 'pendente',
        criadoEm: momento,
      };
      await this.repasseRepo.criar(repasse, itens);
      await this.registrarEvento(
        'repasse.fechado',
        quadraId,
        undefined,
        {
          repasseId,
          valorCentavos,
          creditos: itens.filter((i) => i.tipo === 'credito').length,
          compensacoes: itens.filter((i) => i.tipo === 'estorno_compensacao').length,
          periodoInicio,
          periodoFim,
        },
        momento
      );
      return { repasse, itens };
    });
  }

  async publicarJogo(id: string): Promise<Jogo> {
    return this.travaJogo(id, async () => {
      const jogo = await this.getJogoOuFalhar(id);
      return this.aplicarTransicao(jogo, 'publicar', new Date());
    });
  }

  async iniciarJogo(id: string): Promise<Jogo> {
    return this.travaJogo(id, async () => {
      const jogo = await this.getJogoOuFalhar(id);
      const momento = new Date();
      const atualizado = await this.aplicarTransicao(jogo, 'iniciar', momento);
      // C1 (rede de segurança): captura qualquer pré-autorização que tenha
      // sobrado até o início do jogo, pra nenhuma vaga ser jogada de graça.
      const participacoes = await this.participacaoRepo.listarPorJogo(id);
      await this.efeitoCapturar(atualizado, participacoes, momento);
      return atualizado;
    });
  }

  async finalizarJogo(id: string): Promise<Jogo> {
    return this.travaJogo(id, async () => {
      const jogo = await this.getJogoOuFalhar(id);
      // efeitos 'registrar_no_shows' + 'abrir_janela_avaliacao' cuidam do resto.
      return this.aplicarTransicao(jogo, 'finalizar', new Date());
    });
  }

  async liquidarJogo(id: string): Promise<Jogo> {
    return this.travaJogo(id, async () => {
      const jogo = await this.getJogoOuFalhar(id);
      return this.aplicarTransicao(jogo, 'liquidar', new Date());
    });
  }

  async cancelarJogoManual(id: string, motivo?: string): Promise<Jogo> {
    return this.travaJogo(id, async () => {
      const jogo = await this.getJogoOuFalhar(id);
      const momento = new Date();
      jogo.motivoCancelamento = motivo;
      // efeitos da transição fazem void/reembolso/notificação conforme o estado.
      const atualizado = await this.aplicarTransicao(jogo, 'cancelar_manual', momento);
      await this.cancelarWaitlistRestante(id, momento);
      return atualizado;
    });
  }

  async cancelarPorFaltaDeMinimo(jogoId: string): Promise<Jogo> {
    return this.travaJogo(jogoId, async () => {
      const jogo = await this.getJogoOuFalhar(jogoId);
      const momento = new Date();
      jogo.motivoCancelamento =
        'prazo de confirmação vencido sem atingir o mínimo de jogadores';
      const atualizado = await this.aplicarTransicao(jogo, 'prazo_sem_minimo', momento);
      await this.cancelarWaitlistRestante(jogoId, momento);
      return atualizado;
    });
  }

  // ---------- inscrição ----------

  private async confirmarJogoInterno(jogo: Jogo, momento: Date): Promise<Jogo> {
    // atingir_minimo dispara capturar_pagamentos_autorizados + notificar.
    return this.aplicarTransicao(jogo, 'atingir_minimo', momento);
  }

  /**
   * C1: quem entra (ou paga reserva) num jogo JÁ confirmado precisa ser cobrado
   * na hora — a condição de captura (confirmação) já aconteceu. Sem isso, a
   * pré-autorização ficaria pendurada e a vaga seria jogada de graça.
   */
  private async capturarSeJaConfirmado(
    jogo: Jogo,
    p: Participacao,
    momento: Date
  ): Promise<void> {
    if (jogo.status === 'confirmado' && p.status === 'autorizada' && p.paymentId && !p.capturado) {
      await this.gateway.capturar(p.paymentId);
      p.status = 'confirmada';
      p.capturado = true;
      p.atualizadoEm = momento;
      await this.participacaoRepo.atualizar(p);
      await this.registrarEvento(
        'pagamento.capturado',
        jogo.id,
        p.usuarioId,
        {
          participacaoId: p.id,
          paymentId: p.paymentId,
          valorCentavos: p.split?.totalCobradoCentavos,
          motivo: 'entrada_em_jogo_ja_confirmado',
        },
        momento
      );
    }
  }

  async inscrever(
    jogoId: string,
    usuarioId: string,
    metodo: 'cartao' | 'pix'
  ): Promise<{ participacao: Participacao; resultado: ResultadoInscricao; jogo: Jogo }> {
    return this.travaJogo(jogoId, () => this._inscrever(jogoId, usuarioId, metodo));
  }

  private async _inscrever(
    jogoId: string,
    usuarioId: string,
    metodo: 'cartao' | 'pix'
  ): Promise<{ participacao: Participacao; resultado: ResultadoInscricao; jogo: Jogo }> {
    const jogo = await this.getJogoOuFalhar(jogoId);

    // A1: usuário com bloqueio ativo por no-shows não pode entrar em jogos.
    const usuario = await this.usuarioRepo.obterOuCriar(usuarioId);
    if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
      throw new ErroConflito(
        `usuário bloqueado por no-shows até ${usuario.bloqueadoAte.toISOString()}`
      );
    }

    const existente = await this.participacaoRepo.buscarPorJogoEUsuario(jogoId, usuarioId);
    if (existente && !['cancelada', 'reembolsada'].includes(existente.status)) {
      throw new ErroConflito('usuário já tem participação ativa neste jogo');
    }

    const participacoesAtuais = await this.participacaoRepo.listarPorJogo(jogoId);
    const resumo = this.jogoParaResumo(jogo, participacoesAtuais);

    let resultado: ResultadoInscricao;
    try {
      resultado = await inscreverJogador(resumo, usuarioId, metodo, this.gateway, this.cfg);
    } catch (e) {
      throw new ErroConflito((e as Error).message);
    }

    const agora = new Date();
    let participacao: Participacao;
    if (resultado.situacao === 'em_espera') {
      const posicao = participacoesAtuais.filter((p) => p.status === 'em_espera').length + 1;
      participacao = {
        id: randomUUID(),
        jogoId,
        usuarioId,
        status: 'em_espera',
        metodo,
        split: resultado.split,
        posicaoEspera: posicao,
        criadoEm: agora,
        atualizadoEm: agora,
      };
    } else {
      participacao = {
        id: randomUUID(),
        jogoId,
        usuarioId,
        status: resultado.situacao === 'autorizada' ? 'autorizada' : 'confirmada',
        metodo,
        paymentId: resultado.paymentId,
        split: resultado.split,
        capturado: resultado.situacao === 'paga',
        criadoEm: agora,
        atualizadoEm: agora,
      };
    }
    await this.participacaoRepo.criar(participacao);
    await this.registrarEvento(
      'participacao.inscrita',
      jogoId,
      usuarioId,
      { participacaoId: participacao.id, situacao: resultado.situacao, metodo },
      agora
    );

    let jogoAtualizado = jogo;
    if (resultado.jogoConfirmou) {
      // Esta inscrição bateu o mínimo: confirma o jogo (captura todas as autorizações).
      jogoAtualizado = await this.confirmarJogoInterno(jogo, agora);
    } else {
      // C1: entrou num jogo que já estava confirmado -> captura imediata.
      await this.capturarSeJaConfirmado(jogo, participacao, agora);
    }

    const pAtual = (await this.participacaoRepo.buscarPorId(participacao.id)) ?? participacao;
    return { participacao: pAtual, resultado, jogo: jogoAtualizado };
  }

  // ---------- waitlist ----------

  private async promoverSeHouverFila(
    jogo: Jogo,
    momento: Date,
    participacaoOrigemId?: string
  ): Promise<Participacao | undefined> {
    const fila = (await this.participacaoRepo.listarPorJogo(jogo.id)).filter(
      (p) => p.status === 'em_espera'
    );
    const entradas: EntradaEspera[] = fila.map((p) => ({
      participacaoId: p.id,
      posicao: p.posicaoEspera ?? 0,
    }));
    const resultado = promoverProximo(entradas, momento);
    if (!resultado.promovida) return undefined;

    const promovida = fila.find((p) => p.id === resultado.promovida!.participacaoId)!;
    promovida.status = 'reservada';
    promovida.promovidoEm = momento;
    promovida.expiraReservaEm = resultado.expiraEm ?? undefined;
    promovida.posicaoEspera = undefined;
    if (participacaoOrigemId) promovida.substituiuParticipacaoId = participacaoOrigemId;
    await this.participacaoRepo.atualizar(promovida);
    await this.registrarEvento(
      'waitlist.promovida',
      jogo.id,
      promovida.usuarioId,
      { participacaoId: promovida.id, expiraReservaEm: promovida.expiraReservaEm },
      momento
    );

    for (let i = 0; i < resultado.filaAtualizada.length; i++) {
      const restante = fila.find((p) => p.id === resultado.filaAtualizada[i].participacaoId)!;
      restante.posicaoEspera = i + 1;
      await this.participacaoRepo.atualizar(restante);
    }
    return promovida;
  }

  private async reindexarWaitlist(jogoId: string): Promise<void> {
    const fila = (await this.participacaoRepo.listarPorJogo(jogoId))
      .filter((p) => p.status === 'em_espera')
      .sort((a, b) => (a.posicaoEspera ?? 0) - (b.posicaoEspera ?? 0));
    for (let i = 0; i < fila.length; i++) {
      fila[i].posicaoEspera = i + 1;
      await this.participacaoRepo.atualizar(fila[i]);
    }
  }

  /** Devolve retroativamente o que faltar caso a vaga tenha sido preenchida antes do jogo começar. */
  private async aplicarUpgradeRetroativo(participacaoOrigemId: string, momento: Date): Promise<void> {
    const original = await this.participacaoRepo.buscarPorId(participacaoOrigemId);
    if (!original || !original.capturado || !original.paymentId || !original.split) return;

    const total = original.split.totalCobradoCentavos;
    const jaDevolvido =
      (original.valorReembolsadoCentavos ?? 0) + (original.valorCreditadoCentavos ?? 0);
    const faltante = total - jaDevolvido;
    if (faltante <= 0) return;

    await this.gateway.reembolsar(original.paymentId, faltante);
    original.valorReembolsadoCentavos = total;
    original.status = 'reembolsada';
    original.atualizadoEm = momento;
    await this.participacaoRepo.atualizar(original);
    await this.registrarEvento(
      'pagamento.upgrade_retroativo',
      original.jogoId,
      original.usuarioId,
      { participacaoId: original.id, valorCentavos: faltante },
      momento
    );
  }

  // ---------- cancelamento pelo jogador ----------

  async cancelarParticipacao(
    participacaoId: string,
    momento: Date = new Date(),
    escolha: 'cartao' | 'credito' = 'cartao'
  ): Promise<{ participacao: Participacao; promovida?: Participacao }> {
    const p = await this.getParticipacaoOuFalhar(participacaoId);
    return this.travaJogo(p.jogoId, () =>
      this._cancelarParticipacao(participacaoId, momento, escolha)
    );
  }

  private async _cancelarParticipacao(
    participacaoId: string,
    momento: Date,
    escolha: 'cartao' | 'credito'
  ): Promise<{ participacao: Participacao; promovida?: Participacao }> {
    const p = await this.getParticipacaoOuFalhar(participacaoId);
    if (['cancelada', 'reembolsada', 'concluida'].includes(p.status)) {
      throw new ErroConflito('participação já está encerrada');
    }
    const jogo = await this.getJogoOuFalhar(p.jogoId);

    if (p.status === 'em_espera') {
      p.status = 'cancelada';
      p.atualizadoEm = momento;
      await this.participacaoRepo.atualizar(p);
      await this.reindexarWaitlist(jogo.id);
      await this.registrarEvento('participacao.saiu_waitlist', jogo.id, p.usuarioId, { participacaoId: p.id }, momento);
      return { participacao: p };
    }

    const liberouVagaPaga = p.status === 'autorizada' || p.status === 'confirmada';
    let elegivelUpgrade = false;

    if (p.status === 'autorizada') {
      // pré-autorização nunca capturada: cancelar é de graça, não há o que devolver.
      await this.gateway.liberarAutorizacao(p.paymentId!);
      p.status = 'cancelada';
    } else if (p.status === 'confirmada') {
      const politica = politicaCancelamento(jogo.inicio, momento);
      const total = p.split!.totalCobradoCentavos;
      elegivelUpgrade = politica.upgradeSeVagaPreenchida;

      if (politica.tipo === 'integral') {
        await this.gateway.reembolsar(p.paymentId!, total);
        p.valorReembolsadoCentavos = total;
        p.status = 'reembolsada';
      } else if (politica.tipo === 'credito_integral_ou_metade') {
        if (escolha === 'credito') {
          const valorCredito = pctBps(total, politica.creditoPlataformaBps);
          await this.creditoRepo.criar({
            id: randomUUID(),
            usuarioId: p.usuarioId,
            valorCentavos: valorCredito,
            origem: 'cancelamento_participacao',
            referenciaId: p.id,
            criadoEm: momento,
          });
          p.valorCreditadoCentavos = valorCredito;
          p.status = 'cancelada';
        } else {
          const valorReembolso = pctBps(total, politica.reembolsoCartaoBps);
          await this.gateway.reembolsar(p.paymentId!, valorReembolso);
          p.valorReembolsadoCentavos = valorReembolso;
          p.status = 'reembolsada';
        }
      } else {
        p.status = 'cancelada';
      }
    } else {
      // 'reservada': ainda não pagou nada, só libera a vaga de volta.
      p.status = 'cancelada';
    }

    p.atualizadoEm = momento;
    await this.participacaoRepo.atualizar(p);
    await this.registrarEvento(
      'participacao.cancelada',
      jogo.id,
      p.usuarioId,
      {
        participacaoId: p.id,
        reembolsadoCentavos: p.valorReembolsadoCentavos ?? 0,
        creditadoCentavos: p.valorCreditadoCentavos ?? 0,
      },
      momento
    );

    let promovida: Participacao | undefined;
    if (liberouVagaPaga || p.status === 'cancelada') {
      const origemUpgrade = elegivelUpgrade ? p.id : p.substituiuParticipacaoId;
      promovida = await this.promoverSeHouverFila(jogo, momento, origemUpgrade);
    }
    return { participacao: p, promovida };
  }

  async pagarReserva(
    participacaoId: string,
    metodo: 'cartao' | 'pix',
    momento: Date = new Date()
  ): Promise<{ participacao: Participacao; jogo: Jogo }> {
    const p = await this.getParticipacaoOuFalhar(participacaoId);
    return this.travaJogo(p.jogoId, () => this._pagarReserva(participacaoId, metodo, momento));
  }

  private async _pagarReserva(
    participacaoId: string,
    metodo: 'cartao' | 'pix',
    momento: Date
  ): Promise<{ participacao: Participacao; jogo: Jogo }> {
    const p = await this.getParticipacaoOuFalhar(participacaoId);
    if (p.status !== 'reservada') throw new ErroConflito('participação não está com vaga reservada');
    if (expirouJanela({ participacaoId: p.id, posicao: 0, promovidoEm: p.promovidoEm }, momento)) {
      throw new ErroConflito('janela de pagamento da reserva expirou');
    }
    const jogo = await this.getJogoOuFalhar(p.jogoId);

    const outrasParticipacoes = (await this.participacaoRepo.listarPorJogo(jogo.id)).filter(
      (x) => x.id !== p.id
    );
    const resumo = this.jogoParaResumo(jogo, outrasParticipacoes);

    let resultado: ResultadoInscricao;
    try {
      resultado = await inscreverJogador(resumo, p.usuarioId, metodo, this.gateway, this.cfg);
    } catch (e) {
      throw new ErroConflito((e as Error).message);
    }
    if (resultado.situacao === 'em_espera') {
      throw new ErroConflito('vaga não está mais disponível');
    }

    p.status = resultado.situacao === 'autorizada' ? 'autorizada' : 'confirmada';
    p.metodo = metodo;
    p.paymentId = resultado.paymentId;
    p.split = resultado.split;
    p.capturado = resultado.situacao === 'paga';
    p.expiraReservaEm = undefined;
    p.atualizadoEm = momento;
    await this.participacaoRepo.atualizar(p);

    let jogoAtualizado = jogo;
    if (resultado.jogoConfirmou) {
      jogoAtualizado = await this.confirmarJogoInterno(jogo, momento);
    } else {
      // C1: pagou reserva num jogo já confirmado -> captura imediata.
      await this.capturarSeJaConfirmado(jogo, p, momento);
    }

    if (p.substituiuParticipacaoId) {
      await this.aplicarUpgradeRetroativo(p.substituiuParticipacaoId, momento);
    }

    const pAtual = (await this.participacaoRepo.buscarPorId(p.id)) ?? p;
    return { participacao: pAtual, jogo: jogoAtualizado };
  }

  async expirarReserva(
    participacaoId: string,
    momento: Date = new Date()
  ): Promise<{ participacaoExpirada: Participacao; promovida?: Participacao }> {
    const p = await this.getParticipacaoOuFalhar(participacaoId);
    return this.travaJogo(p.jogoId, () => this._expirarReserva(participacaoId, momento));
  }

  private async _expirarReserva(
    participacaoId: string,
    momento: Date
  ): Promise<{ participacaoExpirada: Participacao; promovida?: Participacao }> {
    const p = await this.getParticipacaoOuFalhar(participacaoId);
    if (p.status !== 'reservada') throw new ErroConflito('participação não está com vaga reservada');
    if (!expirouJanela({ participacaoId: p.id, posicao: 0, promovidoEm: p.promovidoEm }, momento)) {
      throw new ErroConflito('janela de pagamento da reserva ainda não expirou');
    }

    p.status = 'cancelada';
    p.atualizadoEm = momento;
    await this.participacaoRepo.atualizar(p);
    await this.registrarEvento('waitlist.reserva_expirada', p.jogoId, p.usuarioId, { participacaoId: p.id }, momento);

    const jogo = await this.getJogoOuFalhar(p.jogoId);
    const promovida = await this.promoverSeHouverFila(jogo, momento, p.substituiuParticipacaoId);
    return { participacaoExpirada: p, promovida };
  }
}
