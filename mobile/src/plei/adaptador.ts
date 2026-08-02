/**
 * Ponte entre o backend (`Jogo`/`Participacao`, centavos e datas ISO) e o
 * formato que as telas do protótipo consomem. Toda formatação mora aqui —
 * as telas só leem strings prontas.
 */

import { Jogo, Participacao, StatusJogo, StatusParticipacao } from '../types/jogo';
import { formatarCentavos } from '../utils/moeda';
import { Gradiente } from './dados';

/** Participações que ocupam vaga paga (mesma regra do jogoParaResumo no backend). */
const OCUPAM_VAGA: StatusParticipacao[] = ['autorizada', 'confirmada'];

/** Participação ainda viva — some das reservas quando sai daqui. */
const ATIVAS: StatusParticipacao[] = [
  'reservada',
  'autorizada',
  'confirmada',
  'em_espera',
  'concluida',
];

export interface JogoUI {
  id: string;
  title: string;
  host: string;
  location: string;
  tag: string;
  timeRange: string;
  dataLonga: string;
  format: string;
  price: string;
  precoVagaCentavos: number;
  going: number;
  total: number;
  gradient: Gradiente;
  description: string;
  players: string[];
  status: StatusJogo;
  inicio: string;
  /** Participação do usuário atual neste jogo, se houver. */
  minha?: Participacao;
}

const PALETAS: Gradiente[] = [
  { colors: ['#e8925a', '#7a8f7a', '#2f5c46', '#173a2b'], locations: [0, 0.4, 0.75, 1] },
  { colors: ['#1c2b22', '#245c3d', '#3fae6d'], locations: [0, 0.45, 1] },
  { colors: ['#f2c46a', '#7fae6a', '#1f4a34'], locations: [0, 0.45, 1] },
  { colors: ['#3a6b4d', '#1c3f2c'], locations: [0, 1] },
];

/** Mesmo jogo sempre cai na mesma paleta — evita a capa piscar entre recargas. */
export function paletaDoJogo(id: string): Gradiente {
  let soma = 0;
  for (let i = 0; i < id.length; i++) soma = (soma + id.charCodeAt(i)) % 997;
  return PALETAS[soma % PALETAS.length];
}

export function formatarFaixaHoraria(inicioIso: string, fimIso: string): string {
  const inicio = new Date(inicioIso);
  const fim = new Date(fimIso);
  const hora = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${hora(inicio)} às ${hora(fim)}`;
}

export function formatarDiaCurto(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
}

/** "Hoje" / "Amanhã" / dia da semana — usado no resumo curto do checkout. */
export function formatarRotuloDia(iso: string, agora: Date = new Date()): string {
  const alvo = new Date(iso);
  const inicioHoje = new Date(agora);
  inicioHoje.setHours(0, 0, 0, 0);
  const inicioAlvo = new Date(alvo);
  inicioAlvo.setHours(0, 0, 0, 0);
  const diffDias = Math.round((inicioAlvo.getTime() - inicioHoje.getTime()) / 86_400_000);
  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Amanhã';
  const rotulo = alvo.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

export function formatarDiaLongo(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

/** 14 vagas -> "7v7"; ímpar não divide em times iguais, então mostra o total. */
function formatoDoJogo(capacidade: number): string {
  if (capacidade % 2 === 0) return `${capacidade / 2}v${capacidade / 2}`;
  return `${capacidade} jogadores`;
}

function inicialDe(usuarioId: string): string {
  const limpo = usuarioId.replace(/[^A-Za-zÀ-ÿ]/g, '');
  return (limpo[0] ?? usuarioId[0] ?? '?').toUpperCase();
}

export function paraJogoUI(
  jogo: Jogo,
  participacoes: Participacao[],
  usuarioId: string
): JogoUI {
  const ocupadas = participacoes.filter((p) => OCUPAM_VAGA.includes(p.status));
  const minha = participacoes.find(
    (p) => p.usuarioId === usuarioId && ATIVAS.includes(p.status)
  );

  return {
    id: jogo.id,
    title: jogo.titulo,
    host: jogo.organizadorId,
    location: `${jogo.campoId} · ${jogo.quadraId}`,
    tag: jogo.nivel,
    timeRange: formatarFaixaHoraria(jogo.inicio, jogo.fim),
    dataLonga: formatarDiaLongo(jogo.inicio),
    format: formatoDoJogo(jogo.capacidade),
    price: formatarCentavos(jogo.precoVagaCentavos),
    precoVagaCentavos: jogo.precoVagaCentavos,
    going: ocupadas.length,
    total: jogo.capacidade,
    gradient: paletaDoJogo(jogo.id),
    description: descricaoDoJogo(jogo),
    players: ocupadas.map((p) => inicialDe(p.usuarioId)),
    status: jogo.status,
    inicio: jogo.inicio,
    minha,
  };
}

function descricaoDoJogo(jogo: Jogo): string {
  const prazo = new Date(jogo.prazoConfirmacao).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    `Confirma com ${jogo.minimoJogadores} de ${jogo.capacidade} jogadores. ` +
    `Se não bater o mínimo até ${prazo}, o jogo é cancelado e todo mundo recebe de volta.`
  );
}

/** Texto do selo de status na aba Bookings. */
export function rotuloParticipacao(p: Participacao): string {
  switch (p.status) {
    case 'confirmada':
      return 'Pago';
    case 'autorizada':
      return 'Reservado';
    case 'reservada':
      return 'Vaga liberada — pague';
    case 'em_espera':
      return `Fila · ${p.posicaoEspera ?? '?'}º`;
    case 'concluida':
      return 'Jogo realizado';
    case 'reembolsada':
      return 'Reembolsado';
    case 'no_show':
      return 'Faltou';
    default:
      return 'Cancelado';
  }
}

/**
 * Prévia do que o jogador recebe de volta ao cancelar. Espelha as faixas de
 * src/domain/cancelamento.ts só pra montar o texto — quem decide de verdade é
 * o backend, que recalcula no POST /participacoes/:id/cancelar.
 */
export function previsaoReembolso(inicioIso: string, agora: Date = new Date()): string {
  const horasAntes = (new Date(inicioIso).getTime() - agora.getTime()) / 3_600_000;
  if (horasAntes >= 24) return 'Faltam mais de 24h: reembolso integral, taxa incluída.';
  if (horasAntes >= 6) {
    return 'Entre 6h e 24h: 50% de volta no cartão, ou 100% em crédito na plataforma.';
  }
  return 'Menos de 6h para o jogo: sem reembolso — só se alguém da fila assumir sua vaga.';
}

/** Minutos restantes da janela de pagamento de uma reserva promovida. */
export function minutosRestantes(expiraIso: string, agora: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(expiraIso).getTime() - agora.getTime()) / 60_000));
}

/** Só quem ainda tem vaga (ou fila) pode cancelar. */
export function podeCancelar(p: Participacao): boolean {
  return ['reservada', 'autorizada', 'confirmada', 'em_espera'].includes(p.status);
}
