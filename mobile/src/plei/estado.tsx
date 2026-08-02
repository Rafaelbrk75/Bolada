import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AMIGOS_INICIAIS,
  Amigo,
  Conversa,
  GRADIENTE_JOGO_NOVO,
  JOGOS_INICIAIS,
  Jogo,
  PERFIL_INICIAL,
  Perfil,
} from './dados';

export type Aba = 'discover' | 'bookings' | 'friends' | 'messages' | 'profile';
export type AbaAmigos = 'friends' | 'contacts';
export type AbaMensagens = 'direct' | 'groups';
export type PassoEntrada = null | 'confirm' | 'success';

export interface RascunhoJogo {
  location: string;
  timeRange: string;
  format: string;
  price: string;
  skill: string;
}

export interface RascunhoPerfil {
  name: string;
  position: string;
  skill: string;
}

interface Estado {
  aba: Aba;
  indiceData: number;
  jogos: Jogo[];
  inscritos: string[];
  jogoAbertoId: string | null;
  passoEntrada: PassoEntrada;
  abaAmigos: AbaAmigos;
  abaMensagens: AbaMensagens;
  amigos: Amigo[];
  conversas: Conversa[];
  conversaAtivaId: string | null;
  rascunhoChat: string;
  ajustesAbertos: boolean;
  edicaoAberta: boolean;
  criacaoAberta: boolean;
  rascunhoJogo: RascunhoJogo;
  erroCriacao: boolean;
  perfil: Perfil;
  rascunhoPerfil: RascunhoPerfil;
  torrada: string | null;
}

interface Acoes {
  setAba(aba: Aba): void;
  setIndiceData(i: number): void;
  setAbaAmigos(a: AbaAmigos): void;
  setAbaMensagens(a: AbaMensagens): void;
  mostrarTorrada(mensagem: string): void;
  fecharSobreposicoes(): void;
  abrirJogo(id: string): void;
  iniciarEntrada(id: string): void;
  confirmarEntrada(): void;
  cancelarEntrada(): void;
  irParaReservas(): void;
  cancelarReserva(id: string): void;
  abrirAjustes(): void;
  abrirEdicaoPerfil(): void;
  setRascunhoPerfil(patch: Partial<RascunhoPerfil>): void;
  salvarPerfil(): void;
  abrirCriacaoJogo(): void;
  setRascunhoJogo(patch: Partial<RascunhoJogo>): void;
  publicarJogo(): void;
  abrirChatComAmigo(amigo: Amigo): void;
  abrirConversa(id: string): void;
  setRascunhoChat(texto: string): void;
  enviarMensagem(): void;
}

const RASCUNHO_JOGO_VAZIO: RascunhoJogo = {
  location: '',
  timeRange: '',
  format: '',
  price: '',
  skill: 'Intermediate',
};

const Contexto = createContext<(Estado & Acoes) | null>(null);

