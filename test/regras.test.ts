import assert from 'node:assert/strict';
import { calcularSplitVaga, sugerirPrecoVaga, TAXAS_PADRAO } from '../src/domain/pagamento';
import { transicionar, transicaoValida } from '../src/domain/jogo';
import { politicaCancelamento, diasBloqueioPorNoShow } from '../src/domain/cancelamento';
import { promoverProximo, expirouJanela } from '../src/domain/waitlist';
import { inscreverJogador, confirmarJogo, cancelarPorFaltaDeMinimo, GatewayPagamento } from '../src/services/inscricao';

let passed = 0;
function test(nome: string, fn: () => void | Promise<void>) {
  const r = fn();
  const done = () => { passed++; console.log(`  ✓ ${nome}`); };
  return r instanceof Promise ? r.then(done) : done();
}

async function main() {
  console.log('\n[ split de pagamento ]');
  await test('vaga de R$20: jogador paga R$22, quadra recebe R$18, plataforma lucra', () => {
    const s = calcularSplitVaga(2000);
    assert.equal(s.taxaServicoCentavos, 200);        // 10% de R$20
    assert.equal(s.totalCobradoCentavos, 2200);      // R$22 no cartão
    assert.equal(s.comissaoQuadraCentavos, 200);     // 10% retido da quadra
    assert.equal(s.valorQuadraCentavos, 1800);       // R$18 pra quadra
    // receita bruta plataforma = 400; gateway ~ 3,99% de 2200 + 39 = 127
    assert.equal(s.custoGatewayCentavos, 127);
    assert.equal(s.receitaPlataformaCentavos, 273);  // R$2,73 líquidos por vaga
  });

  await test('taxa mínima protege vagas baratas', () => {
    const s = calcularSplitVaga(500); // vaga de R$5
    assert.equal(s.taxaServicoCentavos, 100); // mínimo R$1, não 50 centavos
  });

  await test('soma das partes sempre fecha com o total cobrado', () => {
    for (const preco of [999, 1265, 3333, 10001]) {
      const s = calcularSplitVaga(preco);
      assert.equal(
        s.valorQuadraCentavos + s.comissaoQuadraCentavos + s.taxaServicoCentavos,
        s.totalCobradoCentavos
      );
    }
  });

  await test('preço sugerido cobre a locação com o mínimo de jogadores', () => {
    // quadra custa R$300/h, mínimo 12 jogadores
    const preco = sugerirPrecoVaga(30000, 12);
    const s = calcularSplitVaga(preco);
    assert.ok(s.valorQuadraCentavos * 12 >= 30000, 'com 12 pagantes a locação está paga');
  });

  console.log('\n[ máquina de estados do jogo ]');
  await test('caminho feliz: aberto -> confirmado -> ... -> liquidado', () => {
    let st = transicionar('rascunho', 'publicar').para;
    st = transicionar(st, 'atingir_minimo').para;
    assert.equal(st, 'confirmado');
    st = transicionar(st, 'iniciar').para;
    st = transicionar(st, 'finalizar').para;
    st = transicionar(st, 'liquidar').para;
    assert.equal(st, 'liquidado');
  });

  await test('confirmar dispara captura; cancelar por mínimo dispara reembolso', () => {
    const conf = transicionar('aberto', 'atingir_minimo');
    assert.ok(conf.efeitos.includes('capturar_pagamentos_autorizados'));
    const canc = transicionar('aberto', 'prazo_sem_minimo');
    assert.ok(canc.efeitos.includes('liberar_autorizacoes'));
    assert.ok(canc.efeitos.includes('reembolsar_pagamentos'));
  });

  await test('transições inválidas são bloqueadas', () => {
    assert.equal(transicaoValida('liquidado', 'cancelar_manual'), false);
    assert.equal(transicaoValida('cancelado', 'publicar'), false);
    assert.throws(() => transicionar('realizado', 'iniciar'));
  });

  console.log('\n[ política de cancelamento ]');
  const inicio = new Date('2026-07-25T20:00:00-03:00');
  await test('>=24h antes: reembolso integral', () => {
    const r = politicaCancelamento(inicio, new Date('2026-07-24T10:00:00-03:00'));
    assert.equal(r.tipo, 'integral');
    assert.equal(r.reembolsoCartaoBps, 10000);
  });
  await test('6–24h: 100% em crédito ou 50% no cartão, com upgrade se waitlist preencher', () => {
    const r = politicaCancelamento(inicio, new Date('2026-07-25T08:00:00-03:00'));
    assert.equal(r.tipo, 'credito_integral_ou_metade');
    assert.equal(r.upgradeSeVagaPreenchida, true);
  });
  await test('<6h: sem reembolso (mas upgrade se vaga preenchida)', () => {
    const r = politicaCancelamento(inicio, new Date('2026-07-25T17:00:00-03:00'));
    assert.equal(r.tipo, 'nenhum');
    assert.equal(r.upgradeSeVagaPreenchida, true);
  });
  await test('no-show progressivo: 0, 7, 30, 90 dias', () => {
    assert.equal(diasBloqueioPorNoShow(1), 0);
    assert.equal(diasBloqueioPorNoShow(2), 7);
    assert.equal(diasBloqueioPorNoShow(3), 30);
    assert.equal(diasBloqueioPorNoShow(5), 90);
  });

  console.log('\n[ lista de espera ]');
  await test('promove o primeiro da fila com janela de 10 min', () => {
    const agora = new Date('2026-07-25T18:00:00-03:00');
    const fila = [
      { participacaoId: 'b', posicao: 2 },
      { participacaoId: 'a', posicao: 1 },
    ];
    const r = promoverProximo(fila, agora);
    assert.equal(r.promovida?.participacaoId, 'a');
    assert.equal(r.expiraEm?.getTime(), agora.getTime() + 10 * 60_000);
    assert.equal(r.filaAtualizada.length, 1);
  });
  await test('janela expirada detectada', () => {
    const promovido = { participacaoId: 'a', posicao: 1, promovidoEm: new Date('2026-07-25T18:00:00-03:00') };
    assert.equal(expirouJanela(promovido, new Date('2026-07-25T18:05:00-03:00')), false);
    assert.equal(expirouJanela(promovido, new Date('2026-07-25T18:11:00-03:00')), true);
  });

  console.log('\n[ fluxo de inscrição (gateway fake) ]');
  const chamadas: string[] = [];
  const gatewayFake: GatewayPagamento = {
    autorizar: async (_u, v) => { chamadas.push(`auth:${v}`); return 'pay_1'; },
    capturar: async (id) => { chamadas.push(`capture:${id}`); },
    liberarAutorizacao: async (id) => { chamadas.push(`void:${id}`); },
    cobrarPix: async (_u, v) => { chamadas.push(`pix:${v}`); return 'pix_1'; },
    reembolsar: async (id, v) => { chamadas.push(`refund:${id}:${v}`); },
  };

  await test('cartão: autoriza sem capturar; 12º pagante confirma o jogo', async () => {
    const jogo = {
      id: 'j1', status: 'aberto' as const, capacidade: 18,
      minimoJogadores: 12, vagasPagas: 11, precoVagaCentavos: 2000, nivel: 'intermediario',
    };
    const r = await inscreverJogador(jogo, 'cus_1', 'cartao', gatewayFake);
    assert.equal(r.situacao, 'autorizada');
    assert.equal(r.jogoConfirmou, true);            // 11 + 1 = 12 = mínimo
    assert.ok(chamadas.includes('auth:2200'));      // cobrou preço + taxa
    assert.ok(!chamadas.some(c => c.startsWith('capture')));
  });

  await test('jogo cheio manda pra waitlist sem cobrar', async () => {
    const jogo = {
      id: 'j1', status: 'aberto' as const, capacidade: 18,
      minimoJogadores: 12, vagasPagas: 18, precoVagaCentavos: 2000, nivel: 'intermediario',
    };
    const antes = chamadas.length;
    const r = await inscreverJogador(jogo, 'cus_2', 'cartao', gatewayFake);
    assert.equal(r.situacao, 'em_espera');
    assert.equal(chamadas.length, antes);           // nenhuma chamada ao gateway
  });

  await test('confirmação captura todas as autorizações', async () => {
    const st = await confirmarJogo('aberto', ['pay_1', 'pay_2'], gatewayFake);
    assert.equal(st, 'confirmado');
    assert.ok(chamadas.includes('capture:pay_1'));
    assert.ok(chamadas.includes('capture:pay_2'));
  });

  await test('sem mínimo no prazo: void nos cartões, refund nos Pix', async () => {
    const st = await cancelarPorFaltaDeMinimo(
      'aberto', ['pay_9'], [{ paymentId: 'pix_9', valorCentavos: 2200 }], gatewayFake
    );
    assert.equal(st, 'cancelado');
    assert.ok(chamadas.includes('void:pay_9'));
    assert.ok(chamadas.includes('refund:pix_9:2200'));
  });

  console.log(`\n${passed} testes passaram ✔\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
