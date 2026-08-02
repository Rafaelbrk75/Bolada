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
  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...opcoes?.headers,
    },
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
