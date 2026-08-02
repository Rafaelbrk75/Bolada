import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Os paths são os mesmos SVGs inline do protótipo.

interface Props {
  size?: number;
  color?: string;
}

export function IconeSino({ size = 21, color = '#fff' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a6 6 0 00-6 6v3.5L4 15v1h16v-1l-2-3.5V8a6 6 0 00-6-6z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M9.5 19a2.5 2.5 0 005 0" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function IconeLupa({ size = 21, color = '#fff' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <Path d="M21 21l-4-4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function IconeFiltro({ size = 17, color = '#4ADE9A' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16M8 12h12M11 18h9" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={6} cy={12} r={2} fill={color} />
      <Circle cx={9} cy={18} r={2} fill={color} />
    </Svg>
  );
}

export function IconeLocal({ size = 11, color = 'rgba(255,255,255,0.6)' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s7-7.3 7-12.5A7 7 0 105 9.5C5 14.7 12 22 12 22z" stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={9.5} r={2.3} fill={color} />
    </Svg>
  );
}

export function IconeMais({ size = 20, color = '#062a1a' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function IconeAgenda({ size = 21, color = '#fff' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={16} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M3 9h18M8 3v4M16 3v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path
        d="M8.5 14l2 2 4-4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconeAmigos({ size = 21, color = '#fff' }: Props) {
  return (
    <Svg width={size * (23 / 21)} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3.2} stroke={color} strokeWidth={1.8} />
      <Path
        d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={17} cy={9} r={2.6} stroke={color} strokeWidth={1.6} />
      <Path d="M15 20c.2-2.8 2-4.8 4.5-4.8" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function IconeBalao({ size = 21, color = '#fff', strokeWidth = 1.7 }: Props & { strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 4H4v13l3-3h13V4z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconeBalaoVazio({ size = 70, color = '#BFF3DA' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 4H4v13l3-3h13V4z" stroke={color} strokeWidth={1.4} />
      <Circle cx={9} cy={10} r={1} fill={color} />
      <Circle cx={12} cy={10} r={1} fill={color} />
      <Circle cx={15} cy={10} r={1} fill={color} />
    </Svg>
  );
}

export function IconeEngrenagem({ size = 21, color = '#fff' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.6} />
      <Path
        d="M19.4 13.5a7.9 7.9 0 000-3l2-1.5-2-3.4-2.3.8a8 8 0 00-2.6-1.5L14 2h-4l-.5 2.4a8 8 0 00-2.6 1.5l-2.3-.8-2 3.4 2 1.5a7.9 7.9 0 000 3l-2 1.5 2 3.4 2.3-.8a8 8 0 002.6 1.5L10 22h4l.5-2.4a8 8 0 002.6-1.5l2.3.8 2-3.4-2-1.5z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconeLapis({ size = 19, color = '#fff' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h4l11-11-4-4L4 16v4z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconeVoltar({ size = 16, color = '#fff' }: Props) {
  return (
    <Svg width={(size * 10) / 16} height={size} viewBox="0 0 10 16" fill="none">
      <Path d="M8 1L2 8l6 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconeAvancar({ size = 12, color = 'rgba(255,255,255,0.35)' }: Props) {
  return (
    <Svg width={(size * 7) / 12} height={size} viewBox="0 0 7 12" fill="none">
      <Path d="M1 1l5 5-5 5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconeCheck({ size = 28, color = '#4ADE9A' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l5 5L20 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconeEnviar({ size = 16, color = '#062a1a' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 20l18-8L3 4v6l12 2-12 2v6z" fill={color} />
    </Svg>
  );
}

export function IconeFechar({ size = 18, color = '#fff' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function IconeRelogio({ size = 18, color = '#4ADE9A' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.6} />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function IconeMenos({ size = 16, color = '#fff' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function IconeNovoGrupo({ size = 26, color = '#4ADE9A' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5a2 2 0 012-2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" stroke={color} strokeWidth={1.6} />
      <Path d="M12 10v6M9 13h6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
