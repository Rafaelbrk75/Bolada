import cors from '@fastify/cors';
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

  registrarRotasAdmin(app, facilityService);
  registrarRotasJogos(app, jogoService);
  registrarRotasParticipacoes(app, jogoService);
  registrarRotasPrecos(app);
  registrarRotasRepasses(app, jogoService);

  return app;
}
