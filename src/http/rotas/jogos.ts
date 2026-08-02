import { FastifyInstance } from 'fastify';
import { JogoAppService } from '../../app/jogoAppService';

const criarJogoSchema = {
  body: {
    type: 'object',
    required: [
      'campoId',
      'quadraId',
      'organizadorId',
      'titulo',
      'nivel',
      'inicio',
      'fim',
      'capacidade',
      'minimoJogadores',
      'prazoConfirmacao',
      'precoVagaCentavos',
    ],
    properties: {
      campoId: { type: 'string' },
      quadraId: { type: 'string' },
      organizadorId: { type: 'string' },
      titulo: { type: 'string', minLength: 1 },
      nivel: { type: 'string' },
      inicio: { type: 'string', format: 'date-time' },
      fim: { type: 'string', format: 'date-time' },
      capacidade: { type: 'integer' },
      minimoJogadores: { type: 'integer' },
      prazoConfirmacao: { type: 'string', format: 'date-time' },
      precoVagaCentavos: { type: 'integer' },
      publico: { type: 'boolean' },
    },
  },
};

const inscricaoSchema = {
  body: {
    type: 'object',
    required: ['usuarioId', 'metodo'],
    properties: {
      usuarioId: { type: 'string' },
      metodo: { type: 'string', enum: ['cartao', 'pix'] },
    },
  },
};

export function registrarRotasJogos(app: FastifyInstance, service: JogoAppService): void {
  app.post('/jogos', { schema: criarJogoSchema }, async (req, reply) => {
    const b = req.body as {
      campoId: string;
      quadraId: string;
      organizadorId: string;
      titulo: string;
      nivel: string;
      inicio: string;
      fim: string;
      capacidade: number;
      minimoJogadores: number;
      prazoConfirmacao: string;
      precoVagaCentavos: number;
      publico?: boolean;
    };
    const jogo = await service.criarJogo({
      ...b,
      inicio: new Date(b.inicio),
      fim: new Date(b.fim),
      prazoConfirmacao: new Date(b.prazoConfirmacao),
    });
    reply.status(201).send(jogo);
  });

  app.get('/jogos', async (req) => {
    const q = req.query as { status?: string; publico?: string };
    return service.listarJogos({
      status: q.status as never,
      publico: q.publico === undefined ? undefined : q.publico === 'true',
    });
  });

  app.get('/jogos/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.obterJogo(id);
  });

  app.get('/jogos/:id/participacoes', async (req) => {
    const { id } = req.params as { id: string };
    return service.listarParticipacoes(id);
  });

  app.get('/jogos/:id/eventos', async (req) => {
    const { id } = req.params as { id: string };
    return service.listarEventos(id);
  });

  app.post('/jogos/:id/publicar', async (req) => {
    const { id } = req.params as { id: string };
    return service.publicarJogo(id);
  });

  app.post('/jogos/:id/iniciar', async (req) => {
    const { id } = req.params as { id: string };
    return service.iniciarJogo(id);
  });

  app.post('/jogos/:id/finalizar', async (req) => {
    const { id } = req.params as { id: string };
    return service.finalizarJogo(id);
  });

  app.post('/jogos/:id/liquidar', async (req) => {
    const { id } = req.params as { id: string };
    return service.liquidarJogo(id);
  });

  app.post('/jogos/:id/cancelar', async (req) => {
    const { id } = req.params as { id: string };
    const { motivo } = (req.body ?? {}) as { motivo?: string };
    return service.cancelarJogoManual(id, motivo);
  });

  app.post('/jogos/:id/expirar-prazo', async (req) => {
    const { id } = req.params as { id: string };
    return service.cancelarPorFaltaDeMinimo(id);
  });

  app.post('/jogos/:id/inscricoes', { schema: inscricaoSchema }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { usuarioId, metodo } = req.body as { usuarioId: string; metodo: 'cartao' | 'pix' };
    const resultado = await service.inscrever(id, usuarioId, metodo);
    reply.status(201).send(resultado);
  });
}
