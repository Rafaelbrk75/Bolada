import { FastifyInstance } from 'fastify';
import { JogoAppService } from '../../app/jogoAppService';

const fecharRepasseSchema = {
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

  app.get('/repasses', async (req) => {
    const { quadraId } = req.query as { quadraId?: string };
    return service.listarRepasses(quadraId);
  });

  app.get('/repasses/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.obterRepasse(id);
  });

  // Perfil/reputação do usuário (no-shows, jogos realizados, bloqueio).
  app.get('/usuarios/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.obterUsuario(id);
  });
}
