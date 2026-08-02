import { API_URL } from './config';

export class ErroApi extends Error {
  constructor(
    public status: number,
    public corpo: unknown
  ) {
    super(`erro API ${status}`);
  }
}

async function requisitar<T>(caminho: string, opcoes?: RequestInit): Promise<T> {
  // Só declara JSON quando existe corpo: o Fastify recusa com 400
  // "Body cannot be empty when content-type is set to 'application/json'"
  // em rotas de ação sem body (publicar, checkin, expirar-reserva).
  const cabecalhos: Record<string, string> = { ...(opcoes?.headers as Record<string, string>) };
  if (opcoes?.body !== undefined) cabecalhos['Content-Type'] = 'application/json';

  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: cabecalhos,
  });

  const texto = await resposta.text();
  const corpo = texto ? JSON.parse(texto) : undefined;

  if (!resposta.ok) {
    throw new ErroApi(resposta.status, corpo);
  }

  return corpo as T;
}

export function get<T>(caminho: string): Promise<T> {
  return requisitar<T>(caminho);
}

export function post<T>(caminho: string, dados?: unknown): Promise<T> {
  return requisitar<T>(caminho, {
    method: 'POST',
    body: dados === undefined ? undefined : JSON.stringify(dados),
  });
}
