import React from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { cores, gradienteFundo } from './tema';
import { Aba, ProvedorPlei, usePlei } from './estado';
import { BarraProgresso } from './componentes';
import {
  IconeAgenda,
  IconeAmigos,
  IconeBalao,
  IconeLupa,
  IconeMais,
} from './icones';
import { TelaDiscover } from './telas/Discover';
import { TelaBookings } from './telas/Bookings';
import { TelaFriends } from './telas/Friends';
import { TelaMessages } from './telas/Messages';
import { TelaProfile } from './telas/Profile';
import { Sobreposicoes } from './sobreposicoes';

function Conteudo() {
  const insets = useSafeAreaInsets();
  const {
    aba,
    setAba,
    perfil,
    torrada,
    abrirCriacaoJogo,
    abrirEdicaoPerfil,
    recarregar,
    carregando,
  } = usePlei();

  const mostrarFaixaPerfil = aba === 'discover' && perfil.progress < 7;
  const recarregavel = aba === 'discover' || aba === 'bookings';

  return (
    <LinearGradient
      colors={gradienteFundo.colors as unknown as [string, string, ...string[]]}
      locations={gradienteFundo.locations as unknown as [number, number, ...number[]]}
      start={gradienteFundo.start}
      end={gradienteFundo.end}
      style={estilos.raiz}
    >
      <StatusBar style="light" />

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            recarregavel ? (
              <RefreshControl
                refreshing={carregando}
                onRefresh={() => void recarregar()}
                tintColor={cores.menta}
                colors={[cores.menta]}
              />
            ) : undefined
          }
        >
          {aba === 'discover' && <TelaDiscover topo={insets.top} />}
          {aba === 'bookings' && <TelaBookings topo={insets.top} />}
          {aba === 'friends' && <TelaFriends topo={insets.top} />}
          {aba === 'messages' && <TelaMessages topo={insets.top} />}
          {aba === 'profile' && <TelaProfile topo={insets.top} />}
        </ScrollView>

        {aba === 'discover' && (
          <Pressable onPress={abrirCriacaoJogo} style={estilos.botaoFlutuante}>
            <IconeMais />
          </Pressable>
        )}
      </View>

      {mostrarFaixaPerfil && (
        <View style={estilos.faixaPerfil}>
          <View>
            <Text style={estilos.textoFaixa}>Deixe os jogadores saberem quem é você.</Text>
            <View style={{ marginTop: 8, width: 170 }}>
              <BarraProgresso progresso={perfil.progress} altura={6} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={estilos.contadorFaixa}>{perfil.progress}/7</Text>
            <Pressable onPress={abrirEdicaoPerfil} style={estilos.botaoFaixa}>
              <Text style={estilos.textoBotaoFaixa}>Completar perfil</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={[estilos.barraAbas, { paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
        <ItemAba chave="discover" rotulo="Descubra" ativa={aba} onPress={setAba}>
          {(cor) => <IconeLupa color={cor} />}
        </ItemAba>
        <ItemAba chave="bookings" rotulo="Vagas" ativa={aba} onPress={setAba}>
          {(cor) => <IconeAgenda color={cor} />}
        </ItemAba>
        <ItemAba chave="friends" rotulo="Amigos" ativa={aba} onPress={setAba}>
          {(cor) => <IconeAmigos color={cor} />}
        </ItemAba>
        <ItemAba chave="messages" rotulo="Mensagens" ativa={aba} onPress={setAba}>
          {(cor) => <IconeBalao color={cor} />}
        </ItemAba>
        <ItemAba chave="profile" rotulo="Perfil" ativa={aba} onPress={setAba}>
          {() => (
            <View>
              <View style={estilos.avatarAba}>
                <Text style={estilos.inicialAba}>{perfil.initial}</Text>
              </View>
              <View style={estilos.pontoAviso} />
            </View>
          )}
        </ItemAba>
      </View>

      <Sobreposicoes />

      {/* Modal próprio pra torrada ficar acima das folhas, como o z-index 90 do protótipo. */}
      <Modal transparent visible={!!torrada} animationType="fade" statusBarTranslucent>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[estilos.torrada, { top: insets.top + 26 }]}>
            <Text style={estilos.textoTorrada}>{torrada}</Text>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function ItemAba({
  chave,
  rotulo,
  ativa,
  onPress,
  children,
}: {
  chave: Aba;
  rotulo: string;
  ativa: Aba;
  onPress(aba: Aba): void;
  children(cor: string): React.ReactNode;
}) {
  const cor = ativa === chave ? cores.menta : cores.textoFraco;
  return (
    <Pressable onPress={() => onPress(chave)} style={estilos.itemAba}>
      {children(cor)}
      <Text style={[estilos.rotuloAba, { color: cor }]}>{rotulo}</Text>
    </Pressable>
  );
}

export function PleiApp() {
  return (
    <ProvedorPlei>
      <Conteudo />
    </ProvedorPlei>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },

  botaoFlutuante: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: cores.menta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },

  faixaPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: cores.faixaPerfil,
    borderTopWidth: 1,
    borderTopColor: cores.linha,
  },
  textoFaixa: { color: cores.texto, fontSize: 14 },
  contadorFaixa: { color: cores.texto, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  botaoFaixa: {
    borderWidth: 1,
    borderColor: cores.menta,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  textoBotaoFaixa: { color: cores.menta, fontSize: 13, fontWeight: '700' },

  barraAbas: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 6,
    backgroundColor: cores.barraAbas,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  itemAba: { alignItems: 'center', gap: 4 },
  rotuloAba: { fontSize: 11, fontWeight: '600' },
  avatarAba: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: cores.avatarFundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicialAba: { color: cores.avatarTexto, fontSize: 11, fontWeight: '700' },
  pontoAviso: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: cores.alerta,
  },

  torrada: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 90,
    backgroundColor: cores.torrada,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  textoTorrada: { color: cores.texto, fontSize: 13, fontWeight: '600' },
});
