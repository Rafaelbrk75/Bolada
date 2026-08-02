// Sementes do protótipo (GAMES_SEED / FRIENDS_SEED / SETTINGS_SEED).
// Os nomes dos campos são os mesmos do arquivo de design, pra facilitar comparar.

export interface Gradiente {
  colors: string[];
  locations: number[];
}

export interface Jogo {
  id: string;
  title: string;
  host: string;
  location: string;
  tag: string;
  timeRange: string;
  format: string;
  price: string;
  going: number;
  total: number;
  gradient: Gradiente;
  description: string;
  players: string[];
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
  /** 0..7 — alimenta a barra "You're almost there!". */
  progress: number;
}

export const NIVEIS = ['Beginner', 'Intermediate', 'Advanced'] as const;

export const DATAS = ['Sat 18', 'Sun 19', 'Mon 20', 'Tue 21', 'Wed 22'];

export const JOGOS_INICIAIS: Jogo[] = [
  {
    id: 'g1',
    title: 'Bushwick Inlet 9v9',
    host: 'Brooklyn Pickup Soccer',
    location: 'Bushwick Inlet Park | BPSC',
    tag: 'Intermediate',
    timeRange: '12:00 PM to 1:30 PM',
    format: '9v9',
    price: '$12.65',
    going: 0,
    total: 18,
    gradient: {
      colors: ['#e8925a', '#7a8f7a', '#2f5c46', '#173a2b'],
      locations: [0, 0.4, 0.75, 1],
    },
    description:
      'A relaxed weekend pickup match on the waterfront turf. All levels welcome, bring both light and dark shirts.',
    players: ['J', 'M', 'A'],
  },
  {
    id: 'g2',
    title: 'McCarren Turf 7v7',
    host: 'Greenpoint Ballers',
    location: 'McCarren Park Track & Field',
    tag: 'Advanced',
    timeRange: '6:00 PM to 7:00 PM',
    format: '7v7',
    price: '$15.00',
    going: 4,
    total: 14,
    gradient: {
      colors: ['#1c2b22', '#245c3d', '#3fae6d'],
      locations: [0, 0.45, 1],
    },
    description:
      'Fast-paced competitive run under the lights. Cleats required, no metal studs on the turf.',
    players: ['R', 'K', 'S', 'D'],
  },
  {
    id: 'g3',
    title: 'Sunset Park 5v5',
    host: 'NYC Weekend League',
    location: 'Sunset Park Fieldhouse',
    tag: 'Beginner',
    timeRange: '9:00 AM to 10:00 AM',
    format: '5v5',
    price: '$8.00',
    going: 8,
    total: 10,
    gradient: {
      colors: ['#f2c46a', '#7fae6a', '#1f4a34'],
      locations: [0, 0.45, 1],
    },
    description:
      'Friendly small-sided game, great for first-timers looking to meet other players in the neighborhood.',
    players: ['B', 'L', 'T', 'N', 'C', 'W', 'P', 'H'],
  },
];

export const GRADIENTE_JOGO_NOVO: Gradiente = {
  colors: ['#3a6b4d', '#1c3f2c'],
  locations: [0, 1],
};

export const AMIGOS_INICIAIS: Amigo[] = [
  { id: 'f1', name: 'Alex Rivera', initial: 'A', mutual: '3 mutual games' },
  { id: 'f2', name: 'Jamie Chen', initial: 'J', mutual: '1 mutual game' },
  { id: 'f3', name: 'Sam Osei', initial: 'S', mutual: '5 mutual games' },
];

export const AJUSTES: ItemAjustes[] = [
  {
    key: 'payments',
    icon: '💳',
    title: 'Payments',
    subtitle: 'Manage payment methods and billing',
    toast: 'Payments coming soon',
  },
  {
    key: 'help',
    icon: '❓',
    title: 'Get Help',
    subtitle: 'FAQ, support, and contact us',
    toast: 'Support inbox opened',
  },
  {
    key: 'terms',
    icon: '📄',
    title: 'Terms & Conditions',
    subtitle: 'Read our terms of service',
    toast: 'Opening terms',
  },
  {
    key: 'privacy',
    icon: '🔒',
    title: 'Privacy Policy',
    subtitle: 'How we handle your data',
    toast: 'Opening privacy policy',
  },
];

export const PERFIL_INICIAL: Perfil = {
  initial: 'B',
  name: 'Blabla Blabla',
  flag: '🇺🇸',
  country: 'United States',
  position: '-',
  skill: 'Intermediate',
  games: 0,
  facilities: 0,
  hours: '0h',
  progress: 5,
};
