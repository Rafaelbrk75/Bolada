/**
 * Lista de espera: quando o jogo enche, novos interessados entram em
 * 'em_espera' com posicao_espera sequencial. Quando abre vaga:
 *   1. promove o primeiro da fila -> status 'reservada'
 *   2. ele tem JANELA_PAGAMENTO_MIN para autorizar o pagamento
 *   3. não pagou? volta pro fim da fila (ou sai) e promove o próximo
 */

export const JANELA_PAGAMENTO_MIN = 10;

export interface EntradaEspera {
  participacaoId: string;
  posicao: number;
  promovidoEm?: Date; // setado quando vira 'reservada'
}

export interface ResultadoPromocao {
  promovida: EntradaEspera | null;
  expiraEm: Date | null;
  filaAtualizada: EntradaEspera[];
}

export function promoverProximo(
  fila: EntradaEspera[],
  agora: Date
): ResultadoPromocao {
  const ordenada = [...fila].sort((a, b) => a.posicao - b.posicao);
  const proximo = ordenada[0] ?? null;
  if (!proximo) {
    return { promovida: null, expiraEm: null, filaAtualizada: [] };
  }
  const restante = ordenada.slice(1);
  return {
    promovida: { ...proximo, promovidoEm: agora },
    expiraEm: new Date(agora.getTime() + JANELA_PAGAMENTO_MIN * 60_000),
    filaAtualizada: restante,
  };
}

export function expirouJanela(entrada: EntradaEspera, agora: Date): boolean {
  if (!entrada.promovidoEm) return false;
  return (
    agora.getTime() - entrada.promovidoEm.getTime() >
    JANELA_PAGAMENTO_MIN * 60_000
  );
}
