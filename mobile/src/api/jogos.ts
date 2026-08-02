import { get, post } from './cliente';
import {
  Jogo,
  NovoJogo,
  Participacao,
  RespostaCancelamento,
  RespostaInscricao,
  RespostaPagarReserva,
  SplitVaga,
  StatusJogo,
} from '../types/jogo';

export function listarJogos(params?: { status?: StatusJogo; publico?: boolean }): Promise<Jogo[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.publico !== undefined) query.set('publico', String(params.publico));
  const sufixo = query.toString() ? `?${query.toString()}` : '';
  return get<Jogo[]>(`/jogos${sufixo}`);
}

export function obterJogo(id: string): Promise<Jogo> {
  return get<Jogo>(`/jogos/${id}`);
}

export function listarParticipacoes(jogoId: string): Promise<Participacao[]> {
  return get<Participacao[]>(`/jogos/${jogoId}/participacoes`);
}

export function inscrever(
  jogoId: string,
  usuarioId: string,
  metodo: 'cartao' | 'pix'
): Promise<RespostaInscricao> {
  return post<RespostaInscricao>(`/jogos/${jogoId}/inscricoes`, { usuarioId, metodo });
}

export function criarJogo(dados: NovoJogo): Promise<Jogo> {
  return post<Jogo>('/jogos', dados);
}

/** Jogo nasce em 'rascunho'; só aparece na lista pública depois de publicar. */
export function publicarJogo(id: string): Promise<Jogo> {
  return post<Jogo>(`/jogos/${id}/publicar`);
}

/** Cancelamento pelo jogador. A faixa de reembolso é decidida no backend. */
export function cancelarParticipacao(
  participacaoId: string,
  escolha: 'cartao' | 'credito' = 'cartao'
): Promise<RespostaCancelamento> {
  return post<RespostaCancelamento>(`/participacoes/${participacaoId}/cancelar`, { escolha });
}

/** Promovido da waitlist tem 10 min pra pagar; depois disso a vaga passa adiante. */
export function pagarReserva(
  participacaoId: string,
  metodo: 'cartao' | 'pix'
): Promise<RespostaPagarReserva> {
  return post<RespostaPagarReserva>(`/participacoes/${participacaoId}/pagar-reserva`, { metodo });
}

/** Preço da vaga -> preço + taxa do jogador + total cobrado. */
export function calcularSplit(precoVagaCentavos: number): Promise<SplitVaga> {
  return post<SplitVaga>('/precos/split', { precoVagaCentavos });
}

export function sugerirPreco(entrada: {
  custoQuadraCentavos: number;
  minimoJogadores: number;
  folgaBps?: number;
}): Promise<{ precoVagaCentavos: number; split: SplitVaga }> {
  return post('/precos/sugestao', entrada);
}
