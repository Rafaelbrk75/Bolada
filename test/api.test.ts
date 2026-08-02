/**
 * Testes de integração da camada de aplicação, focados nas correções C1/C2/C3.
 * Usa repositórios em memória + um gateway espião que conta cada chamada.
 */

import assert from 'node:assert/strict';
import { JogoAppService, CriarJogoInput } from '../src/app/jogoAppService';
import {
  CreditoRepositorioMemoria,
  EventoRepositorioMemoria,
  JogoRepositorioMemoria,
  ParticipacaoRepositorioMemoria,
  RepasseRepositorioMemoria,
  UsuarioRepositorioMemoria,
} from '../src/infra/repositorios/memoria';
import { GatewayPagamento } from '../src/services/inscricao';

let passed = 0;
async function test(nome: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${nome}`);
}

class GatewayEspiao implements GatewayPagamento {
  chamadas: string[] = [];
  private n = 0;
  async autorizar(): Promise<string> {
    const id = `auth_${++this.n}`;
    this.chamadas.push(`autorizar:${id}`);
    return id;
  }
  async capturar(paymentId: string): Promise<void> {
    this.chamadas.push(`capturar:${paymentId}`);
  }
  async liberarAutorizacao(paymentId: string): Promise<void> {
    this.chamadas.push(`liberar:${paymentId}`);
  }
  async cobrarPix(): Promise<string> {
    const id = `pix_${++this.n}`;
    this.chamadas.push(`pix:${id}`);
    return id;
  }
  async reembolsar(paymentId: string, valor: number): Promise<void> {
    this.chamadas.push(`reembolsar:${paymentId}:${valor}`);
  }
}

function novoServico(gw: GatewayPagamento) {
  return new JogoAppService(
    new JogoRepositorioMemoria(),
    new ParticipacaoRepositorioMemoria(),
    new CreditoRepositorioMemoria(),
    new EventoRepositorioMemoria(),
    new UsuarioRepositorioMemoria(),
    new RepasseRepositorioMemoria(),
    gw
  );
}

function jogoBase(over: Partial<CriarJogoInput> = {}): CriarJogoInput {
  return {
    campoId: 'campo-1',
    quadraId: 'quadra-1',
    organizadorId: 'org-1',
    titulo: 'Pelada',
    nivel: 'intermediario',
    inicio: new Date('2026-08-01T20:00:00-03:00'),
    fim: new Date('2026-08-01T21:00:00-03:00'),
    capacidade: 4,
    minimoJogadores: 2,
    prazoConfirmacao: new Date('2026-08-01T18:00:00-03:00'),
    precoVagaCentavos: 2000,
    ...over,
  };
}

async function main() {
  console.log('\n[ C1 — captura de cartão em jogo já confirmado ]');

  await test('late-joiner de cartão em jogo confirmado é capturado na hora', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    const jogo = await svc.criarJogo(jogoBase());
    await svc.publicarJogo(jogo.id);

    // 2 jogadores batem o mínimo -> jogo confirma e captura os dois.
    await svc.inscrever(jogo.id, 'u1', 'cartao');
    await svc.inscrever(jogo.id, 'u2', 'cartao');
    const confirmado = await svc.obterJogo(jogo.id);
    assert.equal(confirmado.status, 'confirmado');

    gw.chamadas.length = 0; // zera pra observar só o late-joiner
    const r = await svc.inscrever(jogo.id, 'u3', 'cartao');

    // ANTES da correção: ficava 'autorizada' e nunca capturava. Agora captura já.
    assert.equal(r.participacao.status, 'confirmada');
    assert.equal(r.participacao.capturado, true);
    assert.equal(gw.chamadas.filter((c) => c.startsWith('capturar')).length, 1);
  });

  await test('rede de segurança: iniciar captura qualquer autorização remanescente', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    // minimo=1: primeira inscrição já confirma; ninguém deveria ficar autorizado,
    // mas validamos que iniciar não deixa passar nada não-capturado.
    const jogo = await svc.criarJogo(jogoBase({ minimoJogadores: 1, capacidade: 4 }));
    await svc.publicarJogo(jogo.id);
    await svc.inscrever(jogo.id, 'u1', 'cartao'); // confirma o jogo
    await svc.inscrever(jogo.id, 'u2', 'cartao'); // late-joiner, capturado na hora
    await svc.iniciarJogo(jogo.id);

    const parts = await svc.listarParticipacoes(jogo.id);
    // nenhuma participação paga pode ficar sem captura ao iniciar
    for (const p of parts) {
      if (p.paymentId) assert.equal(p.capturado, true, `sem captura: ${p.usuarioId}`);
    }
  });

  console.log('\n[ C2 — concorrência / sem oversell ]');

  await test('10 inscrições simultâneas em jogo de 4 vagas: 4 pagam, 6 na fila', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    const jogo = await svc.criarJogo(jogoBase({ capacidade: 4, minimoJogadores: 2 }));
    await svc.publicarJogo(jogo.id);

    const resultados = await Promise.all(
      Array.from({ length: 10 }, (_, i) => svc.inscrever(jogo.id, `u${i}`, 'cartao'))
    );
    const pagantes = resultados.filter((r) => r.resultado.situacao !== 'em_espera').length;
    const emEspera = resultados.filter((r) => r.resultado.situacao === 'em_espera').length;

    assert.equal(pagantes, 4, 'exatamente a capacidade foi vendida');
    assert.equal(emEspera, 6, 'o resto foi pra waitlist');

    // e o gateway não pode ter autorizado mais que a capacidade
    const autorizacoes = gw.chamadas.filter((c) => c.startsWith('autorizar')).length;
    assert.equal(autorizacoes, 4, 'nenhuma cobrança além das 4 vagas');
  });

  await test('captura é idempotente (não cobra duas vezes o mesmo pagamento)', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    const jogo = await svc.criarJogo(jogoBase({ capacidade: 4, minimoJogadores: 2 }));
    await svc.publicarJogo(jogo.id);
    await svc.inscrever(jogo.id, 'u1', 'cartao');
    await svc.inscrever(jogo.id, 'u2', 'cartao'); // confirma: captura u1 e u2
    await svc.iniciarJogo(jogo.id); // efeitoCapturar roda de novo

    const capturasPorPagamento = new Map<string, number>();
    for (const c of gw.chamadas.filter((c) => c.startsWith('capturar'))) {
      const id = c.split(':')[1];
      capturasPorPagamento.set(id, (capturasPorPagamento.get(id) ?? 0) + 1);
    }
    for (const [id, n] of capturasPorPagamento) {
      assert.equal(n, 1, `pagamento ${id} capturado ${n}x`);
    }
  });

  console.log('\n[ C3 — efeitos despachados + log de eventos ]');

  await test('confirmação despacha captura + notificação e registra eventos', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    const jogo = await svc.criarJogo(jogoBase({ capacidade: 4, minimoJogadores: 2 }));
    await svc.publicarJogo(jogo.id);
    await svc.inscrever(jogo.id, 'u1', 'cartao');
    await svc.inscrever(jogo.id, 'u2', 'cartao');

    const eventos = await svc.listarEventos(jogo.id);
    const tipos = eventos.map((e) => e.tipo);
    assert.ok(tipos.includes('jogo.atingir_minimo'), 'transição registrada');
    assert.ok(tipos.includes('pagamento.capturado'), 'efeito de captura executado');
    assert.ok(tipos.includes('notificacao.jogo_confirmado'), 'efeito de notificação executado');
  });

  await test('cancelamento do jogo reembolsa capturados e libera autorizações', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    // capacidade 4, mínimo 2: u1+u2 confirmam (capturados via pix e cartao),
    // depois cancelamento manual do jogo confirmado deve reembolsar ambos.
    const jogo = await svc.criarJogo(jogoBase({ capacidade: 4, minimoJogadores: 2 }));
    await svc.publicarJogo(jogo.id);
    await svc.inscrever(jogo.id, 'u1', 'pix');
    await svc.inscrever(jogo.id, 'u2', 'cartao'); // confirma
    gw.chamadas.length = 0;

    await svc.cancelarJogoManual(jogo.id, 'chuva');
    const reembolsos = gw.chamadas.filter((c) => c.startsWith('reembolsar')).length;
    assert.equal(reembolsos, 2, 'os dois pagamentos capturados foram reembolsados');

    const eventos = await svc.listarEventos(jogo.id);
    assert.ok(eventos.some((e) => e.tipo === 'jogo.cancelar_manual'));
    assert.ok(eventos.some((e) => e.tipo === 'notificacao.jogo_cancelado'));
  });

  await test('liquidação gera itens de repasse auditáveis no log', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    const jogo = await svc.criarJogo(jogoBase({ capacidade: 4, minimoJogadores: 2 }));
    await svc.publicarJogo(jogo.id);
    await svc.inscrever(jogo.id, 'u1', 'cartao');
    await svc.inscrever(jogo.id, 'u2', 'cartao');
    await svc.iniciarJogo(jogo.id);
    await svc.finalizarJogo(jogo.id);
    await svc.liquidarJogo(jogo.id);

    const eventos = await svc.listarEventos(jogo.id);
    const repasse = eventos.find((e) => e.tipo === 'repasse.itens_incluidos');
    assert.ok(repasse, 'evento de repasse registrado');
    assert.equal((repasse!.dados as { quantidade: number }).quantidade, 2);
    // valor da quadra por vaga = 1800 (R$18) -> 2 vagas = 3600
    assert.equal((repasse!.dados as { valorQuadraCentavos: number }).valorQuadraCentavos, 3600);
  });

  console.log('\n[ A1 — check-in, no-show e bloqueio progressivo ]');

  await test('quem dá check-in conclui; quem não dá vira no_show sem reembolso', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    const jogo = await svc.criarJogo(jogoBase({ capacidade: 4, minimoJogadores: 2 }));
    await svc.publicarJogo(jogo.id);
    const r1 = await svc.inscrever(jogo.id, 'presente', 'cartao');
    await svc.inscrever(jogo.id, 'faltante', 'cartao'); // confirma o jogo
    await svc.fazerCheckin(r1.participacao.id);
    await svc.iniciarJogo(jogo.id);
    gw.chamadas.length = 0;
    await svc.finalizarJogo(jogo.id);

    const parts = await svc.listarParticipacoes(jogo.id);
    const presente = parts.find((p) => p.usuarioId === 'presente')!;
    const faltante = parts.find((p) => p.usuarioId === 'faltante')!;
    assert.equal(presente.status, 'concluida');
    assert.equal(faltante.status, 'no_show');
    // no-show não gera reembolso
    assert.equal(gw.chamadas.filter((c) => c.startsWith('reembolsar')).length, 0);

    const u = await svc.obterUsuario('faltante');
    assert.equal(u.noShows, 1);
  });

  await test('bloqueio progressivo: 2º no-show gera 7 dias e barra nova inscrição', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);

    // duas peladas em que 'reincidente' falta -> 2 no-shows -> bloqueio de 7 dias
    for (let i = 0; i < 2; i++) {
      const jogo = await svc.criarJogo(jogoBase({ capacidade: 4, minimoJogadores: 2 }));
      await svc.publicarJogo(jogo.id);
      const r = await svc.inscrever(jogo.id, 'reincidente', 'cartao');
      const outro = await svc.inscrever(jogo.id, `parça${i}`, 'cartao'); // confirma
      await svc.fazerCheckin(outro.participacao.id); // o outro comparece
      await svc.iniciarJogo(jogo.id);
      await svc.finalizarJogo(jogo.id); // 'reincidente' falta
    }

    const u = await svc.obterUsuario('reincidente');
    assert.equal(u.noShows, 2);
    assert.ok(u.bloqueadoAte && u.bloqueadoAte > new Date(), 'ficou bloqueado');

    const novo = await svc.criarJogo(jogoBase({ capacidade: 4, minimoJogadores: 2 }));
    await svc.publicarJogo(novo.id);
    await assert.rejects(
      () => svc.inscrever(novo.id, 'reincidente', 'cartao'),
      /bloqueado por no-shows/
    );
  });

  console.log('\n[ A2 — repasse semanal em lote ]');

  async function jogoLiquidado(
    svc: JogoAppService,
    quadraId: string,
    usuarios: string[],
    inicio: Date
  ): Promise<string> {
    const jogo = await svc.criarJogo(
      jogoBase({
        quadraId,
        capacidade: 6,
        minimoJogadores: 2,
        inicio,
        fim: new Date(inicio.getTime() + 3_600_000),
        prazoConfirmacao: new Date(inicio.getTime() - 3_600_000),
      })
    );
    await svc.publicarJogo(jogo.id);
    for (const u of usuarios) {
      await svc.inscrever(jogo.id, u, 'cartao');
    }
    // check-in só depois que o jogo confirmou (todos viram 'confirmada')
    for (const p of await svc.listarParticipacoes(jogo.id)) {
      await svc.fazerCheckin(p.id);
    }
    await svc.iniciarJogo(jogo.id);
    await svc.finalizarJogo(jogo.id);
    await svc.liquidarJogo(jogo.id);
    return jogo.id;
  }

  await test('fecha repasse agregando a parte da quadra transação a transação', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    // 2 jogos da mesma quadra na semana, 3 e 2 jogadores. valorQuadra=1800/vaga.
    await jogoLiquidado(svc, 'quadra-A', ['a1', 'a2', 'a3'], new Date('2026-08-03T20:00:00-03:00'));
    await jogoLiquidado(svc, 'quadra-A', ['b1', 'b2'], new Date('2026-08-05T20:00:00-03:00'));

    const { repasse, itens } = await svc.fecharRepasse(
      'quadra-A',
      new Date('2026-08-03T00:00:00-03:00'),
      new Date('2026-08-10T00:00:00-03:00')
    );
    assert.equal(itens.length, 5, 'uma linha auditável por transação');
    assert.equal(repasse.valorCentavos, 5 * 1800, 'soma da parte da quadra');
    assert.ok(itens.every((i) => i.tipo === 'credito'));
  });

  await test('idempotente: refechar o mesmo período não duplica', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    await jogoLiquidado(svc, 'quadra-B', ['x1', 'x2'], new Date('2026-08-04T20:00:00-03:00'));
    const ini = new Date('2026-08-03T00:00:00-03:00');
    const fim = new Date('2026-08-10T00:00:00-03:00');
    await svc.fecharRepasse('quadra-B', ini, fim);
    await assert.rejects(() => svc.fecharRepasse('quadra-B', ini, fim), /já fechado/);
  });

  await test('estorno após repasse é compensado (item negativo) no ciclo seguinte', async () => {
    const gw = new GatewayEspiao();
    const svc = novoServico(gw);
    const jogoId = await jogoLiquidado(
      svc,
      'quadra-C',
      ['c1', 'c2'],
      new Date('2026-08-04T20:00:00-03:00')
    );
    const semana1ini = new Date('2026-08-03T00:00:00-03:00');
    const semana1fim = new Date('2026-08-10T00:00:00-03:00');
    const r1 = await svc.fecharRepasse('quadra-C', semana1ini, semana1fim);
    assert.equal(r1.repasse.valorCentavos, 2 * 1800);

    // uma das transações é estornada DEPOIS de já ter entrado no repasse
    const parts = await svc.listarParticipacoes(jogoId);
    await svc.estornarParticipacao(parts[0].id);

    // ciclo seguinte deve trazer um item negativo de compensação
    const semana2ini = new Date('2026-08-10T00:00:00-03:00');
    const semana2fim = new Date('2026-08-17T00:00:00-03:00');
    const r2 = await svc.fecharRepasse('quadra-C', semana2ini, semana2fim);
    const compensacao = r2.itens.find((i) => i.tipo === 'estorno_compensacao');
    assert.ok(compensacao, 'gerou item de compensação');
    assert.equal(compensacao!.valorCentavos, -1800);
    assert.equal(r2.repasse.valorCentavos, -1800, 'ciclo seguinte debita o estorno');
  });

  console.log(`\n${passed} testes de API passaram ✔\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
