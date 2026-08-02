/**
 * Fluxo "Join Game" — orquestra o caso de uso central:
 *
 *  CARTÃO: autoriza no join (pré-autorização, sem cobrar) e captura
 *          só quando o jogo confirma. Jogo não confirmou? void, sem estorno.
 *  PIX:    não existe pré-autorização -> cobra na hora; se o jogo cancelar,
 *          devolução Pix é imediata e sem custo relevante.
 *
 * Este módulo depende de interfaces (portas) — o gateway real
 * (Stripe Connect / Pagar.me) entra por injeção na infraestrutura.
 */

import { calcularSplitVaga, SplitVaga, ConfigTaxas, TAXAS_PADRAO } from '../domain/pagamento';
import { transicionar, StatusJogo } from '../domain/jogo';

export interface GatewayPagamento {
  autorizar(usuarioGatewayId: string, valorCentavos: number): Promise<string>; // -> paymentId
  capturar(paymentId: string): Promise<void>;
  liberarAutorizacao(paymentId: string): Promise<void>;
  cobrarPix(usuarioGatewayId: string, valorCentavos: number): Promise<string>;
  reembolsar(paymentId: string, valorCentavos: number): Promise<void>;
}

export interface JogoResumo {
  id: string;
  status: StatusJogo;
  capacidade: number;
  minimoJogadores: number;
  vagasPagas: number;        // participações com pagamento autorizado/capturado
  precoVagaCentavos: number;
  nivel: string;
}

export interface ResultadoInscricao {
  situacao: 'autorizada' | 'paga' | 'em_espera';
  split: SplitVaga;
  paymentId?: string;
  jogoConfirmou: boolean;    // esta inscrição bateu o mínimo?
}

export async function inscreverJogador(
  jogo: JogoResumo,
  usuarioGatewayId: string,
  metodo: 'cartao' | 'pix',
  gateway: GatewayPagamento,
  cfg: ConfigTaxas = TAXAS_PADRAO
): Promise<ResultadoInscricao> {
  if (jogo.status !== 'aberto' && jogo.status !== 'confirmado') {
    throw new Error(`Jogo não aceita inscrições no status ${jogo.status}`);
  }

  const split = calcularSplitVaga(jogo.precoVagaCentavos, cfg);

  // Jogo cheio -> waitlist, sem cobrança nenhuma ainda.
  if (jogo.vagasPagas >= jogo.capacidade) {
    return { situacao: 'em_espera', split, jogoConfirmou: false };
  }

  let paymentId: string;
  let situacao: 'autorizada' | 'paga';

  if (metodo === 'cartao') {
    paymentId = await gateway.autorizar(usuarioGatewayId, split.totalCobradoCentavos);
    situacao = 'autorizada';
  } else {
    paymentId = await gateway.cobrarPix(usuarioGatewayId, split.totalCobradoCentavos);
    situacao = 'paga';
  }

  const vagasAposInscricao = jogo.vagasPagas + 1;
  const bateuMinimo =
    jogo.status === 'aberto' && vagasAposInscricao >= jogo.minimoJogadores;

  return { situacao, split, paymentId, jogoConfirmou: bateuMinimo };
}

/**
 * Ao confirmar o jogo (mínimo batido), captura TODAS as pré-autorizações
 * pendentes. Idempotente: capturar duas vezes não pode cobrar duas vezes
 * (o gateway garante por paymentId; aqui filtramos por status).
 */
export async function confirmarJogo(
  statusAtual: StatusJogo,
  paymentIdsAutorizados: string[],
  gateway: GatewayPagamento
): Promise<StatusJogo> {
  const t = transicionar(statusAtual, 'atingir_minimo');
  for (const id of paymentIdsAutorizados) {
    await gateway.capturar(id);
  }
  return t.para;
}

/** Prazo estourou sem mínimo: void nas autorizações, refund nos Pix. */
export async function cancelarPorFaltaDeMinimo(
  statusAtual: StatusJogo,
  autorizados: string[],
  pagosPix: { paymentId: string; valorCentavos: number }[],
  gateway: GatewayPagamento
): Promise<StatusJogo> {
  const t = transicionar(statusAtual, 'prazo_sem_minimo');
  for (const id of autorizados) await gateway.liberarAutorizacao(id);
  for (const p of pagosPix) await gateway.reembolsar(p.paymentId, p.valorCentavos);
  return t.para;
}
