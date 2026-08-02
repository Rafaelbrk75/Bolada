import { Platform } from 'react-native';

// Emulador Android usa 10.0.2.2 pra chegar no localhost da máquina host.
// iOS simulator e web enxergam localhost direto.
// Celular físico precisa do IP da máquina na rede local (definir EXPO_PUBLIC_API_URL).
const HOST_PADRAO = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${HOST_PADRAO}:3000`;
