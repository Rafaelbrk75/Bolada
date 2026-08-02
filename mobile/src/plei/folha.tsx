import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { cores } from './tema';

/**
 * Folha inferior equivalente ao overlay do protótipo:
 * véu escuro clicável + painel com cantos superiores arredondados e animação slideUp.
 */
export function FolhaInferior({
  visivel,
  aoFechar,
  children,
  estiloPainel,
}: {
  visivel: boolean;
  aoFechar(): void;
  children: React.ReactNode;
  estiloPainel?: ViewStyle;
}) {
  const { height } = useWindowDimensions();
  const deslocamento = useRef(new Animated.Value(height)).current;
  const opacidade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visivel) {
      deslocamento.setValue(height);
      opacidade.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(deslocamento, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacidade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [deslocamento, height, opacidade, visivel]);

  if (!visivel) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={estilos.raiz}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacidade }]}>
          <Pressable style={[StyleSheet.absoluteFill, estilos.veu]} onPress={aoFechar} />
        </Animated.View>
        <Animated.View
          style={[estilos.painel, estiloPainel, { transform: [{ translateY: deslocamento }] }]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, justifyContent: 'flex-end' },
  veu: { backgroundColor: cores.veu },
  painel: {
    backgroundColor: cores.folha,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    overflow: 'hidden',
  },
});
