import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { cores } from '../tema';
import { Cabecalho } from '../componentes';
import { usePlei } from '../estado';

export function TelaBookings({ topo }: { topo: number }) {
  const { jogos, inscritos, abrirJogo, cancelarReserva } = usePlei();
  const reservados = jogos.filter((g) => inscritos.includes(g.id));

  return (
    <>
      <Cabecalho topo={topo} titulo="Bookings" />

      {reservados.length === 0 ? (
        <View style={estilos.cartaoVazio}>
          <View style={estilos.ilustracao}>
            <Text style={estilos.textoIlustracao}>match illustration</Text>
          </View>
          <Text style={estilos.tituloVazio}>No games booked...yet!</Text>
          <Text style={estilos.descricaoVazio}>
            Looks like you haven't booked any games. Join a game now and it'll show up here!
          </Text>
        </View>
      ) : (
        <View style={estilos.lista}>
          {reservados.map((g) => (
            <Pressable key={g.id} onPress={() => abrirJogo(g.id)} style={estilos.cartao}>
              <View style={estilos.topoCartao}>
                <View style={estilos.selo}>
                  <Text style={estilos.textoSelo}>Confirmed</Text>
                </View>
                <Pressable onPress={() => cancelarReserva(g.id)} hitSlop={8}>
                  <Text style={estilos.cancelar}>Cancel</Text>
                </Pressable>
              </View>
              <Text style={estilos.titulo}>{g.title}</Text>
              <Text style={estilos.subtitulo}>
                {g.location} • {g.timeRange}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  cartaoVazio: {
    marginTop: 110,
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 22,
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    backgroundColor: cores.preenchimentoCartao,
  },
  ilustracao: {
    width: 120,
    height: 90,
    marginBottom: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(74,222,154,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoIlustracao: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 9,
    color: cores.textoFraco,
  },
  tituloVazio: { color: cores.texto, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  descricaoVazio: {
    color: cores.textoTenue,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 21,
    textAlign: 'center',
  },

  lista: { paddingHorizontal: 20, paddingVertical: 10, gap: 14 },
  cartao: {
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  topoCartao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selo: {
    backgroundColor: 'rgba(74,222,154,0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  textoSelo: { color: cores.menta, fontSize: 12, fontWeight: '700' },
  cancelar: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: '700', marginTop: 10 },
  subtitulo: { color: cores.textoTenue, fontSize: 13, marginTop: 4 },
});
