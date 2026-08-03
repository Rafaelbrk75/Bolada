/**
 * Implementação em memória das portas do lado B2B. Mesmo padrão do memoria.ts:
 * Map por id, objetos guardados por referência, `atualizar` explode se o id
 * não existe.
 */

import {
  AvailabilitySlot,
  AvailabilitySlotRepositorio,
  Court,
  CourtRepositorio,
  CourtStatus,
  Facility,
  FacilityRepositorio,
  FacilityStatus,
  SlotStatus,
  TrustLevel,
} from './parceiros';

export class FacilityRepositorioMemoria implements FacilityRepositorio {
  private facilities = new Map<string, Facility>();

  async criar(f: Facility): Promise<Facility> {
    this.facilities.set(f.id, f);
    return f;
  }

  async buscarPorId(id: string): Promise<Facility | null> {
    return this.facilities.get(id) ?? null;
  }

  async listar(filtro?: { status?: FacilityStatus; trustLevel?: TrustLevel }): Promise<Facility[]> {
    let resultado = [...this.facilities.values()];
    if (filtro?.status) resultado = resultado.filter((f) => f.status === filtro.status);
    if (filtro?.trustLevel) resultado = resultado.filter((f) => f.trustLevel === filtro.trustLevel);
    return resultado;
  }

  async atualizar(f: Facility): Promise<Facility> {
    if (!this.facilities.has(f.id)) throw new Error(`facility ${f.id} não existe`);
    this.facilities.set(f.id, f);
    return f;
  }
}

export class CourtRepositorioMemoria implements CourtRepositorio {
  private courts = new Map<string, Court>();

  async criar(c: Court): Promise<Court> {
    this.courts.set(c.id, c);
    return c;
  }

  async buscarPorId(id: string): Promise<Court | null> {
    return this.courts.get(id) ?? null;
  }

  async listarPorFacility(facilityId: string): Promise<Court[]> {
    return [...this.courts.values()].filter((c) => c.facilityId === facilityId);
  }

  async listar(filtro?: { status?: CourtStatus }): Promise<Court[]> {
    let resultado = [...this.courts.values()];
    if (filtro?.status) resultado = resultado.filter((c) => c.status === filtro.status);
    return resultado;
  }

  async atualizar(c: Court): Promise<Court> {
    if (!this.courts.has(c.id)) throw new Error(`court ${c.id} não existe`);
    this.courts.set(c.id, c);
    return c;
  }
}

export class AvailabilitySlotRepositorioMemoria implements AvailabilitySlotRepositorio {
  private slots = new Map<string, AvailabilitySlot>();

  async criar(s: AvailabilitySlot): Promise<AvailabilitySlot> {
    this.slots.set(s.id, s);
    return s;
  }

  async criarVarios(novos: AvailabilitySlot[]): Promise<AvailabilitySlot[]> {
    for (const s of novos) this.slots.set(s.id, s);
    return novos;
  }

  async buscarPorId(id: string): Promise<AvailabilitySlot | null> {
    return this.slots.get(id) ?? null;
  }

  async listarPorCourt(courtId: string): Promise<AvailabilitySlot[]> {
    return [...this.slots.values()]
      .filter((s) => s.courtId === courtId)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async listar(filtro?: { status?: SlotStatus; ateInicio?: Date }): Promise<AvailabilitySlot[]> {
    let resultado = [...this.slots.values()];
    if (filtro?.status) resultado = resultado.filter((s) => s.status === filtro.status);
    if (filtro?.ateInicio) {
      const limite = filtro.ateInicio.getTime();
      resultado = resultado.filter((s) => s.startTime.getTime() <= limite);
    }
    return resultado.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async atualizar(s: AvailabilitySlot): Promise<AvailabilitySlot> {
    if (!this.slots.has(s.id)) throw new Error(`slot ${s.id} não existe`);
    this.slots.set(s.id, s);
    return s;
  }
}
