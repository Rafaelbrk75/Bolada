/**
 * Motor de pagamentos — modelo de RECEITA DUPLA (dois lados do marketplace):
 *
 *  1. Taxa de serviço do JOGADOR: percentual sobre o preço da vaga,
 *     somada ao total no checkout (o jogador vê "R$ 20,00 + R$ 2,00 de taxa").
 *  2. Comissão da QUADRA: percentual retido do valor que seria repassado.
 *
 * Todos os valores em CENTAVOS (inteiros). Percentuais em BASIS POINTS
 * (1 bps = 0,01%; 1000 bps = 10%). Nunca usar float para dinheiro.
 */

export interface ConfigTaxas {
  /** Taxa de serviço cobrada do jogador, em bps sobre o preço da vaga. Default 1000 (10%). */
  taxaServicoJogadorBps: number;
  /** Comissão retida da quadra, em bps sobre a parte da quadra. Default 1000 (10%). */
  comissaoQuadraBps: number;
  /** Custo do gateway: percentual em bps + fixo em centavos (ex.: cartão ~3,99% + R$0,39). */
  custoGatewayBps: number;
  custoGatewayFixoCentavos: number;
  /** Taxa mínima de serviço em centavos (evita taxa irrisória em vaga barata). */
  taxaServicoMinimaCentavos: number;
}

export const TAXAS_PADRAO: ConfigTaxas = {
  taxaServicoJogadorBps: 1000, // 10% do jogador
  comissaoQuadraBps: 1000,     // 10% da quadra
  custoGatewayBps: 399,        // 3,99% (cartão; Pix é ~1% ou menos)
  custoGatewayFixoCentavos: 39,
  taxaServicoMinimaCentavos: 100, // R$ 1,00
};

export interface SplitVaga {
  precoVagaCentavos: number;
  taxaServicoCentavos: number;      // pago pelo jogador, além do preço
  totalCobradoCentavos: number;     // o que sai do cartão do jogador
  comissaoQuadraCentavos: number;   // retido da quadra
  valorQuadraCentavos: number;      // o que a quadra recebe por esta vaga
  custoGatewayCentavos: number;     // custo estimado do adquirente
  receitaPlataformaCentavos: number;// margem líquida da plataforma nesta vaga
}

/** Arredondamento half-up em divisões por bps. */
function aplicarBps(valorCentavos: number, bps: number): number {
  return Math.round((valorCentavos * bps) / 10_000);
}

export function calcularSplitVaga(
  precoVagaCentavos: number,
  cfg: ConfigTaxas = TAXAS_PADRAO
): SplitVaga {
  if (!Number.isInteger(precoVagaCentavos) || precoVagaCentavos < 0) {
    throw new Error('preco_vaga_centavos deve ser inteiro >= 0');
  }

  const taxaServico = Math.max(
    aplicarBps(precoVagaCentavos, cfg.taxaServicoJogadorBps),
    cfg.taxaServicoMinimaCentavos
  );
  const totalCobrado = precoVagaCentavos + taxaServico;

  const comissaoQuadra = aplicarBps(precoVagaCentavos, cfg.comissaoQuadraBps);
  const valorQuadra = precoVagaCentavos - comissaoQuadra;

  const custoGateway =
    aplicarBps(totalCobrado, cfg.custoGatewayBps) + cfg.custoGatewayFixoCentavos;

  const receitaPlataforma = taxaServico + comissaoQuadra - custoGateway;

  // Invariante: a soma das partes fecha com o total cobrado.
  const soma = valorQuadra + comissaoQuadra + taxaServico;
  if (soma !== totalCobrado) {
    throw new Error(`split não fecha: ${soma} != ${totalCobrado}`);
  }

  return {
    precoVagaCentavos,
    taxaServicoCentavos: taxaServico,
    totalCobradoCentavos: totalCobrado,
    comissaoQuadraCentavos: comissaoQuadra,
    valorQuadraCentavos: valorQuadra,
    custoGatewayCentavos: custoGateway,
    receitaPlataformaCentavos: receitaPlataforma,
  };
}

/**
 * Sugere o preço da vaga a partir do custo de locação da quadra,
 * garantindo que com o MÍNIMO de jogadores a locação já esteja coberta
 * e a plataforma tenha margem — o "preço de equilíbrio + folga".
 */
export function sugerirPrecoVaga(
  custoQuadraCentavos: number,
  minimoJogadores: number,
  cfg: ConfigTaxas = TAXAS_PADRAO,
  folgaBps = 1500 // 15% de folga sobre o break-even
): number {
  if (minimoJogadores <= 0) throw new Error('minimoJogadores deve ser > 0');
  // A quadra recebe valorQuadra = preco * (1 - comissao). Para cobrir a locação
  // com o mínimo de jogadores: preco >= custo / (min * (1 - comissao))
  const fatorQuadra = 1 - cfg.comissaoQuadraBps / 10_000;
  const breakEven = custoQuadraCentavos / (minimoJogadores * fatorQuadra);
  const comFolga = breakEven * (1 + folgaBps / 10_000);
  // arredonda para cima ao múltiplo de 50 centavos (preço "limpo")
  return Math.ceil(comFolga / 50) * 50;
}
