import { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

export function Campo({
  rotulo,
  dica,
  erro,
  children,
}: {
  rotulo: string;
  dica?: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      {children}
      {erro ? (
        <Text style={styles.erro}>{erro}</Text>
      ) : dica ? (
        <Text style={styles.dica}>{dica}</Text>
      ) : null}
    </View>
  );
}

export function Entrada({ temErro, ...props }: TextInputProps & { temErro?: boolean }) {
  return (
    <TextInput
      placeholderTextColor="#9ca3af"
      {...props}
      style={[styles.entrada, temErro && styles.entradaErro, props.style]}
    />
  );
}

/** Chips de escolha única. */
export function Chips<T extends string | number>({
  opcoes,
  valor,
  onSelecionar,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onSelecionar: (v: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            onPress={() => onSelecionar(o.valor)}
            style={[styles.chip, ativo && styles.chipAtivo]}
          >
            <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{o.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Botao({
  titulo,
  onPress,
  desabilitado,
  variante = 'primario',
  estilo,
}: {
  titulo: string;
  onPress: () => void;
  desabilitado?: boolean;
  variante?: 'primario' | 'secundario' | 'fantasma';
  estilo?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      style={[
        styles.botao,
        variante === 'secundario' && styles.botaoSecundario,
        variante === 'fantasma' && styles.botaoFantasma,
        desabilitado && styles.botaoDesabilitado,
        estilo,
      ]}
    >
      <Text style={[styles.botaoTexto, variante === 'fantasma' && styles.botaoTextoFantasma]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  campo: { gap: 6 },
  rotulo: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dica: { fontSize: 12, color: '#6b7280' },
  erro: { fontSize: 12, color: '#c0392b' },
  entrada: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  entradaErro: { borderColor: '#c0392b' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipAtivo: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipTexto: { color: '#374151', fontSize: 14 },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
  botao: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  botaoSecundario: { backgroundColor: '#16a34a' },
  botaoFantasma: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1d5db' },
  botaoDesabilitado: { opacity: 0.5 },
  botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 15 },
  botaoTextoFantasma: { color: '#374151' },
});
