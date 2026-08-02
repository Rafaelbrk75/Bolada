import { FastifyInstance, FastifyRequest } from 'fastify';
import { JogoAppService } from '../../app/jogoAppService';

// Corpo opcional: endpoints de ação podem ser chamados sem body (ex.: check-in).
// Ler defensivamente evita o erro "must be object" quando não vem corpo nenhum.
function corpo<T extends Record<string, unknown>>(req: FastifyRequest): T {
  return (req.body ?? {}) as T;
}

function dataOpcional(valor?: string): Date | undefined {
  return valor ? new Date(valor) : undefined;
}

const pagarReservaSchema = {
  body: {
    type: 'object',
    required: ['metodo'],
    properties: {
      metodo: { type: 'string', enum: ['cartao', 'pix'] },
      momento: { type: 'string', format: 'date-time' },
    },
  },
};

export function registrarRotasParticipacoes(app: FastifyInstance, service: JogoAppService): void {
  app.post('/participacoes/:id/cancelar', async (req) => {
    const { id } = req.params as { id: string };
    const { momento, escolha } = corpo<{ momento?: string; escolha?: 'cartao' | 'credito' }>(req);
    const escolhaValida = escolha === 'credito' ? 'credito' : 'cartao';
    return service.cancelarParticipacao(id, dataOpcional(momento), escolhaValida);
  });

  app.post('/participacoes/:id/pagar-reserva', { schema: pagarReservaSchema }, async (req) => {
    const { id } = req.params as { id: string };
    const { metodo, momento } = req.body as { metodo: 'cartao' | 'pix'; momento?: string };
    return service.pagarReserva(id, metodo, dataOpcional(momento));
  });

  app.post('/participacoes/:id/expirar-reserva', async (req) => {
    const { id } = req.params as { id: string };
    const { momento } = corpo<{ momento?: string }>(req);
    return service.expirarReserva(id, dataOpcional(momento));
  });

  // A1: check-in de presença (corpo opcional).
  app.post('/participacoes/:id/checkin', async (req) => {
    const { id } = req.params as { id: string };
    const { momento } = corpo<{ momento?: string }>(req);
    return service.fazerCheckin(id, dataOpcional(momento));
  });

  // A2: estorno administrativo (disputa/chargeback) de transação capturada.
  app.post('/participacoes/:id/estornar', async (req) => {
    const { id } = req.params as { id: string };
    const { momento } = corpo<{ momento?: string }>(req);
    return service.estornarParticipacao(id, dataOpcional(momento));
  });
}
