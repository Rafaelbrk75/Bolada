/**
 * Política de cancelamento PELO JOGADOR (o cancelamento do jogo em si
 * vive na máquina de estados e sempre reembolsa integral).
 *
 * Faixas por antecedência em relação ao início do jogo:
 *   >= 24h  -> reembolso integral (menos nada; taxa de serviço devolvida)
 *   6h–24h  -> crédito integral na plataforma OU reembolso de 50% no cartão
 *   < 6h    -> sem reembolso
 *
 * Regra de ouro: se a vaga for PREENCHIDA pela lista de espera antes do
 * início do jogo, o jogador que cancelou recebe reembolso integral
 * retroativo, independente da faixa. Mantém o jogo cheio e o jogador feliz.
 */

export type TipoReembolso =
  | 'integral'
  | 'credito_integral_ou_metade'
  | 'nenhum';

export interface ResultadoCancelamento {
  tipo: TipoReembolso;
  /** % devolvido no método original, em bps (10000 = 100%). */
  reembolsoCartaoBps: number;
  /** % devolvido como crédito na plataforma, em bps (alternativa ao cartão). */
  creditoPlataformaBps: number;
  /** Se true, o reembolso vira integral caso a waitlist preencha a vaga. */
  upgradeSeVagaPreenchida: boolean;
}

export const HORAS_FAIXA_INTEGRAL = 24;
export const HORAS_FAIXA_PARCIAL = 6;

export function politicaCancelamento(
  inicioJogo: Date,
  momentoCancelamento: Date
): ResultadoCancelamento {
  const horasAntes =
    (inicioJogo.getTime() - momentoCancelamento.getTime()) / 3_600_000;

  if (horasAntes >= HORAS_FAIXA_INTEGRAL) {
    return {
      tipo: 'integral',
      reembolsoCartaoBps: 10_000,
      creditoPlataformaBps: 0,
      upgradeSeVagaPreenchida: false, // já é integral
    };
  }
  if (horasAntes >= HORAS_FAIXA_PARCIAL) {
    return {
      tipo: 'credito_integral_ou_metade',
      reembolsoCartaoBps: 5_000,       // 50% no cartão...
      creditoPlataformaBps: 10_000,    // ...ou 100% em crédito (jogador escolhe)
      upgradeSeVagaPreenchida: true,
    };
  }
  return {
    tipo: 'nenhum',
    reembolsoCartaoBps: 0,
    creditoPlataformaBps: 0,
    upgradeSeVagaPreenchida: true,
  };
}

/** Punição progressiva por no-show. */
export function diasBloqueioPorNoShow(totalNoShows: number): number {
  if (totalNoShows <= 1) return 0;   // primeira vez: só aviso
  if (totalNoShows === 2) return 7;
  if (totalNoShows === 3) return 30;
  return 90;
}
