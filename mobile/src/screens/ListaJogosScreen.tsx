import { useCallback, useLayoutEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { listarJogos } from '../api/jogos';
import { Jogo, StatusJogo } from '../types/jogo';
import { RootStackParamList } from '../navigation/tipos';
import { formatarCentavos } from '../utils/moeda';
import { formatarDataHora } from '../utils/data';

type Props = NativeStackScreenProps<RootStackParamList, 'ListaJogos'>;

const CORES_STATUS: Record<StatusJogo, string> = {
  rascunho: '#9ca3af',
  aberto: '#2563eb',
  confirmado: '#16a34a',
  em_andamento: '#f59e0b',
  realizado: '#6b7280',
  liquidado: '#6b7280',
  cancelado: '#c0392b',
};

export function ListaJogosScreen({ navigation }: Props) {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('CriarJogo')} hitSlop={8}>
          <Text style={styles.acaoHeader}>+ Novo</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      setCarregando(true);
      setErro(null);
      listarJogos({ publico: true })
        .then((dados) => {
          if (ativo) setJogos(dados);
        })
        .catch((e) => {
          if (ativo) setErro(e instanceof Error ? e.message : 'erro desconhecido');
        })
        .finally(() => {
          if (ativo) setCarregando(false);
        });
      return () => {
        ativo = false;
      };
    }, [])
  );

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator />
      </View>
    );
  }

  if (erro) {
    return (
      <View style={styles.centro}>
        <Text style={styles.erro}>{erro}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={jogos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.lista}
      ListEmptyComponent={
        <View style={styles.centro}>
          <Text style={styles.vazio}>Nenhum jogo público ainda.</Text>
          <Text style={styles.vazioDica}>Toque em "+ Novo" para criar o primeiro.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('DetalheJogo', { jogoId: item.id })}
        >
          <View style={styles.cardTopo}>
            <Text style={styles.titulo}>{item.titulo}</Text>
            <View style={[styles.badge, { backgroundColor: CORES_STATUS[item.status] }]}>
              <Text style={styles.badgeTexto}>{item.status.replace('_', ' ')}</Text>
            </View>
          </View>
          <Text style={styles.detalhe}>{formatarDataHora(new Date(item.inicio))}</Text>
          <Text style={styles.detalhe}>
            {formatarCentavos(item.precoVagaCentavos)} · {item.nivel} · até {item.capacidade}{' '}
            jogadores
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 6 },
  erro: { color: '#c0392b' },
  vazio: { fontSize: 16, fontWeight: '600', color: '#374151' },
  vazioDica: { color: '#6b7280' },
  acaoHeader: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  lista: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  cardTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titulo: { fontSize: 16, fontWeight: '600', flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTexto: { color: '#fff', fontSize: 11, fontWeight: '700' },
  detalhe: { color: '#555' },
});
