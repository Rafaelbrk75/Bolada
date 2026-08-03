/**
 * Porta de tempo. Existe pra que jobs e regras que dependem de "agora" possam
 * ser testados de forma determinística — sem isso não dá pra montar fixture de
 * histórico ("duas semanas atrás") nem exercitar cutoff/janela de reserva.
 *
 * Regra: nenhuma camada de aplicação chama `new Date()` direto. Ou recebe
 * `momento` como parâmetro da operação, ou pergunta ao relógio.
 */

export type Relogio = () => Date;

export const RELOGIO_SISTEMA: Relogio = () => new Date();

/** Relógio fixo pra teste: sempre devolve o mesmo instante. */
export function relogioFixo(momento: Date): Relogio {
  return () => momento;
}
