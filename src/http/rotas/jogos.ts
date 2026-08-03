import { FastifyInstance } from 'fastify';
import { JogoAppService } from '../../app/jogoAppService';

const TAG = ['Jogos'];

const criarJogoSchema = {
  tags: TAG,
  summary: 'Cria um jogo (rascunho)',
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
  tags: TAG,
  summary: 'Inscreve um jogador no jogo (join)',
  description:
    'Cartão pré-autoriza (captura só na confirmação); Pix cobra na hora; jogo cheio manda pra lista de espera sem cobrar.',
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

  app.get('/jogos', { schema: { tags: TAG, summary: 'Busca jogos' } }, async (req) => {
    const q = req.query as { status?: string; publico?: string };
    return service.listarJogos({
      status: q.status as never,
      publico: q.publico === undefined ? undefined : q.publico === 'true',
    });
  });

  app.get('/jogos/:id', { schema: { tags: TAG, summary: 'Obtém um jogo' } }, async (req) => {
    const { id } = req.params as { id: string };
    return service.obterJogo(id);
  });

  app.get(
    '/jogos/:id/participacoes',
    { schema: { tags: TAG, summary: 'Lista as participações (roster) de um jogo' } },
    async (req) => {
      const { id } = req.params as { id: string };
      return service.listarParticipacoes(id);
    }
  );

  app.get(
    '/jogos/:id/eventos',
    { schema: { tags: TAG, summary: 'Log de eventos do jogo (auditoria)' } },
    async (req) => {
      const { id } = req.params as { id: string };
      return service.listarEventos(id);
    }
  );

  app.post(
    '/jogos/:id/publicar',
    { schema: { tags: TAG, summary: 'Publica o jogo (rascunho -> aberto)' } },
    async (req) => {
      const { id } = req.params as { id: string };
      return service.publicarJogo(id);
    }
  );

  app.post(
    '/jogos/:id/iniciar',
    { schema: { tags: TAG, summary: 'Marca o início do jogo' } },
    async (req) => {
      const { id } = req.params as { id: string };
      return service.iniciarJogo(id);
    }
  );

  app.post(
    '/jogos/:id/finalizar',
    { schema: { tags: TAG, summary: 'Marca o fim do jogo (dispara check-in/no-show)' } },
    async (req) => {
      const { id } = req.params as { id: string };
      return service.finalizarJogo(id);
    }
  );

  app.post(
    '/jogos/:id/liquidar',
    { schema: { tags: TAG, summary: 'Liquida o jogo (libera pra entrar em repasse)' } },
    async (req) => {
      const { id } = req.params as { id: string };
      return service.liquidarJogo(id);
    }
  );

  app.post(
    '/jogos/:id/cancelar',
    { schema: { tags: TAG, summary: 'Cancela o jogo manualmente' } },
    async (req) => {
      const { id } = req.params as { id: string };
      const { motivo } = (req.body ?? {}) as { motivo?: string };
      return service.cancelarJogoManual(id, motivo);
    }
  );

  app.post(
    '/jogos/:id/expirar-prazo',
    { schema: { tags: TAG, summary: 'Cancela por não ter batido o mínimo até o prazo' } },
    async (req) => {
      const { id } = req.params as { id: string };
      return service.cancelarPorFaltaDeMinimo(id);
    }
  );

  app.post('/jogos/:id/inscricoes', { schema: inscricaoSchema }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { usuarioId, metodo } = req.body as { usuarioId: string; metodo: 'cartao' | 'pix' };
    const resultado = await service.inscrever(id, usuarioId, metodo);
    reply.status(201).send(resultado);
  });
}
