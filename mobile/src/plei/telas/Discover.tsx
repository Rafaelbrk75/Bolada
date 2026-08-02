import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cores, direcao160 } from '../tema';
import { Cabecalho, CampoBusca, Divisor, FaixaHorizontal } from '../componentes';
import { IconeFiltro, IconeLocal, IconeSino } from '../icones';
import { DATAS, Jogo } from '../dados';
import { usePlei } from '../estado';

function CartaoJogo({ jogo, inscrito }: { jogo: Jogo; inscrito: boolean }) {
  const { abrirJogo, iniciarEntrada } = usePlei();

  return (
    <View style={estilos.cartao}>
      <Pressable onPress={() => abrirJogo(jogo.id)}>
        <LinearGradient
          colors={jogo.gradient.colors as [string, string, ...string[]]}
          locations={jogo.gradient.locations as [number, number, ...number[]]}
          start={direcao160.start}
          end={direcao160.end}
          style={estilos.capa}
        >
          <View style={estilos.selo}>
            <Text style={estilos.textoSelo}>
              {jogo.going}/{jogo.total} Going
            </Text>
          </View>
          <Text style={estilos.legendaFoto}>field photo</Text>
        </LinearGradient>
      </Pressable>

      <View style={estilos.corpo}>
        <Pressable onPress={() => abrirJogo(jogo.id)}>
          <Text style={estilos.titulo}>{jogo.title}</Text>
          <Text style={estilos.subtitulo}>by: {jogo.host}</Text>
          <View style={estilos.linhaLocal}>
            <IconeLocal />
            <Text style={estilos.subtitulo}>{jogo.location}</Text>
          </View>

          <Divisor />

          <View style={estilos.etiqueta}>
            <Text style={estilos.textoEtiqueta}>{jogo.tag}</Text>
          </View>

          <View style={estilos.linhaPreco}>
            <Text style={estilos.horario}>
              {jogo.timeRange} • {jogo.format}
            </Text>
            <Text style={estilos.preco}>{jogo.price}</Text>
          </View>

          <Divisor />
        </Pressable>

        <Pressable onPress={() => iniciarEntrada(jogo.id)} style={{ paddingVertical: 6 }}>
          <Text style={estilos.entrar}>{inscrito ? 'Joined ✓' : 'Join Game'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function TelaDiscover({ topo }: { topo: number }) {
  const { indiceData, setIndiceData, jogos, inscritos, mostrarTorrada } = usePlei();

  // No protótipo só o primeiro chip de data tem jogos; os outros caem no estado vazio.
  const jogosDoDia = indiceData === 0 ? jogos : [];

  return (
    <>
      <Cabecalho
        topo={topo}
        titulo="Discover"
        acao={
          <Pressable onPress={() => mostrarTorrada('No new notifications')}>
            <IconeSino />
          </Pressable>
        }
      />

      <View style={estilos.linhaBusca}>
        <CampoBusca texto="Search games" />
        <Pressable
          onPress={() => mostrarTorrada('Filters coming soon')}
          style={estilos.botaoFiltro}
        >
          <IconeFiltro />
        </Pressable>
      </View>

      <FaixaHorizontal>
        {DATAS.map((rotulo, i) => {
          const ativa = i === indiceData;
          return (
            <Pressable
              key={rotulo}
              onPress={() => setIndiceData(i)}
              style={[
                estilos.chipData,
                { backgroundColor: ativa ? '#fff' : 'rgba(255,255,255,0.08)' },
              ]}
            >
              <Text
                style={[
                  estilos.textoChipData,
                  { color: ativa ? '#0a2c20' : 'rgba(255,255,255,0.8)' },
                ]}
              >
                {rotulo}
              </Text>
            </Pressable>
          );
        })}
      </FaixaHorizontal>

      {jogosDoDia.length > 0 ? (
        <View style={estilos.lista}>
          {jogosDoDia.map((jogo) => (
            <CartaoJogo key={jogo.id} jogo={jogo} inscrito={inscritos.includes(jogo.id)} />
          ))}
        </View>
      ) : (
        <Text style={estilos.semJogos}>No games scheduled for this day yet.</Text>
      )}

      <View style={{ height: 16 }} />
    </>
  );
}

const estilos = StyleSheet.create({
  linhaBusca: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  botaoFiltro: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: cores.preenchimento,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipData: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20 },
  textoChipData: { fontSize: 14, fontWeight: '600' },

  lista: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },

  cartao: {
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: cores.preenchimentoCartao,
  },
  capa: { height: 150, justifyContent: 'flex-end', padding: 10 },
  selo: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  textoSelo: { color: cores.vagas, fontSize: 12, fontWeight: '700' },
  legendaFoto: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
  },

  corpo: { padding: 16 },
  titulo: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  subtitulo: { color: cores.textoSuave, fontSize: 13, marginTop: 4 },
  linhaLocal: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  etiqueta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  textoEtiqueta: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },

  linhaPreco: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  horario: { color: cores.texto, fontSize: 14 },
  preco: { color: cores.texto, fontSize: 16, fontWeight: '700' },

  entrar: { textAlign: 'center', color: cores.menta, fontSize: 16, fontWeight: '700' },

  semJogos: {
    paddingVertical: 60,
    paddingHorizontal: 30,
    textAlign: 'center',
    color: cores.textoFraco,
    fontSize: 14,
  },
});
