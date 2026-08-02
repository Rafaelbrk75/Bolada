// Tokens extraídos do protótipo "Plei App.dc.html" (Claude Design).
// Os valores são os literais usados no protótipo, sem reinterpretação.

export const cores = {
  menta: '#4ADE9A',
  mentaClara: '#7CF0BE',
  sobreMenta: '#062a1a',

  fundoTopo: '#0f3d2c',
  fundoMeio: '#0a2c20',
  fundoBase: '#081f16',

  folha: '#0d3225',
  barraAbas: 'rgba(6,20,14,0.95)',
  faixaPerfil: 'rgba(8,25,18,0.9)',

  texto: '#ffffff',
  textoSuave: 'rgba(255,255,255,0.6)',
  textoFraco: 'rgba(255,255,255,0.5)',
  textoTenue: 'rgba(255,255,255,0.55)',

  linha: 'rgba(255,255,255,0.1)',
  linhaFraca: 'rgba(255,255,255,0.06)',
  borda: 'rgba(255,255,255,0.12)',
  bordaCampo: 'rgba(255,255,255,0.15)',
  preenchimento: 'rgba(255,255,255,0.06)',
  preenchimentoCartao: 'rgba(255,255,255,0.02)',

  avatarFundo: '#E9FBF2',
  avatarTexto: '#0a2c20',
  avatarMenta: 'rgba(74,222,154,0.18)',

  vagas: '#FFD166',
  alerta: '#FF5A5A',
  perigo: '#FF6B6B',
  erro: '#FF8A8A',

  veu: 'rgba(0,0,0,0.55)',
  torrada: 'rgba(20,20,20,0.92)',
};

// linear-gradient(180deg, ...) do container principal.
export const gradienteFundo = {
  colors: [cores.fundoTopo, cores.fundoMeio, cores.fundoBase] as const,
  locations: [0, 0.45, 1] as const,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
};

// linear-gradient(160deg, ...) — direção CSS convertida para o par start/end
// do expo-linear-gradient: d = (sin160°, -cos160°) = (0.342, 0.940).
export const direcao160 = {
  start: { x: 0.33, y: 0.03 },
  end: { x: 0.67, y: 0.97 },
};
