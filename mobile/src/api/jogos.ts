import { get, post } from './cliente';
import {
  Jogo,
  NovoJogo,
  Participacao,
  RespostaInscricao,
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

export function sugerirPreco(entrada: {
  custoQuadraCentavos: number;
  minimoJogadores: number;
  folgaBps?: number;
}): Promise<{ precoVagaCentavos: number; split: SplitVaga }> {
  return post('/precos/sugestao', entrada);
}
