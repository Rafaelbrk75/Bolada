/**
 * Repasses às quadras (A2). Separado do jogoAppService porque não participa do
 * mutex por jogo: opera em lote sobre jogos já liquidados, com trava própria
 * por quadra pra não fechar o mesmo período duas vezes em paralelo.
 */

import { randomUUID } from 'node:crypto';
import { ErroConflito, ErroNaoEncontrado, ErroRequisicaoInvalida } from './erros';
import { RELOGIO_SISTEMA, Relogio } from './relogio';
import {
  EventoRepositorio,
  Jogo,
  JogoRepositorio,
  Participacao,
  ParticipacaoRepositorio,
  Repasse,
  RepasseItem,
  RepasseRepositorio,
} from '../infra/repositorios/tipos';

export interface RepasseAppServiceDeps {
  jogoRepo: JogoRepositorio;
  participacaoRepo: ParticipacaoRepositorio;
  repasseRepo: RepasseRepositorio;
  eventoRepo: EventoRepositorio;
  relogio?: Relogio;
}

export class RepasseAppService {
  private readonly jogoRepo: JogoRepositorio;
  private readonly participacaoRepo: ParticipacaoRepositorio;
  private readonly repasseRepo: RepasseRepositorio;
  private readonly eventoRepo: EventoRepositorio;
  private readonly relogio: Relogio;

  constructor(deps: RepasseAppServiceDeps) {
    this.jogoRepo = deps.jogoRepo;
    this.participacaoRepo = deps.participacaoRepo;
    this.repasseRepo = deps.repasseRepo;
    this.eventoRepo = deps.eventoRepo;
    this.relogio = deps.relogio ?? RELOGIO_SISTEMA;
  }

  private readonly filas = new Map<string, Promise<unknown>>();

  private comTrava<T>(chave: string, fn: () => Promise<T>): Promise<T> {
    const anterior = this.filas.get(chave) ?? Promise.resolve();
    const resultado = anterior.then(() => fn());
    this.filas.set(
      chave,
      resultado.then(
        () => undefined,
        () => undefined
      )
    );
    return resultado;
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

  /**
   * Efeito de `liquidar`: sinaliza no log quais transações ficam ELEGÍVEIS para
   * repasse (concluídas ou no-show — em ambas a quadra fica com o dinheiro).
   * O fechamento em lote por quadra é feito por `fecharRepasse`.
   */
  async registrarItensElegiveis(
    jogo: Jogo,
    participacoes: Participacao[],
    momento: Date
  ): Promise<void> {
    const itens = participacoes
      .filter((p) => (p.status === 'concluida' || p.status === 'no_show') && p.capturado && p.split)
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
    momento: Date = this.relogio()
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
}
