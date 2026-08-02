/**
 * Implementação em memória das portas de repositório. Serve pra rodar a API
 * sem depender de Postgres ainda — troca por uma implementação real (usando
 * db/schema.sql) sem tocar em src/app nem nas rotas HTTP.
 */

import {
  Credito,
  CreditoRepositorio,
  EventoRegistro,
  EventoRepositorio,
  Jogo,
  JogoRepositorio,
  Participacao,
  ParticipacaoRepositorio,
  Repasse,
  RepasseItem,
  RepasseRepositorio,
  Usuario,
  UsuarioRepositorio,
} from './tipos';

export class JogoRepositorioMemoria implements JogoRepositorio {
  private jogos = new Map<string, Jogo>();

  async criar(jogo: Jogo): Promise<Jogo> {
    this.jogos.set(jogo.id, jogo);
    return jogo;
  }

  async buscarPorId(id: string): Promise<Jogo | null> {
    return this.jogos.get(id) ?? null;
  }

  async listar(filtro?: { status?: string; publico?: boolean }): Promise<Jogo[]> {
    let resultado = [...this.jogos.values()];
    if (filtro?.status) resultado = resultado.filter((j) => j.status === filtro.status);
    if (filtro?.publico !== undefined) resultado = resultado.filter((j) => j.publico === filtro.publico);
    return resultado.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  }

  async atualizar(jogo: Jogo): Promise<Jogo> {
    if (!this.jogos.has(jogo.id)) throw new Error(`jogo ${jogo.id} não existe`);
    this.jogos.set(jogo.id, jogo);
    return jogo;
  }
}

export class ParticipacaoRepositorioMemoria implements ParticipacaoRepositorio {
  private participacoes = new Map<string, Participacao>();

  async criar(p: Participacao): Promise<Participacao> {
    this.participacoes.set(p.id, p);
    return p;
  }

  async buscarPorId(id: string): Promise<Participacao | null> {
    return this.participacoes.get(id) ?? null;
  }

  async listarPorJogo(jogoId: string): Promise<Participacao[]> {
    return [...this.participacoes.values()].filter((p) => p.jogoId === jogoId);
  }

  async buscarPorJogoEUsuario(jogoId: string, usuarioId: string): Promise<Participacao | null> {
    return (
      [...this.participacoes.values()].find(
        (p) => p.jogoId === jogoId && p.usuarioId === usuarioId
      ) ?? null
    );
  }

  async atualizar(p: Participacao): Promise<Participacao> {
    if (!this.participacoes.has(p.id)) throw new Error(`participação ${p.id} não existe`);
    this.participacoes.set(p.id, p);
    return p;
  }
}

export class CreditoRepositorioMemoria implements CreditoRepositorio {
  private creditos: Credito[] = [];

  async criar(c: Credito): Promise<Credito> {
    this.creditos.push(c);
    return c;
  }

  async listarPorUsuario(usuarioId: string): Promise<Credito[]> {
    return this.creditos.filter((c) => c.usuarioId === usuarioId);
  }
}

export class UsuarioRepositorioMemoria implements UsuarioRepositorio {
  private usuarios = new Map<string, Usuario>();

  async obterOuCriar(id: string): Promise<Usuario> {
    let u = this.usuarios.get(id);
    if (!u) {
      u = { id, noShows: 0, jogosRealizados: 0 };
      this.usuarios.set(id, u);
    }
    return u;
  }

  async atualizar(u: Usuario): Promise<Usuario> {
    this.usuarios.set(u.id, u);
    return u;
  }
}

export class RepasseRepositorioMemoria implements RepasseRepositorio {
  private repasses = new Map<string, Repasse>();
  private itens: RepasseItem[] = [];

  async criar(r: Repasse, itens: RepasseItem[]): Promise<Repasse> {
    this.repasses.set(r.id, r);
    this.itens.push(...itens);
    return r;
  }

  async buscarPorId(id: string): Promise<Repasse | null> {
    return this.repasses.get(id) ?? null;
  }

  async listar(filtro?: { quadraId?: string }): Promise<Repasse[]> {
    let resultado = [...this.repasses.values()];
    if (filtro?.quadraId) resultado = resultado.filter((r) => r.quadraId === filtro.quadraId);
    return resultado.sort((a, b) => a.periodoInicio.getTime() - b.periodoInicio.getTime());
  }

  async listarItens(repasseId: string): Promise<RepasseItem[]> {
    return this.itens.filter((i) => i.repasseId === repasseId);
  }

  async atualizar(r: Repasse): Promise<Repasse> {
    if (!this.repasses.has(r.id)) throw new Error(`repasse ${r.id} não existe`);
    this.repasses.set(r.id, r);
    return r;
  }
}

export class EventoRepositorioMemoria implements EventoRepositorio {
  private eventos: EventoRegistro[] = [];
  private proximoId = 1;

  async registrar(e: Omit<EventoRegistro, 'id'>): Promise<EventoRegistro> {
    const registro: EventoRegistro = { ...e, id: this.proximoId++ };
    this.eventos.push(registro);
    return registro;
  }

  async listarPorEntidade(entidadeId: string): Promise<EventoRegistro[]> {
    return this.eventos
      .filter((e) => e.entidadeId === entidadeId)
      .sort((a, b) => a.id - b.id);
  }
}
