/**
 * Cadastro do lado B2B — uso interno da equipe. O parceiro não se autocadastra:
 * o comercial fecha o contrato e a operação registra facility, quadras e
 * disponibilidade aqui.
 */

import { randomUUID } from 'node:crypto';
import { DesempenhoFacility, proximoTrustLevel } from '../domain/facility';
import { ErroConflito, ErroNaoEncontrado, ErroRequisicaoInvalida } from './erros';
import { RELOGIO_SISTEMA, Relogio } from './relogio';
import {
  AvailabilitySlot,
  AvailabilitySlotRepositorio,
  Court,
  CourtRepositorio,
  Facility,
  FacilityRepositorio,
  FacilityStatus,
  SlotSource,
  SlotStatus,
  SurfaceType,
} from '../infra/repositorios/parceiros';

export interface CriarFacilityInput {
  name: string;
  address: string;
  city: string;
  uf: string;
  lat: number;
  lng: number;
  /** Obrigatório: é o contrato. Sem default de API de propósito. */
  platformFeeBps: number;
  status?: FacilityStatus;
  contractSignedAt?: Date;
  payoutMethod?: Record<string, unknown>;
}

export interface CriarCourtInput {
  name: string;
  surfaceType: SurfaceType;
  capacity: number;
  defaultSkillLevel: string;
  defaultPriceCents: number;
  minPriceCents?: number;
  maxPriceCents?: number;
  platformFeeBpsOverride?: number;
}

export interface CriarSlotInput {
  startTime: Date;
  endTime: Date;
  source?: SlotSource;
  status?: SlotStatus;
}

export interface FacilityAppServiceDeps {
  facilityRepo: FacilityRepositorio;
  courtRepo: CourtRepositorio;
  slotRepo: AvailabilitySlotRepositorio;
  relogio?: Relogio;
}

export class FacilityAppService {
  private readonly facilityRepo: FacilityRepositorio;
  private readonly courtRepo: CourtRepositorio;
  private readonly slotRepo: AvailabilitySlotRepositorio;
  private readonly relogio: Relogio;

  constructor(deps: FacilityAppServiceDeps) {
    this.facilityRepo = deps.facilityRepo;
    this.courtRepo = deps.courtRepo;
    this.slotRepo = deps.slotRepo;
    this.relogio = deps.relogio ?? RELOGIO_SISTEMA;
  }

  // ---------- facility ----------

  async criarFacility(input: CriarFacilityInput): Promise<Facility> {
    if (!Number.isInteger(input.platformFeeBps) || input.platformFeeBps < 0 || input.platformFeeBps > 10_000) {
      throw new ErroRequisicaoInvalida('platformFeeBps deve ser inteiro entre 0 e 10000');
    }
    const agora = this.relogio();
    const facility: Facility = {
      id: randomUUID(),
      name: input.name,
      address: input.address,
      city: input.city,
      uf: input.uf,
      lat: input.lat,
      lng: input.lng,
      status: input.status ?? 'lead',
      // Todo parceiro entra sob revisão manual; graduação é conquistada.
      trustLevel: 'novo',
      platformFeeBps: input.platformFeeBps,
      contractSignedAt: input.contractSignedAt,
      payoutMethod: input.payoutMethod,
      createdAt: agora,
      updatedAt: agora,
    };
    return this.facilityRepo.criar(facility);
  }

  async obterFacility(id: string): Promise<Facility> {
    const f = await this.facilityRepo.buscarPorId(id);
    if (!f) throw new ErroNaoEncontrado('facility', id);
    return f;
  }

  async listarFacilities(filtro?: { status?: FacilityStatus }): Promise<Facility[]> {
    return this.facilityRepo.listar(filtro);
  }

  /** Avança o funil comercial. `ativo` é o que libera a facility pro motor. */
  async mudarStatusFacility(id: string, status: FacilityStatus): Promise<Facility> {
    const f = await this.obterFacility(id);
    if (status === 'ativo' && !f.contractSignedAt) {
      throw new ErroConflito('facility só fica ativa depois do contrato assinado');
    }
    f.status = status;
    f.updatedAt = this.relogio();
    return this.facilityRepo.atualizar(f);
  }

  async assinarContrato(id: string, quando: Date = this.relogio()): Promise<Facility> {
    const f = await this.obterFacility(id);
    f.contractSignedAt = quando;
    f.status = 'ativo';
    f.updatedAt = this.relogio();
    return this.facilityRepo.atualizar(f);
  }

