import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cores, direcao160 } from '../tema';
import { Cabecalho, CampoBusca, Divisor, FaixaHorizontal } from '../componentes';
import { IconeFiltro, IconeLocal, IconeSino } from '../icones';
import { JogoUI, rotuloParticipacao } from '../adaptador';
import { usePlei } from '../estado';

function CartaoJogo({ jogo }: { jogo: JogoUI }) {
  const { abrirJogo, iniciarEntrada } = usePlei();
  const lotado = jogo.going >= jogo.total;

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
              {jogo.going}/{jogo.total} confirmados
            </Text>
          </View>
          <Text style={estilos.legendaFoto}>{jogo.dataLonga}</Text>
        </LinearGradient>
      </Pressable>

      <View style={estilos.corpo}>
        <Pressable onPress={() => abrirJogo(jogo.id)}>
          <Text style={estilos.titulo}>{jogo.title}</Text>
          <Text style={estilos.subtitulo}>por: {jogo.host}</Text>
          <View style={estilos.linhaLocal}>
            <IconeLocal />
            <Text style={estilos.subtitulo}>{jogo.location}</Text>
          </View>

          <Divisor />

          <View style={estilos.linhaEtiquetas}>
            <View style={estilos.etiqueta}>
              <Text style={estilos.textoEtiqueta}>{jogo.tag}</Text>
            </View>
            {jogo.status === 'confirmado' ? (
              <View style={[estilos.etiqueta, estilos.etiquetaConfirmado]}>
                <Text style={[estilos.textoEtiqueta, { color: cores.menta }]}>Confirmado</Text>
              </View>
            ) : null}
          </View>

          <View style={estilos.linhaPreco}>
            <Text style={estilos.horario}>
              {jogo.timeRange} • {jogo.format}
            </Text>
            <Text style={estilos.preco}>{jogo.price}</Text>
          </View>

          <Divisor />
        </Pressable>

        {jogo.minha ? (
          <Text style={[estilos.entrar, { color: cores.textoSuave }]}>
            {rotuloParticipacao(jogo.minha)}
          </Text>
        ) : (
          <Pressable onPress={() => iniciarEntrada(jogo.id)} style={{ paddingVertical: 6 }}>
            <Text style={estilos.entrar}>{lotado ? 'Entrar na fila' : 'Entrar no jogo'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function TelaDiscover({ topo }: { topo: number }) {
  const {
    carregando,
    erroCarregamento,
    recarregar,
    datas,
    indiceData,
    setIndiceData,
    jogosDoDia,
    mostrarTorrada,
  } = usePlei();

  return (
    <>
      <Cabecalho
        topo={topo}
        titulo="Descubra"
        acao={
          <Pressable onPress={() => mostrarTorrada('Sem notificações novas')}>
            <IconeSino />
          </Pressable>
        }
      />

      <View style={estilos.linhaBusca}>
        <CampoBusca texto="Buscar jogos" />
        <Pressable onPress={() => mostrarTorrada('Filtros em breve')} style={estilos.botaoFiltro}>
          <IconeFiltro />
        </Pressable>
      </View>

      {datas.length > 0 && (
        <FaixaHorizontal>
          {datas.map((data, i) => {
            const ativa = i === indiceData;
            return (
              <Pressable
                key={data.chave}
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
                  {data.rotulo}
                </Text>
              </Pressable>
            );
          })}
        </FaixaHorizontal>
      )}

      {carregando ? (
        <ActivityIndicator color={cores.menta} style={{ marginTop: 60 }} />
      ) : erroCarregamento ? (
        <View style={estilos.blocoErro}>
          <Text style={estilos.textoErro}>Não deu pra carregar os jogos.</Text>
          <Text style={estilos.detalheErro}>{erroCarregamento}</Text>
          <Pressable onPress={() => void recarregar()} style={estilos.botaoTentar}>
            <Text style={estilos.textoBotaoTentar}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : jogosDoDia.length > 0 ? (
        <View style={estilos.lista}>
          {jogosDoDia.map((jogo) => (
            <CartaoJogo key={jogo.id} jogo={jogo} />
          ))}
        </View>
      ) : (
        <Text style={estilos.semJogos}>
          {datas.length === 0
            ? 'Nenhum jogo publicado ainda. Crie o primeiro no botão +.'
            : 'Nenhum jogo neste dia.'}
        </Text>
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
    color: 'rgba(255,255,255,0.75)',
  },

  corpo: { padding: 16 },
  titulo: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  subtitulo: { color: cores.textoSuave, fontSize: 13, marginTop: 4 },
  linhaLocal: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  linhaEtiquetas: { flexDirection: 'row', gap: 8 },
  etiqueta: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  etiquetaConfirmado: { backgroundColor: 'rgba(74,222,154,0.12)' },
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

  blocoErro: { paddingHorizontal: 30, paddingTop: 50, alignItems: 'center' },
  textoErro: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  detalheErro: { color: cores.textoFraco, fontSize: 13, marginTop: 8, textAlign: 'center' },
  botaoTentar: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: cores.menta,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  textoBotaoTentar: { color: cores.menta, fontSize: 15, fontWeight: '700' },
});
