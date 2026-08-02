/** Dinheiro é sempre inteiro em centavos — mesma regra do backend. */

export function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Converte o que o usuário digitou em centavos.
 * Aceita "35", "35,50", "35.50", "R$ 35,50". Devolve null se não der pra ler.
 */
export function lerCentavos(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, '').replace(',', '.');
  if (!limpo) return null;
  const reais = Number(limpo);
  if (!Number.isFinite(reais) || reais < 0) return null;
  return Math.round(reais * 100);
}
