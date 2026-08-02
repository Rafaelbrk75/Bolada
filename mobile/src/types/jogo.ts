// Espelha src/infra/repositorios/tipos.ts e src/domain/jogo.ts do backend.
// Datas chegam como string ISO porque atravessaram JSON.

export type StatusJogo =
  | 'rascunho'
  | 'aberto'
  | 'confirmado'
  | 'em_andamento'
  | 'realizado'
  | 'liquidado'
  | 'cancelado';

export interface Jogo {
  id: string;
  campoId: string;
  quadraId: string;
  organizadorId: string;
  titulo: string;
  nivel: string;
  inicio: string;
  fim: string;
  capacidade: number;
  minimoJogadores: number;
  prazoConfirmacao: string;
  precoVagaCentavos: number;
  status: StatusJogo;
  motivoCancelamento?: string;
  publico: boolean;
  criadoEm: string;
  atualizadoEm: string;
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
  promovidoEm?: string;
  /** Janela de 10 min pra pagar depois de ser promovido da waitlist. */
  expiraReservaEm?: string;
  substituiuParticipacaoId?: string;
  capturado?: boolean;
  checkinEm?: string;
  valorReembolsadoCentavos?: number;
  valorCreditadoCentavos?: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SplitVaga {
  precoVagaCentavos: number;
  taxaServicoCentavos: number;
  totalCobradoCentavos: number;
  comissaoQuadraCentavos: number;
  valorQuadraCentavos: number;
  custoGatewayCentavos: number;
  receitaPlataformaCentavos: number;
}

export interface ResultadoInscricao {
  situacao: 'autorizada' | 'paga' | 'em_espera';
  split: SplitVaga;
  paymentId?: string;
  jogoConfirmou: boolean;
}

/** POST /jogos/:id/inscricoes devolve os três juntos. */
export interface RespostaInscricao {
  participacao: Participacao;
  resultado: ResultadoInscricao;
  jogo: Jogo;
}

/** POST /participacoes/:id/cancelar — devolve a participação e quem subiu da fila. */
export interface RespostaCancelamento {
  participacao: Participacao;
  promovida?: Participacao;
}

/** POST /participacoes/:id/pagar-reserva. */
export interface RespostaPagarReserva {
  participacao: Participacao;
  jogo: Jogo;
}

export interface NovoJogo {
  campoId: string;
  quadraId: string;
  organizadorId: string;
  titulo: string;
  nivel: string;
  inicio: string;
  fim: string;
  capacidade: number;
  minimoJogadores: number;
  prazoConfirmacao: string;
  precoVagaCentavos: number;
  publico?: boolean;
}
