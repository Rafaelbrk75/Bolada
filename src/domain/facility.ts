/**
 * Regras de confiança do parceiro. Governam a decisão mais cara do modelo:
 * jogo gerado pelo motor vai direto ao ar ou passa por revisão humana?
 *
 * Parceiro novo custa revisão manual em todo jogo. Graduar é o que dá escala;
 * rebaixar é o que protege o jogador quando a quadra começa a furar.
 */

import { TrustLevel } from '../infra/repositorios/parceiros';

/** Jogos realizados necessários pra sair da revisão manual. */
export const MIN_JOGOS_REALIZADOS = 15;

/** Teto de cancelamento pra graduar: 10%. */
export const TAXA_CANCELAMENTO_MAX_BPS = 1000;

/**
 * Piso de cancelamento pra rebaixar: 15%.
 *
 * A folga entre 10% e 15% é deliberada. Com um limiar só, uma facility parada
 * na fronteira oscilaria de nível a cada rodada do cron — e cada oscilação
 * muda se os jogos dela vão ao ar sozinhos ou não.
 */
export const TAXA_CANCELAMENTO_REBAIXA_BPS = 1500;

/** Janela de avaliação do histórico. */
export const JANELA_GRADUACAO_DIAS = 90;

export interface DesempenhoFacility {
  jogosRealizados: number;
  jogosCancelados: number;
  /** Reclamações graves registradas na janela. Qualquer uma trava a graduação. */
  reclamacoesGraves: number;
}

/** Cancelados / (realizados + cancelados), em basis points. */
export function taxaCancelamentoBps(d: DesempenhoFacility): number {
  const total = d.jogosRealizados + d.jogosCancelados;
  if (total === 0) return 0;
  return Math.round((d.jogosCancelados * 10_000) / total);
}

export function podeGraduar(d: DesempenhoFacility): boolean {
  if (d.jogosRealizados < MIN_JOGOS_REALIZADOS) return false;
  if (d.reclamacoesGraves > 0) return false;
  return taxaCancelamentoBps(d) <= TAXA_CANCELAMENTO_MAX_BPS;
}

export function deveRebaixar(d: DesempenhoFacility): boolean {
  // Sem volume não há sinal: rebaixar por 1 cancelamento em 2 jogos seria ruído.
  if (d.jogosRealizados + d.jogosCancelados < MIN_JOGOS_REALIZADOS) return false;
  if (d.reclamacoesGraves > 0) return true;
  return taxaCancelamentoBps(d) >= TAXA_CANCELAMENTO_REBAIXA_BPS;
}

/** Nível resultante do desempenho. Idempotente: reaplicar não oscila. */
export function proximoTrustLevel(atual: TrustLevel, d: DesempenhoFacility): TrustLevel {
  if (atual === 'novo') return podeGraduar(d) ? 'estabelecido' : 'novo';
  return deveRebaixar(d) ? 'novo' : 'estabelecido';
}
