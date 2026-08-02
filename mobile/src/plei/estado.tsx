import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ErroApi } from '../api/cliente';
import {
  calcularSplit,
  cancelarParticipacao,
  criarJogo,
  inscrever,
  listarJogos,
  listarParticipacoes,
  pagarReserva,
  publicarJogo,
  sugerirPreco,
} from '../api/jogos';
import { Participacao, SplitVaga } from '../types/jogo';
import { lerCentavos } from '../utils/moeda';
import { proximaHoraCheia, somarHoras, somarMinutos } from '../utils/data';
import { AMIGOS_INICIAIS, Amigo, Conversa, PERFIL_INICIAL, Perfil } from './dados';
import { JogoUI, formatarDiaCurto, paraJogoUI } from './adaptador';
import { CAMPO_PADRAO, ORGANIZADOR_PADRAO, QUADRA_PADRAO, USUARIO_ATUAL } from './sessao';

export type Aba = 'discover' | 'bookings' | 'friends' | 'messages' | 'profile';
export type AbaAmigos = 'friends' | 'contacts';
export type AbaMensagens = 'direct' | 'groups';
export type PassoEntrada = null | 'confirm' | 'success';
export type MetodoPagamento = 'cartao' | 'pix';

/** Resultado do join, como o backend devolve em ResultadoInscricao.situacao. */
export interface DesfechoEntrada {
  situacao: 'autorizada' | 'paga' | 'em_espera';
  posicaoEspera?: number;
  jogoConfirmou: boolean;
}

export interface RascunhoJogo {
  titulo: string;
  nivel: string;
  inicio: Date;
  duracaoMinutos: number;
  prazoHorasAntes: number;
  capacidade: string;
  minimo: string;
  preco: string;
  publico: boolean;
  custoQuadra: string;
}

export interface RascunhoPerfil {
  name: string;
  position: string;
  skill: string;
}

const RASCUNHO_JOGO_VAZIO = (): RascunhoJogo => ({
  titulo: '',
  nivel: 'livre',
  inicio: somarHoras(proximaHoraCheia(), 24),
  duracaoMinutos: 90,
  prazoHorasAntes: 6,
  capacidade: '14',
  minimo: '10',
  preco: '',
  publico: true,
  custoQuadra: '',
});

interface Estado {
  aba: Aba;
  carregando: boolean;
  erroCarregamento: string | null;
  jogos: JogoUI[];
  jogosDoDia: JogoUI[];
  reservas: JogoUI[];
  datas: { chave: string; rotulo: string }[];
  indiceData: number;

  jogoAbertoId: string | null;
  passoEntrada: PassoEntrada;
  metodoPagamento: MetodoPagamento;
  splitPrevisto: SplitVaga | null;
  desfechoEntrada: DesfechoEntrada | null;
  enviandoEntrada: boolean;
  erroEntrada: string | null;

  cancelamentoAlvo: JogoUI | null;
  cancelando: boolean;

  criacaoAberta: boolean;
  rascunhoJogo: RascunhoJogo;
  errosCriacao: Record<string, string>;
  mostrarErrosCriacao: boolean;
  splitSugerido: SplitVaga | null;
  criandoJogo: boolean;

  abaAmigos: AbaAmigos;
  abaMensagens: AbaMensagens;
  amigos: Amigo[];
  conversas: Conversa[];
  conversaAtivaId: string | null;
  rascunhoChat: string;

  ajustesAbertos: boolean;
  edicaoAberta: boolean;
  perfil: Perfil;
  rascunhoPerfil: RascunhoPerfil;
  torrada: string | null;
}

interface Acoes {
  setAba(aba: Aba): void;
  setIndiceData(i: number): void;
  setAbaAmigos(a: AbaAmigos): void;
  setAbaMensagens(a: AbaMensagens): void;
  recarregar(): Promise<void>;
  mostrarTorrada(mensagem: string): void;
  fecharSobreposicoes(): void;

  abrirJogo(id: string): void;
  iniciarEntrada(id: string): void;
  setMetodoPagamento(m: MetodoPagamento): void;
  confirmarEntrada(): Promise<void>;
  cancelarEntrada(): void;
  irParaReservas(): void;

