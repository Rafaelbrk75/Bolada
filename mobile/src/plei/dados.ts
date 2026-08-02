// Sementes locais do protótipo. Jogos e participações vêm do backend
// (ver adaptador.ts); o que sobrou aqui é o que ainda não tem API:
// amigos, conversas, perfil e itens de ajustes.

export interface Gradiente {
  colors: string[];
  locations: number[];
}

export interface Amigo {
  id: string;
  name: string;
  initial: string;
  mutual: string;
}

export interface Mensagem {
  from: 'me' | 'them';
  text: string;
}

export interface Conversa {
  id: string;
  friendId: string;
  name: string;
  initial: string;
  lastText: string;
  messages: Mensagem[];
}

export interface ItemAjustes {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  toast: string;
}

export interface Perfil {
  initial: string;
  name: string;
  flag: string;
  country: string;
  position: string;
  skill: string;
  games: number;
  facilities: number;
  hours: string;
  /** 0..7 — alimenta a barra "Complete seu perfil". */
  progress: number;
}

/** Níveis do perfil (campo livre, sem validação no backend). */
export const NIVEIS = ['Iniciante', 'Intermediário', 'Avançado'] as const;

/** Níveis aceitos no cadastro de jogo — mesmos valores da tela antiga. */
export const NIVEIS_JOGO = [
  { valor: 'livre', rotulo: 'Livre' },
  { valor: 'iniciante', rotulo: 'Iniciante' },
  { valor: 'intermediario', rotulo: 'Intermediário' },
  { valor: 'avancado', rotulo: 'Avançado' },
];

export const DURACOES = [
  { valor: 60, rotulo: '1h' },
  { valor: 90, rotulo: '1h30' },
  { valor: 120, rotulo: '2h' },
];

export const PRAZOS = [
  { valor: 2, rotulo: '2h antes' },
  { valor: 6, rotulo: '6h antes' },
  { valor: 12, rotulo: '12h antes' },
  { valor: 24, rotulo: '24h antes' },
];

export const AMIGOS_INICIAIS: Amigo[] = [
  { id: 'f1', name: 'Alex Rivera', initial: 'A', mutual: '3 jogos em comum' },
  { id: 'f2', name: 'Jamie Chen', initial: 'J', mutual: '1 jogo em comum' },
  { id: 'f3', name: 'Sam Osei', initial: 'S', mutual: '5 jogos em comum' },
];

export const AJUSTES: ItemAjustes[] = [
  {
    key: 'payments',
    icon: '💳',
    title: 'Pagamentos',
    subtitle: 'Formas de pagamento e cobranças',
    toast: 'Pagamentos em breve',
  },
  {
    key: 'help',
    icon: '❓',
    title: 'Ajuda',
    subtitle: 'Dúvidas, suporte e contato',
    toast: 'Suporte aberto',
  },
  {
    key: 'terms',
    icon: '📄',
    title: 'Termos de uso',
    subtitle: 'Leia os termos do serviço',
    toast: 'Abrindo termos',
  },
  {
    key: 'privacy',
    icon: '🔒',
    title: 'Privacidade',
    subtitle: 'Como tratamos seus dados',
    toast: 'Abrindo política de privacidade',
  },
];

export const PERFIL_INICIAL: Perfil = {
  initial: 'B',
  name: 'Blabla Blabla',
  flag: '🇧🇷',
  country: 'Brasil',
  position: '-',
  skill: 'Intermediário',
  games: 0,
  facilities: 0,
  hours: '0h',
  progress: 5,
};
