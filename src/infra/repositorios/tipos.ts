/**
 * Entidades e portas de repositório usadas pela camada de aplicação (src/app).
 * Formato alinhado ao schema.sql, mas só com os campos que os serviços de
 * domínio hoje precisam. Implementação real (Postgres) entra depois por trás
 * destas mesmas interfaces — ver src/infra/repositorios/memoria.ts.
 */

import { StatusJogo } from '../../domain/jogo';
import { SplitVaga } from '../../domain/pagamento';

export interface Jogo {
  id: string;
  /**
   * Slot de disponibilidade que originou este jogo (modelo B2B2C).
   * Opcional enquanto ainda existe o caminho antigo de criação direta.
   */
  slotId?: string;
  campoId: string;
  /** Quadra dona do campo — denormalizado aqui para agrupar repasses (A2). */
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
  status: StatusJogo;
  motivoCancelamento?: string;
  publico: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export type StatusParticipacao =
  | 'reservada'
  | 'autorizada'
  | 'confirmada'
  | 'em_espera'
  | 'cancelada'
  | 'reembolsada'
  | 'no_show'
  | 'concluida';

export interface Participacao {
  id: string;
  jogoId: string;
  usuarioId: string;
  status: StatusParticipacao;
  metodo?: 'cartao' | 'pix';
  paymentId?: string;
  split?: SplitVaga;
  posicaoEspera?: number;
  promovidoEm?: Date;
  /** Janela de pagamento da reserva (status 'reservada'), 10 min após a promoção. */
  expiraReservaEm?: Date;
  /** Se esta reserva veio de uma promoção da waitlist, aponta pra participação que abriu a vaga. */
  substituiuParticipacaoId?: string;
  /** True quando o dinheiro foi de fato capturado (pix, ou cartão pós-confirmação). */
  capturado?: boolean;
  /** Check-in no jogo (A1): presença comprovada. Ausência ao finalizar = no-show. */
  checkinEm?: Date;
  valorReembolsadoCentavos?: number;
  valorCreditadoCentavos?: number;
  /** Repasse em que a parte da quadra desta transação foi incluída (A2). */
  repasseId?: string;
  /** Estorno posterior ao repasse já compensado num ciclo seguinte (A2). */
  compensadoEm?: Date;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Credito {
  id: string;
  usuarioId: string;
  valorCentavos: number;
  origem: string;
  referenciaId?: string;
  criadoEm: Date;
}

export interface JogoRepositorio {
  criar(jogo: Jogo): Promise<Jogo>;
  buscarPorId(id: string): Promise<Jogo | null>;
  listar(filtro?: { status?: StatusJogo; publico?: boolean }): Promise<Jogo[]>;
  atualizar(jogo: Jogo): Promise<Jogo>;
}

export interface ParticipacaoRepositorio {
  criar(p: Participacao): Promise<Participacao>;
  buscarPorId(id: string): Promise<Participacao | null>;
  listarPorJogo(jogoId: string): Promise<Participacao[]>;
  buscarPorJogoEUsuario(jogoId: string, usuarioId: string): Promise<Participacao | null>;
  atualizar(p: Participacao): Promise<Participacao>;
}

export interface CreditoRepositorio {
  criar(c: Credito): Promise<Credito>;
  listarPorUsuario(usuarioId: string): Promise<Credito[]>;
}

/** Usuário — subconjunto de `usuarios` que a lógica de no-show/bloqueio precisa (A1). */
export interface Usuario {
  id: string;
  noShows: number;
  jogosRealizados: number;
  bloqueadoAte?: Date;
}

export interface UsuarioRepositorio {
  /** Cria sob demanda: a API hoje recebe usuarioId opaco, sem cadastro prévio. */
  obterOuCriar(id: string): Promise<Usuario>;
  atualizar(u: Usuario): Promise<Usuario>;
}

/** Repasse à quadra em lote (A2) — mapeia `repasses` do schema.sql. */
export type StatusRepasse = 'pendente' | 'processando' | 'pago' | 'falhou';

export interface Repasse {
  id: string;
  quadraId: string;
  periodoInicio: Date;
  periodoFim: Date;
  valorCentavos: number;
  status: StatusRepasse;
  pagoEm?: Date;
  criadoEm: Date;
}

/** Item auditável do repasse — uma transação (participação) e seu valor (mapeia `repasse_itens`). */
export interface RepasseItem {
  repasseId: string;
  participacaoId: string;
  /** Positivo = parte da quadra; negativo = compensação de estorno de ciclo anterior. */
  valorCentavos: number;
  tipo: 'credito' | 'estorno_compensacao';
}

export interface RepasseRepositorio {
  criar(r: Repasse, itens: RepasseItem[]): Promise<Repasse>;
  buscarPorId(id: string): Promise<Repasse | null>;
  listar(filtro?: { quadraId?: string }): Promise<Repasse[]>;
  listarItens(repasseId: string): Promise<RepasseItem[]>;
  atualizar(r: Repasse): Promise<Repasse>;
}

/**
 * Log imutável de eventos de negócio (mapeia a tabela `eventos` do schema.sql).
 * Append-only: é a trilha de auditoria/conciliação. Nunca se atualiza nem apaga.
 */
export interface EventoRegistro {
  id: number;
  tipo: string; // 'jogo.atingir_minimo', 'pagamento.capturado', ...
  entidadeId: string; // normalmente o jogoId
  atorId?: string; // usuário relacionado, quando houver
  dados: Record<string, unknown>;
  criadoEm: Date;
}

export interface EventoRepositorio {
  registrar(e: Omit<EventoRegistro, 'id'>): Promise<EventoRegistro>;
  listarPorEntidade(entidadeId: string): Promise<EventoRegistro[]>;
}
