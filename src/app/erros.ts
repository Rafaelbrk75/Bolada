/** Erros de aplicação, mapeados pra status HTTP na borda (ver src/http/servidor.ts). */

export class ErroNaoEncontrado extends Error {
  readonly statusCode = 404;
  constructor(entidade: string, id: string) {
    super(`${entidade} ${id} não encontrado(a)`);
  }
}

export class ErroRequisicaoInvalida extends Error {
  readonly statusCode = 400;
}

export class ErroConflito extends Error {
  readonly statusCode = 409;
}