export function ProvedorPlei({ children }: { children: React.ReactNode }) {
  const [aba, setAba] = useState<Aba>('discover');
  const [indiceData, setIndiceData] = useState(0);
  const [jogos, setJogos] = useState<Jogo[]>(JOGOS_INICIAIS);
  const [inscritos, setInscritos] = useState<string[]>([]);
  const [jogoAbertoId, setJogoAbertoId] = useState<string | null>(null);
  const [passoEntrada, setPassoEntrada] = useState<PassoEntrada>(null);
  const [abaAmigos, setAbaAmigos] = useState<AbaAmigos>('friends');
  const [abaMensagens, setAbaMensagens] = useState<AbaMensagens>('direct');
  const [amigos] = useState<Amigo[]>(AMIGOS_INICIAIS);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null);
  const [rascunhoChat, setRascunhoChat] = useState('');
  const [ajustesAbertos, setAjustesAbertos] = useState(false);
  const [edicaoAberta, setEdicaoAberta] = useState(false);
  const [criacaoAberta, setCriacaoAberta] = useState(false);
  const [rascunhoJogo, definirRascunhoJogo] = useState<RascunhoJogo>(RASCUNHO_JOGO_VAZIO);
  const [erroCriacao, setErroCriacao] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_INICIAL);
  const [rascunhoPerfil, definirRascunhoPerfil] = useState<RascunhoPerfil>({
    name: PERFIL_INICIAL.name,
    position: PERFIL_INICIAL.position,
    skill: PERFIL_INICIAL.skill,
  });
  const [torrada, setTorrada] = useState<string | null>(null);

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  const mostrarTorrada = useCallback((mensagem: string) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setTorrada(mensagem);
    temporizador.current = setTimeout(() => setTorrada(null), 1800);
  }, []);

  const fecharSobreposicoes = useCallback(() => {
    setJogoAbertoId(null);
    setPassoEntrada(null);
    setAjustesAbertos(false);
    setEdicaoAberta(false);
    setCriacaoAberta(false);
    setConversaAtivaId(null);
  }, []);

  const confirmarEntrada = useCallback(() => {
    setJogos((atuais) =>
      atuais.map((g) => (g.id === jogoAbertoId ? { ...g, going: g.going + 1 } : g))
    );
    if (jogoAbertoId) setInscritos((atuais) => [...atuais, jogoAbertoId]);
    setPassoEntrada('success');
  }, [jogoAbertoId]);

  const publicarJogo = useCallback(() => {
    if (!rascunhoJogo.location.trim() || !rascunhoJogo.timeRange.trim()) {
      setErroCriacao(true);
      return;
    }
    const novo: Jogo = {
      id: `g${jogos.length + 1}-${Date.now()}`,
      title: rascunhoJogo.location,
      host: perfil.name,
      location: rascunhoJogo.location,
      tag: rascunhoJogo.skill,
      timeRange: rascunhoJogo.timeRange,
      format: rascunhoJogo.format || 'Open',
      price: rascunhoJogo.price || 'Free',
      going: 0,
      total: 12,
      gradient: GRADIENTE_JOGO_NOVO,
      description: 'A new pickup game just created — be the first to join!',
      players: [],
    };
    setJogos((atuais) => [novo, ...atuais]);
    setCriacaoAberta(false);
    setErroCriacao(false);
    definirRascunhoJogo(RASCUNHO_JOGO_VAZIO);
    setIndiceData(0);
    mostrarTorrada('Game created!');
  }, [jogos.length, mostrarTorrada, perfil.name, rascunhoJogo]);

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
          ? { ...c, lastText: texto, messages: [...c.messages, { from: 'me' as const, text: texto }] }
          : c
      )
    );
    setRascunhoChat('');
  }, [conversaAtivaId, rascunhoChat]);

  const valor = useMemo<Estado & Acoes>(
    () => ({
      aba,
      indiceData,
      jogos,
      inscritos,
      jogoAbertoId,
      passoEntrada,
      abaAmigos,
      abaMensagens,
      amigos,
      conversas,
      conversaAtivaId,
      rascunhoChat,
      ajustesAbertos,
      edicaoAberta,
      criacaoAberta,
      rascunhoJogo,
      erroCriacao,
      perfil,
      rascunhoPerfil,
      torrada,

      setAba,
      setIndiceData,
      setAbaAmigos,
      setAbaMensagens,
      mostrarTorrada,
      fecharSobreposicoes,
      abrirJogo: (id) => setJogoAbertoId(id),
      iniciarEntrada: (id) => {
        setJogoAbertoId(id);
        setPassoEntrada('confirm');
      },
      confirmarEntrada,
      cancelarEntrada: () => setPassoEntrada(null),
      irParaReservas: () => {
        setAba('bookings');
        setJogoAbertoId(null);
        setPassoEntrada(null);
      },
      cancelarReserva: (id) => {
        setInscritos((atuais) => atuais.filter((i) => i !== id));
        mostrarTorrada('Booking cancelled');
      },
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
        mostrarTorrada('Profile updated');
      },
      abrirCriacaoJogo: () => setCriacaoAberta(true),
      setRascunhoJogo: (patch) => definirRascunhoJogo((atual) => ({ ...atual, ...patch })),
      publicarJogo,
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
      conversaAtivaId,
      conversas,
      confirmarEntrada,
      criacaoAberta,
      edicaoAberta,
      enviarMensagem,
      erroCriacao,
      fecharSobreposicoes,
      indiceData,
      inscritos,
      jogoAbertoId,
      jogos,
      mostrarTorrada,
      passoEntrada,
      perfil,
      publicarJogo,
      rascunhoChat,
      rascunhoJogo,
      rascunhoPerfil,
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

/** Sobreposição visível = qualquer folha inferior aberta (overlayVisible do protótipo). */
export function useSobreposicaoVisivel() {
  const s = usePlei();
  return (
    (!!s.jogoAbertoId && !s.passoEntrada) ||
    s.passoEntrada === 'confirm' ||
    s.passoEntrada === 'success' ||
    s.ajustesAbertos ||
    s.edicaoAberta ||
    s.criacaoAberta ||
    !!s.conversaAtivaId
  );
}