  /** Reavalia o nível de confiança a partir do desempenho apurado. */
  async recalcularTrustLevel(id: string, desempenho: DesempenhoFacility): Promise<Facility> {
    const f = await this.obterFacility(id);
    const proximo = proximoTrustLevel(f.trustLevel, desempenho);
    if (proximo !== f.trustLevel) {
      f.trustLevel = proximo;
      f.updatedAt = this.relogio();
      await this.facilityRepo.atualizar(f);
    }
    return f;
  }

  // ---------- court ----------

  async criarCourt(facilityId: string, input: CriarCourtInput): Promise<Court> {
    await this.obterFacility(facilityId);
    if (input.capacity < 2 || input.capacity > 30) {
      throw new ErroRequisicaoInvalida('capacity deve estar entre 2 e 30');
    }
    if (!Number.isInteger(input.defaultPriceCents) || input.defaultPriceCents < 0) {
      throw new ErroRequisicaoInvalida('defaultPriceCents deve ser inteiro >= 0');
    }
    if (
      input.minPriceCents !== undefined &&
      input.maxPriceCents !== undefined &&
      input.minPriceCents > input.maxPriceCents
    ) {
      throw new ErroRequisicaoInvalida('minPriceCents não pode ser maior que maxPriceCents');
    }
    const agora = this.relogio();
    const court: Court = {
      id: randomUUID(),
      facilityId,
      name: input.name,
      surfaceType: input.surfaceType,
      capacity: input.capacity,
      defaultSkillLevel: input.defaultSkillLevel,
      defaultPriceCents: input.defaultPriceCents,
      minPriceCents: input.minPriceCents,
      maxPriceCents: input.maxPriceCents,
      platformFeeBpsOverride: input.platformFeeBpsOverride,
      status: 'ativa',
      createdAt: agora,
      updatedAt: agora,
    };
    return this.courtRepo.criar(court);
  }

  async obterCourt(id: string): Promise<Court> {
    const c = await this.courtRepo.buscarPorId(id);
    if (!c) throw new ErroNaoEncontrado('court', id);
    return c;
  }

  async listarCourts(facilityId: string): Promise<Court[]> {
    await this.obterFacility(facilityId);
    return this.courtRepo.listarPorFacility(facilityId);
  }

  // ---------- disponibilidade ----------

  /** Cadastro em lote: a equipe digita o que a quadra mandou, ou importa. */
  async criarSlots(courtId: string, entradas: CriarSlotInput[]): Promise<AvailabilitySlot[]> {
    await this.obterCourt(courtId);
    const agora = this.relogio();
    const slots = entradas.map((e) => {
      if (e.endTime <= e.startTime) {
        throw new ErroRequisicaoInvalida('endTime deve ser depois de startTime');
      }
      const slot: AvailabilitySlot = {
        id: randomUUID(),
        courtId,
        startTime: e.startTime,
        endTime: e.endTime,
        source: e.source ?? 'manual',
        status: e.status ?? 'livre',
        createdAt: agora,
        updatedAt: agora,
      };
      return slot;
    });
    return this.slotRepo.criarVarios(slots);
  }

  async obterSlot(id: string): Promise<AvailabilitySlot> {
    const s = await this.slotRepo.buscarPorId(id);
    if (!s) throw new ErroNaoEncontrado('slot', id);
    return s;
  }

  async listarSlots(courtId: string): Promise<AvailabilitySlot[]> {
    await this.obterCourt(courtId);
    return this.slotRepo.listarPorCourt(courtId);
  }

  /**
   * Transição de status do slot. O motor usa isto pra marcar `em_avaliacao` e
   * `virou_jogo`; a quadra usa pra bloquear horário de última hora.
   */
  async mudarStatusSlot(id: string, status: SlotStatus): Promise<AvailabilitySlot> {
    const slot = await this.obterSlot(id);
    if (slot.status === 'virou_jogo' && status === 'bloqueado') {
      throw new ErroConflito(
        'slot já virou jogo: cancele o jogo antes de bloquear o horário'
      );
    }
    slot.status = status;
    slot.updatedAt = this.relogio();
    return this.slotRepo.atualizar(slot);
  }

  async registrarDemandScore(id: string, score: number): Promise<AvailabilitySlot> {
    const slot = await this.obterSlot(id);
    slot.demandScore = score;
    slot.updatedAt = this.relogio();
    return this.slotRepo.atualizar(slot);
  }
}