  pedirCancelamento(jogo: JogoUI): void;
  confirmarCancelamento(escolha: 'cartao' | 'credito'): Promise<void>;
  fecharCancelamento(): void;
  pagarVagaLiberada(participacao: Participacao, metodo: MetodoPagamento): Promise<void>;

  abrirCriacaoJogo(): void;
  setRascunhoJogo(patch: Partial<RascunhoJogo>): void;
  pedirSugestaoPreco(): Promise<void>;
  enviarNovoJogo(): Promise<void>;

  abrirAjustes(): void;
  abrirEdicaoPerfil(): void;
  setRascunhoPerfil(patch: Partial<RascunhoPerfil>): void;
  salvarPerfil(): void;
  abrirChatComAmigo(amigo: Amigo): void;
  abrirConversa(id: string): void;
  setRascunhoChat(texto: string): void;
  enviarMensagem(): void;
}

const Contexto = createContext<(Estado & Acoes) | null>(null);

export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroApi) {
    const corpo = e.corpo as { erro?: string; message?: string } | undefined;
    return corpo?.erro ?? corpo?.message ?? `erro ${e.status}`;
  }
  return e instanceof Error ? e.message : 'erro desconhecido';
}

function chaveDoDia(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function ProvedorPlei({ children }: { children: React.ReactNode }) {
  const [aba, setAba] = useState<Aba>('discover');
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [jogos, setJogos] = useState<JogoUI[]>([]);
  const [indiceData, setIndiceData] = useState(0);

  const [jogoAbertoId, setJogoAbertoId] = useState<string | null>(null);
  const [passoEntrada, setPassoEntrada] = useState<PassoEntrada>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('cartao');
  const [splitPrevisto, setSplitPrevisto] = useState<SplitVaga | null>(null);
  const [desfechoEntrada, setDesfechoEntrada] = useState<DesfechoEntrada | null>(null);
  const [enviandoEntrada, setEnviandoEntrada] = useState(false);
  const [erroEntrada, setErroEntrada] = useState<string | null>(null);

  const [cancelamentoAlvo, setCancelamentoAlvo] = useState<JogoUI | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const [criacaoAberta, setCriacaoAberta] = useState(false);
  const [rascunhoJogo, definirRascunhoJogo] = useState<RascunhoJogo>(RASCUNHO_JOGO_VAZIO);
  const [mostrarErrosCriacao, setMostrarErrosCriacao] = useState(false);
  const [splitSugerido, setSplitSugerido] = useState<SplitVaga | null>(null);
  const [criandoJogo, setCriandoJogo] = useState(false);

  const [abaAmigos, setAbaAmigos] = useState<AbaAmigos>('friends');
  const [abaMensagens, setAbaMensagens] = useState<AbaMensagens>('direct');
  const [amigos] = useState<Amigo[]>(AMIGOS_INICIAIS);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null);
  const [rascunhoChat, setRascunhoChat] = useState('');

  const [ajustesAbertos, setAjustesAbertos] = useState(false);
  const [edicaoAberta, setEdicaoAberta] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_INICIAL);
  const [rascunhoPerfil, definirRascunhoPerfil] = useState<RascunhoPerfil>({
    name: PERFIL_INICIAL.name,
    position: PERFIL_INICIAL.position,
    skill: PERFIL_INICIAL.skill,
  });
  const [torrada, setTorrada] = useState<string | null>(null);

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    []
  );

  const mostrarTorrada = useCallback((mensagem: string) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setTorrada(mensagem);
    temporizador.current = setTimeout(() => setTorrada(null), 1800);
  }, []);

  // O backend não tem "minhas participações": busca os jogos e, pra cada um,
  // as participações. N+1 aceitável no volume atual; vira um endpoint quando doer.
  const recarregar = useCallback(async () => {
    setErroCarregamento(null);
    try {
      const brutos = await listarJogos();
      const montados = await Promise.all(
        brutos.map(async (jogo) => {
          const participacoes = await listarParticipacoes(jogo.id);
          return paraJogoUI(jogo, participacoes, USUARIO_ATUAL);
        })
      );
      montados.sort((a, b) => a.inicio.localeCompare(b.inicio));
      setJogos(montados);
    } catch (e) {
      setErroCarregamento(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  // Discover só mostra o que aceita inscrição: público e ainda não encerrado.
  const jogosAbertos = useMemo(
    () => jogos.filter((j) => j.status === 'aberto' || j.status === 'confirmado'),
    [jogos]
  );

  const datas = useMemo(() => {
    const vistas = new Map<string, string>();
    for (const jogo of jogosAbertos) {
      const chave = chaveDoDia(jogo.inicio);
      if (!vistas.has(chave)) vistas.set(chave, formatarDiaCurto(jogo.inicio));
    }
    return [...vistas.entries()].map(([chave, rotulo]) => ({ chave, rotulo }));
  }, [jogosAbertos]);

  const jogosDoDia = useMemo(() => {
    const dia = datas[indiceData]?.chave;
    if (!dia) return [];
    return jogosAbertos.filter((j) => chaveDoDia(j.inicio) === dia);
  }, [datas, indiceData, jogosAbertos]);

  const reservas = useMemo(() => jogos.filter((j) => j.minha), [jogos]);

  const errosCriacao = useMemo(() => {
    const e: Record<string, string> = {};
    const capacidade = Number(rascunhoJogo.capacidade);
    const minimo = Number(rascunhoJogo.minimo);
    const preco = lerCentavos(rascunhoJogo.preco);
    if (!rascunhoJogo.titulo.trim()) e.titulo = 'informe um título';
    if (!Number.isInteger(capacidade) || capacidade < 2 || capacidade > 30) {
      e.capacidade = 'capacidade deve ser inteiro entre 2 e 30';
    }
    if (!Number.isInteger(minimo) || minimo <= 0 || minimo > capacidade) {
      e.minimo = 'mínimo deve ser > 0 e <= capacidade';
    }
    if (preco === null) e.preco = 'informe um preço válido';
    return e;
  }, [rascunhoJogo]);

  const fecharSobreposicoes = useCallback(() => {
    setJogoAbertoId(null);
    setPassoEntrada(null);
    setDesfechoEntrada(null);
    setErroEntrada(null);
    setSplitPrevisto(null);
    setAjustesAbertos(false);
    setEdicaoAberta(false);
    setCriacaoAberta(false);
    setConversaAtivaId(null);
    setCancelamentoAlvo(null);
  }, []);

  const iniciarEntrada = useCallback(
    (id: string) => {
      setJogoAbertoId(id);
      setPassoEntrada('confirm');
      setErroEntrada(null);
      setSplitPrevisto(null);
      const jogo = jogos.find((j) => j.id === id);
      if (!jogo) return;
      // Preço da vaga + taxa do jogador: o total só aparece depois desta conta.
      calcularSplit(jogo.precoVagaCentavos)
        .then(setSplitPrevisto)
        .catch(() => setSplitPrevisto(null));
    },
    [jogos]
  );

  const confirmarEntrada = useCallback(async () => {
    if (!jogoAbertoId) return;
    setEnviandoEntrada(true);
    setErroEntrada(null);
    try {
      const resposta = await inscrever(jogoAbertoId, USUARIO_ATUAL, metodoPagamento);
      setDesfechoEntrada({
        situacao: resposta.resultado.situacao,
        posicaoEspera: resposta.participacao.posicaoEspera,
        jogoConfirmou: resposta.resultado.jogoConfirmou,
      });
      setPassoEntrada('success');
      await recarregar();
    } catch (e) {
      setErroEntrada(mensagemDeErro(e));
    } finally {
      setEnviandoEntrada(false);
    }
  }, [jogoAbertoId, metodoPagamento, recarregar]);

  const confirmarCancelamento = useCallback(
    async (escolha: 'cartao' | 'credito') => {
      const participacao = cancelamentoAlvo?.minha;
      if (!participacao) return;
      setCancelando(true);
      try {
        const resposta = await cancelarParticipacao(participacao.id, escolha);
        const devolvido =
          (resposta.participacao.valorReembolsadoCentavos ?? 0) +
          (resposta.participacao.valorCreditadoCentavos ?? 0);
        setCancelamentoAlvo(null);
        await recarregar();
        // Sem captura não há o que devolver — dizer "sem devolução" soaria como punição.
        if (devolvido > 0) mostrarTorrada('Cancelado com devolução');
        else if (participacao.capturado) mostrarTorrada('Cancelado sem devolução');
        else mostrarTorrada('Cancelado — nada foi cobrado');
      } catch (e) {
        mostrarTorrada(mensagemDeErro(e));
      } finally {
        setCancelando(false);
      }
    },
    [cancelamentoAlvo, mostrarTorrada, recarregar]
  );

  const pagarVagaLiberada = useCallback(
    async (participacao: Participacao, metodo: MetodoPagamento) => {
      try {
        await pagarReserva(participacao.id, metodo);
        await recarregar();
        mostrarTorrada('Vaga garantida');
      } catch (e) {
        mostrarTorrada(mensagemDeErro(e));
      }
    },
    [mostrarTorrada, recarregar]
  );

  const pedirSugestaoPreco = useCallback(async () => {
    const custo = lerCentavos(rascunhoJogo.custoQuadra);
    const minimo = Number(rascunhoJogo.minimo);
    if (custo === null || !Number.isInteger(minimo) || minimo <= 0) {
      mostrarTorrada('Preencha custo da quadra e mínimo de jogadores');
      return;
    }
    try {
      const sugestao = await sugerirPreco({ custoQuadraCentavos: custo, minimoJogadores: minimo });
      definirRascunhoJogo((atual) => ({
        ...atual,
        preco: (sugestao.precoVagaCentavos / 100).toFixed(2).replace('.', ','),
      }));
      setSplitSugerido(sugestao.split);
    } catch (e) {
      mostrarTorrada(mensagemDeErro(e));
    }
  }, [mostrarTorrada, rascunhoJogo.custoQuadra, rascunhoJogo.minimo]);

  const enviarNovoJogo = useCallback(async () => {
    setMostrarErrosCriacao(true);
    const preco = lerCentavos(rascunhoJogo.preco);
    if (Object.keys(errosCriacao).length > 0 || preco === null) return;

    const fim = somarMinutos(rascunhoJogo.inicio, rascunhoJogo.duracaoMinutos);
    const prazo = somarHoras(rascunhoJogo.inicio, -rascunhoJogo.prazoHorasAntes);

    setCriandoJogo(true);
    try {
      const jogo = await criarJogo({
        campoId: CAMPO_PADRAO,
        quadraId: QUADRA_PADRAO,
        organizadorId: ORGANIZADOR_PADRAO,
        titulo: rascunhoJogo.titulo.trim(),
        nivel: rascunhoJogo.nivel,
        inicio: rascunhoJogo.inicio.toISOString(),
        fim: fim.toISOString(),
        capacidade: Number(rascunhoJogo.capacidade),
        minimoJogadores: Number(rascunhoJogo.minimo),
        prazoConfirmacao: prazo.toISOString(),
        precoVagaCentavos: preco,
        publico: rascunhoJogo.publico,
      });
      // Nasce 'rascunho': sem publicar, não aparece pra ninguém.
      await publicarJogo(jogo.id);
      setCriacaoAberta(false);
      setMostrarErrosCriacao(false);
      setSplitSugerido(null);
      definirRascunhoJogo(RASCUNHO_JOGO_VAZIO());
      await recarregar();
      setIndiceData(0);
      mostrarTorrada('Jogo publicado!');
    } catch (e) {
      mostrarTorrada(mensagemDeErro(e));
    } finally {
      setCriandoJogo(false);
    }
  }, [errosCriacao, mostrarTorrada, rascunhoJogo, recarregar]);

  const abrirChatComAmigo = useCallback(
    (amigo: Amigo) => {
      const existente = conversas.find((c) => c.friendId === amigo.id);
      if (existente) {
        setConversaAtivaId(existente.id);
        return;
      }
      const nova: Conversa = {
        id: `c-${amigo.id}`,
        friendId: amigo.id,
        name: amigo.name,
        initial: amigo.initial,
        lastText: '',
        messages: [],
      };
      setConversas((atuais) => [...atuais, nova]);
      setConversaAtivaId(nova.id);
    },
    [conversas]
  );

  const enviarMensagem = useCallback(() => {
    const texto = rascunhoChat.trim();
    if (!texto) return;
    setConversas((atuais) =>
      atuais.map((c) =>
        c.id === conversaAtivaId
          ? {
              ...c,
              lastText: texto,
              messages: [...c.messages, { from: 'me' as const, text: texto }],
            }
          : c
      )
    );
    setRascunhoChat('');
  }, [conversaAtivaId, rascunhoChat]);

  const valor = useMemo<Estado & Acoes>(
    () => ({
      aba,
      carregando,
      erroCarregamento,
      jogos,
      jogosDoDia,
      reservas,
      datas,
      indiceData,

      jogoAbertoId,
      passoEntrada,
      metodoPagamento,
      splitPrevisto,
      desfechoEntrada,
      enviandoEntrada,
      erroEntrada,

      cancelamentoAlvo,
      cancelando,

      criacaoAberta,
      rascunhoJogo,
      errosCriacao,
      mostrarErrosCriacao,
      splitSugerido,
      criandoJogo,

      abaAmigos,
      abaMensagens,
      amigos,
      conversas,
      conversaAtivaId,
      rascunhoChat,

      ajustesAbertos,
      edicaoAberta,
      perfil,
      rascunhoPerfil,
      torrada,

      setAba,
      setIndiceData,
      setAbaAmigos,
      setAbaMensagens,
      recarregar,
      mostrarTorrada,
      fecharSobreposicoes,

      abrirJogo: (id) => setJogoAbertoId(id),
      iniciarEntrada,
      setMetodoPagamento,
      confirmarEntrada,
      cancelarEntrada: () => {
        setPassoEntrada(null);
        setErroEntrada(null);
      },
      irParaReservas: () => {
        setAba('bookings');
        fecharSobreposicoes();
      },

      pedirCancelamento: (jogo) => setCancelamentoAlvo(jogo),
      confirmarCancelamento,
      fecharCancelamento: () => setCancelamentoAlvo(null),
      pagarVagaLiberada,

      abrirCriacaoJogo: () => setCriacaoAberta(true),
      setRascunhoJogo: (patch) => {
        definirRascunhoJogo((atual) => ({ ...atual, ...patch }));
        if ('preco' in patch) setSplitSugerido(null);
      },
      pedirSugestaoPreco,
      enviarNovoJogo,

      abrirAjustes: () => setAjustesAbertos(true),
      abrirEdicaoPerfil: () => {
        definirRascunhoPerfil({
          name: perfil.name,
          position: perfil.position,
          skill: perfil.skill,
        });
        setEdicaoAberta(true);
      },
      setRascunhoPerfil: (patch) => definirRascunhoPerfil((atual) => ({ ...atual, ...patch })),
      salvarPerfil: () => {
        setPerfil((atual) => ({
          ...atual,
          name: rascunhoPerfil.name || atual.name,
          position: rascunhoPerfil.position || atual.position,
          skill: rascunhoPerfil.skill,
          progress: Math.min(7, atual.progress + 1),
        }));
        setEdicaoAberta(false);
        mostrarTorrada('Perfil atualizado');
      },
      abrirChatComAmigo,
      abrirConversa: (id) => setConversaAtivaId(id),
      setRascunhoChat,
      enviarMensagem,
    }),
    [
      aba,
      abaAmigos,
      abaMensagens,
      abrirChatComAmigo,
      ajustesAbertos,
      amigos,
      cancelamentoAlvo,
      cancelando,
      carregando,
      confirmarCancelamento,
      confirmarEntrada,
      conversaAtivaId,
      conversas,
      criacaoAberta,
      criandoJogo,
      datas,
      desfechoEntrada,
      edicaoAberta,
      enviandoEntrada,
      enviarMensagem,
      enviarNovoJogo,
      erroCarregamento,
      erroEntrada,
      errosCriacao,
      fecharSobreposicoes,
      indiceData,
      iniciarEntrada,
      jogoAbertoId,
      jogos,
      jogosDoDia,
      metodoPagamento,
      mostrarErrosCriacao,
      mostrarTorrada,
      pagarVagaLiberada,
      passoEntrada,
      pedirSugestaoPreco,
      perfil,
      rascunhoChat,
      rascunhoJogo,
      rascunhoPerfil,
      recarregar,
      reservas,
      splitPrevisto,
      splitSugerido,
      torrada,
    ]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePlei() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('usePlei precisa estar dentro de <ProvedorPlei>');
  return contexto;
}

/** Jogo atualmente aberto em folha (detalhe / confirmação / sucesso). */
export function useJogoAberto(): JogoUI | null {
  const { jogos, jogoAbertoId } = usePlei();
  return jogos.find((j) => j.id === jogoAbertoId) ?? null;
}
