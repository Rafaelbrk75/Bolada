/**
 * Entidades do lado B2B: parceiro (Facility), quadra individual (Court) e
 * slot de disponibilidade (AvailabilitySlot).
 *
 * Nomes em inglês seguindo a especificação do modelo B2B2C. O resto do domínio
 * ainda está em português — a unificação é um passo mecânico separado.
 *
 * Mapeamento com db/schema.sql, cujos nomes enganam:
 *   Facility        -> tabela `quadras`  (o local: endereço, lat/lng, comissão)
 *   Court           -> tabela `campos`   (o gramado: formato, preço/hora)
 *   AvailabilitySlot-> tabela `slots_disponibilidade` (instantes concretos;
 *                      a tabela `disponibilidades` é a grade recorrente que
 *                      alimenta o gerador de slots, não o slot em si)
 */

/** Funil comercial: só `ativo` entra no motor de ociosidade. */
export type FacilityStatus = 'lead' | 'em_negociacao' | 'ativo' | 'inativo';

/**
 * Governa auto-publicação: `novo` manda todo jogo gerado para revisão manual;
 * `estabelecido` publica direto. É o que dá escala ao modelo.
 */
export type TrustLevel = 'novo' | 'estabelecido';

export type CourtStatus = 'ativa' | 'pausada';

export type SurfaceType = 'salao' | 'society' | 'areia' | 'campo';

export type SlotSource = 'manual' | 'importado' | 'integracao_api';

export type SlotStatus =
  | 'livre'
  | 'em_avaliacao'
  | 'virou_jogo'
  | 'bloqueado'
  | 'reservado_pela_quadra';

export interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  uf: string;
  lat: number;
  lng: number;
  status: FacilityStatus;
  trustLevel: TrustLevel;
  /** Comissão de contrato retida da quadra, em basis points. Sem default na API. */
  platformFeeBps: number;
  contractSignedAt?: Date;
  /** Dados bancários / conta conectada no gateway. Opaco pra esta camada. */
  payoutMethod?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Court {
  id: string;
  facilityId: string;
  name: string;
  surfaceType: SurfaceType;
  capacity: number;
  defaultSkillLevel: string;
  defaultPriceCents: number;
  /** Trilhos de segurança da precificação dinâmica. Sem eles, cai em ±% do default. */
  minPriceCents?: number;
  maxPriceCents?: number;
  /** Sobrescreve a comissão da facility para esta quadra específica. */
  platformFeeBpsOverride?: number;
  status: CourtStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilitySlot {
  id: string;
  courtId: string;
  startTime: Date;
  endTime: Date;
  source: SlotSource;
  status: SlotStatus;
  /** Preenchido pelo filtro F4 do motor; null enquanto não avaliado. */
  demandScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FacilityRepositorio {
  criar(f: Facility): Promise<Facility>;
  buscarPorId(id: string): Promise<Facility | null>;
  listar(filtro?: { status?: FacilityStatus; trustLevel?: TrustLevel }): Promise<Facility[]>;
  atualizar(f: Facility): Promise<Facility>;
}

export interface CourtRepositorio {
  criar(c: Court): Promise<Court>;
  buscarPorId(id: string): Promise<Court | null>;
  listarPorFacility(facilityId: string): Promise<Court[]>;
  listar(filtro?: { status?: CourtStatus }): Promise<Court[]>;
  atualizar(c: Court): Promise<Court>;
}

export interface AvailabilitySlotRepositorio {
  criar(s: AvailabilitySlot): Promise<AvailabilitySlot>;
  criarVarios(slots: AvailabilitySlot[]): Promise<AvailabilitySlot[]>;
  buscarPorId(id: string): Promise<AvailabilitySlot | null>;
  listarPorCourt(courtId: string): Promise<AvailabilitySlot[]>;
  listar(filtro?: { status?: SlotStatus; ateInicio?: Date }): Promise<AvailabilitySlot[]>;
  atualizar(s: AvailabilitySlot): Promise<AvailabilitySlot>;
}
