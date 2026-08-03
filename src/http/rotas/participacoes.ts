import { FastifyInstance, FastifyRequest } from 'fastify';
import { JogoAppService } from '../../app/jogoAppService';

const TAG = ['Participações'];

// Corpo opcional: endpoints de ação podem ser chamados sem body (ex.: check-in).
// Ler defensivamente evita o erro "must be object" quando não vem corpo nenhum.
function corpo<T extends Record<string, unknown>>(req: FastifyRequest): T {
  return (req.body ?? {}) as T;
}

function dataOpcional(valor?: string): Date | undefined {
  return valor ? new Date(valor) : undefined;
}

const pagarReservaSchema = {
  tags: TAG,
  summary: 'Paga a vaga liberada pela lista de espera',
  description: 'Janela de 10 minutos após a promoção; expira sozinha se não pagar a tempo.',
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
  app.post(
    '/participacoes/:id/cancelar',
    {
      schema: {
        tags: TAG,
        summary: 'Cancela a participação do jogador',
        description:
          '>=24h: reembolso integral. 6–24h: 100% em crédito ou 50% no cartão (escolha). <6h: sem reembolso.',
        body: {
          type: 'object',
          properties: {
            momento: { type: 'string', format: 'date-time' },
            escolha: { type: 'string', enum: ['cartao', 'credito'] },
          },
        },
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      const { momento, escolha } = corpo<{ momento?: string; escolha?: 'cartao' | 'credito' }>(req);
      const escolhaValida = escolha === 'credito' ? 'credito' : 'cartao';
      return service.cancelarParticipacao(id, dataOpcional(momento), escolhaValida);
    }
  );

  app.post('/participacoes/:id/pagar-reserva', { schema: pagarReservaSchema }, async (req) => {
    const { id } = req.params as { id: string };
    const { metodo, momento } = req.body as { metodo: 'cartao' | 'pix'; momento?: string };
    return service.pagarReserva(id, metodo, dataOpcional(momento));
  });

  app.post(
    '/participacoes/:id/expirar-reserva',
    { schema: { tags: TAG, summary: 'Expira a janela de pagamento da reserva e promove o próximo da fila' } },
    async (req) => {
      const { id } = req.params as { id: string };
      const { momento } = corpo<{ momento?: string }>(req);
      return service.expirarReserva(id, dataOpcional(momento));
    }
  );

  // A1: check-in de presença (corpo opcional).
  app.post(
    '/participacoes/:id/checkin',
    { schema: { tags: TAG, summary: 'Registra check-in de presença no jogo' } },
    async (req) => {
      const { id } = req.params as { id: string };
      const { momento } = corpo<{ momento?: string }>(req);
      return service.fazerCheckin(id, dataOpcional(momento));
    }
  );

  // A2: estorno administrativo (disputa/chargeback) de transação capturada.
  app.post(
    '/participacoes/:id/estornar',
    {
      schema: {
        tags: TAG,
        summary: 'Estorno administrativo de transação capturada (disputa/chargeback)',
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      const { momento } = corpo<{ momento?: string }>(req);
      return service.estornarParticipacao(id, dataOpcional(momento));
    }
  );
}
