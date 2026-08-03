import { FastifyInstance } from 'fastify';
import { JogoAppService } from '../../app/jogoAppService';

// Repasse é operação de backoffice — sem painel de autoatendimento do parceiro
// neste escopo, então vive no doc de admin junto com facilities/courts/slots.
const TAG = ['Repasses'];

const fecharRepasseSchema = {
  tags: TAG,
  summary: 'Fecha o repasse de uma quadra num período (lote)',
  description: 'Idempotente por (quadra, período) — refechar o mesmo período não duplica.',
  body: {
    type: 'object',
    required: ['quadraId', 'periodoInicio', 'periodoFim'],
    properties: {
      quadraId: { type: 'string' },
      periodoInicio: { type: 'string', format: 'date-time' },
      periodoFim: { type: 'string', format: 'date-time' },
    },
  },
};

export function registrarRotasRepasses(app: FastifyInstance, service: JogoAppService): void {
  app.post('/repasses/fechar', { schema: fecharRepasseSchema }, async (req, reply) => {
    const { quadraId, periodoInicio, periodoFim } = req.body as {
      quadraId: string;
      periodoInicio: string;
      periodoFim: string;
    };
    const resultado = await service.fecharRepasse(
      quadraId,
      new Date(periodoInicio),
      new Date(periodoFim)
    );
    reply.status(201).send(resultado);
  });

  app.get('/repasses', { schema: { tags: TAG, summary: 'Lista repasses' } }, async (req) => {
    const { quadraId } = req.query as { quadraId?: string };
    return service.listarRepasses(quadraId);
  });

  app.get('/repasses/:id', { schema: { tags: TAG, summary: 'Obtém um repasse e seus itens' } }, async (req) => {
    const { id } = req.params as { id: string };
    return service.obterRepasse(id);
  });
}
