import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import { FacilityAppService } from '../app/facilityAppService';
import { JogoAppService } from '../app/jogoAppService';
import {
  CreditoRepositorioMemoria,
  EventoRepositorioMemoria,
  JogoRepositorioMemoria,
  ParticipacaoRepositorioMemoria,
  RepasseRepositorioMemoria,
  UsuarioRepositorioMemoria,
} from '../infra/repositorios/memoria';
import {
  AvailabilitySlotRepositorioMemoria,
  CourtRepositorioMemoria,
  FacilityRepositorioMemoria,
} from '../infra/repositorios/memoriaParceiros';
import { GatewayPagamentoFake } from '../infra/gateway/gatewayFake';
import { registrarRotasAdmin } from './rotas/admin';
import { registrarRotasJogos } from './rotas/jogos';
import { registrarRotasParticipacoes } from './rotas/participacoes';
import { registrarRotasPrecos } from './rotas/precos';
import { registrarRotasRepasses } from './rotas/repasses';
import { registrarRotasUsuario } from './rotas/usuario';

export interface AppDeps {
  jogoService: JogoAppService;
  facilityService: FacilityAppService;
}

export function construirApp(deps?: Partial<AppDeps>): FastifyInstance {
  const app = Fastify({ logger: true });

  // O alvo web do Expo (`npm run web`) roda em outra origem que a API.
  // Em produção isto vira uma lista fechada de origens.
  app.register(cors, { origin: true });

  const jogoService =
    deps?.jogoService ??
    new JogoAppService({
      jogoRepo: new JogoRepositorioMemoria(),
      participacaoRepo: new ParticipacaoRepositorioMemoria(),
      creditoRepo: new CreditoRepositorioMemoria(),
      eventoRepo: new EventoRepositorioMemoria(),
      usuarioRepo: new UsuarioRepositorioMemoria(),
      repasseRepo: new RepasseRepositorioMemoria(),
      gateway: new GatewayPagamentoFake(),
    });

  const facilityService =
    deps?.facilityService ??
    new FacilityAppService({
      facilityRepo: new FacilityRepositorioMemoria(),
      courtRepo: new CourtRepositorioMemoria(),
      slotRepo: new AvailabilitySlotRepositorioMemoria(),
    });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.validation) {
      reply.status(400).send({ erro: 'requisição inválida', detalhes: error.validation });
      return;
    }
    const statusCode = error.statusCode;
    if (statusCode && statusCode < 500) {
      reply.status(statusCode).send({ erro: error.message });
      return;
    }
    app.log.error(error);
    reply.status(500).send({ erro: 'erro interno' });
  });

  app.get('/saude', async () => ({ status: 'ok' }));

  // Dois documentos Swagger separados — cada `register` abaixo cria um
  // contexto encapsulado do Fastify, e o plugin de swagger só enxerga rotas
  // registradas dentro do próprio contexto (é o jeito documentado de ter
  // múltiplos specs OpenAPI num app só). Admin (equipe interna) e App
  // (jogador) nunca aparecem no doc um do outro.
  app.register(async (adminApp) => {
    await adminApp.register(swagger, {
      openapi: {
        info: {
          title: 'FutMatch API — Admin',
          description: 'Uso interno: comercial/ops cadastram facility, quadra, disponibilidade e fecham repasses.',
          version: '1.0.0',
        },
        tags: [
          { name: 'Facilities' },
          { name: 'Courts' },
          { name: 'Disponibilidade' },
          { name: 'Repasses' },
        ],
      },
    });
    await adminApp.register(swaggerUi, { routePrefix: '/docs/admin' });

    registrarRotasAdmin(adminApp, facilityService);
    registrarRotasRepasses(adminApp, jogoService);
  });

  app.register(async (jogadorApp) => {
    await jogadorApp.register(swagger, {
      openapi: {
        info: {
          title: 'FutMatch API — App do Jogador',
          description: 'Descoberta, inscrição, pagamento e perfil do jogador.',
          version: '1.0.0',
        },
        tags: [{ name: 'Jogos' }, { name: 'Participações' }, { name: 'Preços' }, { name: 'Usuário' }],
      },
    });
    await jogadorApp.register(swaggerUi, { routePrefix: '/docs' });

    registrarRotasJogos(jogadorApp, jogoService);
    registrarRotasParticipacoes(jogadorApp, jogoService);
    registrarRotasPrecos(jogadorApp);
    registrarRotasUsuario(jogadorApp, jogoService);
  });

  return app;
}
