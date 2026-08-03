import { FastifyInstance } from 'fastify';
import { FacilityAppService } from '../../app/facilityAppService';
import { FacilityStatus, SlotSource, SlotStatus, SurfaceType } from '../../infra/repositorios/parceiros';

// Rotas de uso interno da equipe (comercial/ops). O parceiro não se cadastra
// sozinho — por isso tudo aqui vive sob /admin, separado do app do jogador.
// Autenticação/RBAC entra na borda quando existir auth no projeto.

const criarFacilitySchema = {
  body: {
    type: 'object',
    required: ['name', 'address', 'city', 'uf', 'lat', 'lng', 'platformFeeBps'],
    properties: {
      name: { type: 'string', minLength: 1 },
      address: { type: 'string', minLength: 1 },
      city: { type: 'string', minLength: 1 },
      uf: { type: 'string', minLength: 2, maxLength: 2 },
      lat: { type: 'number' },
      lng: { type: 'number' },
      platformFeeBps: { type: 'integer' },
      status: { type: 'string', enum: ['lead', 'em_negociacao', 'ativo', 'inativo'] },
      contractSignedAt: { type: 'string', format: 'date-time' },
      payoutMethod: { type: 'object' },
    },
  },
};

const criarCourtSchema = {
  body: {
    type: 'object',
    required: ['name', 'surfaceType', 'capacity', 'defaultSkillLevel', 'defaultPriceCents'],
    properties: {
      name: { type: 'string', minLength: 1 },
      surfaceType: { type: 'string', enum: ['salao', 'society', 'areia', 'campo'] },
      capacity: { type: 'integer' },
      defaultSkillLevel: { type: 'string' },
      defaultPriceCents: { type: 'integer' },
      minPriceCents: { type: 'integer' },
      maxPriceCents: { type: 'integer' },
      platformFeeBpsOverride: { type: 'integer' },
    },
  },
};

const criarSlotsSchema = {
  body: {
    type: 'object',
    required: ['slots'],
    properties: {
      slots: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['startTime', 'endTime'],
          properties: {
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            source: { type: 'string', enum: ['manual', 'importado', 'integracao_api'] },
            status: {
              type: 'string',
              enum: ['livre', 'em_avaliacao', 'virou_jogo', 'bloqueado', 'reservado_pela_quadra'],
            },
          },
        },
      },
    },
  },
};

export function registrarRotasAdmin(app: FastifyInstance, service: FacilityAppService): void {
  app.post('/admin/facilities', { schema: criarFacilitySchema }, async (req, reply) => {
    const b = req.body as {
      name: string;
      address: string;
      city: string;
      uf: string;
      lat: number;
      lng: number;
      platformFeeBps: number;
      status?: FacilityStatus;
      contractSignedAt?: string;
      payoutMethod?: Record<string, unknown>;
    };
    const facility = await service.criarFacility({
      ...b,
      contractSignedAt: b.contractSignedAt ? new Date(b.contractSignedAt) : undefined,
    });
    reply.status(201).send(facility);
  });

  app.get('/admin/facilities', async (req) => {
    const q = req.query as { status?: FacilityStatus };
    return service.listarFacilities(q.status ? { status: q.status } : undefined);
  });

  app.get('/admin/facilities/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.obterFacility(id);
  });

  app.post('/admin/facilities/:id/contrato', async (req) => {
    const { id } = req.params as { id: string };
    const { quando } = (req.body ?? {}) as { quando?: string };
    return service.assinarContrato(id, quando ? new Date(quando) : undefined);
  });

  app.post('/admin/facilities/:id/status', async (req) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: FacilityStatus };
    return service.mudarStatusFacility(id, status);
  });

  app.post('/admin/facilities/:id/courts', { schema: criarCourtSchema }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = req.body as {
      name: string;
      surfaceType: SurfaceType;
      capacity: number;
      defaultSkillLevel: string;
      defaultPriceCents: number;
      minPriceCents?: number;
      maxPriceCents?: number;
      platformFeeBpsOverride?: number;
    };
    const court = await service.criarCourt(id, b);
    reply.status(201).send(court);
  });

  app.get('/admin/facilities/:id/courts', async (req) => {
    const { id } = req.params as { id: string };
    return service.listarCourts(id);
  });

  app.post('/admin/courts/:id/availability-slots', { schema: criarSlotsSchema }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { slots } = req.body as {
      slots: { startTime: string; endTime: string; source?: SlotSource; status?: SlotStatus }[];
    };
    const criados = await service.criarSlots(
      id,
      slots.map((s) => ({
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        source: s.source,
        status: s.status,
      }))
    );
    reply.status(201).send(criados);
  });

  app.get('/admin/courts/:id/availability-slots', async (req) => {
    const { id } = req.params as { id: string };
    return service.listarSlots(id);
  });

  app.post('/admin/slots/:id/status', async (req) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: SlotStatus };
    return service.mudarStatusSlot(id, status);
  });
}
