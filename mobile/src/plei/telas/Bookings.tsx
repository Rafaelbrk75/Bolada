import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores } from '../tema';
import { Cabecalho } from '../componentes';
import { minutosRestantes, podeCancelar, rotuloParticipacao } from '../adaptador';
import { usePlei } from '../estado';

export function TelaBookings({ topo }: { topo: number }) {
  const { reservas, abrirJogo, pedirCancelamento, pagarVagaLiberada } = usePlei();

  return (
    <>
      <Cabecalho topo={topo} titulo="Minhas vagas" />

      {reservas.length === 0 ? (
        <View style={estilos.cartaoVazio}>
          <View style={estilos.ilustracao} />
          <Text style={estilos.tituloVazio}>Nenhuma vaga ainda!</Text>
          <Text style={estilos.descricaoVazio}>
            Você ainda não entrou em nenhum jogo. Entre em um e ele aparece aqui.
          </Text>
        </View>
      ) : (
        <View style={estilos.lista}>
          {reservas.map((jogo) => {
            const participacao = jogo.minha!;
            const reservaExpirando =
              participacao.status === 'reservada' && participacao.expiraReservaEm;

            return (
              <Pressable key={jogo.id} onPress={() => abrirJogo(jogo.id)} style={estilos.cartao}>
                <View style={estilos.topoCartao}>
                  <View
                    style={[
                      estilos.selo,
                      participacao.status === 'confirmada' && estilos.seloPago,
                      participacao.status === 'reservada' && estilos.seloUrgente,
                    ]}
                  >
                    <Text
                      style={[
                        estilos.textoSelo,
                        participacao.status === 'reservada' && { color: cores.vagas },
                      ]}
                    >
                      {rotuloParticipacao(participacao)}
                    </Text>
                  </View>
                  {podeCancelar(participacao) && (
                    <Pressable onPress={() => pedirCancelamento(jogo)} hitSlop={8}>
                      <Text style={estilos.cancelar}>Cancelar</Text>
                    </Pressable>
                  )}
                </View>

                <Text style={estilos.titulo}>{jogo.title}</Text>
                <Text style={estilos.subtitulo}>
                  {jogo.dataLonga} • {jogo.timeRange}
                </Text>
                <Text style={estilos.subtitulo}>{jogo.location}</Text>

                {/* Fila e reserva ainda não geraram cobrança nenhuma — o split é só estimativa. */}
                {participacao.split && participacao.paymentId ? (
                  <Text style={estilos.valor}>
                    {participacao.capturado
                      ? `Você pagou ${formatar(participacao.split.totalCobradoCentavos)}`
                      : `${formatar(participacao.split.totalCobradoCentavos)} pré-autorizados — cobrança só na confirmação`}
                  </Text>
                ) : participacao.split ? (
                  <Text style={estilos.valor}>
                    Total da vaga: {formatar(participacao.split.totalCobradoCentavos)}
                  </Text>
                ) : null}

                {reservaExpirando ? (
                  <View style={estilos.blocoReserva}>
                    <Text style={estilos.avisoReserva}>
                      Vaga liberada pra você. Restam{' '}
                      {minutosRestantes(participacao.expiraReservaEm!)} min pra pagar.
                    </Text>
                    <View style={estilos.linhaBotoes}>
                      <Pressable
                        onPress={() => void pagarVagaLiberada(participacao, 'cartao')}
                        style={estilos.botaoPagar}
                      >
                        <Text style={estilos.textoBotaoPagar}>Pagar no cartão</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void pagarVagaLiberada(participacao, 'pix')}
                        style={[estilos.botaoPagar, estilos.botaoPagarSecundario]}
                      >
                        <Text style={[estilos.textoBotaoPagar, { color: cores.menta }]}>Pix</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );
}

function formatar(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  seloPago: { backgroundColor: 'rgba(74,222,154,0.12)' },
  seloUrgente: { backgroundColor: 'rgba(255,209,102,0.15)' },
  textoSelo: { color: cores.menta, fontSize: 12, fontWeight: '700' },
  cancelar: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: '700', marginTop: 10 },
  subtitulo: { color: cores.textoTenue, fontSize: 13, marginTop: 4 },
  valor: { color: cores.texto, fontSize: 13, marginTop: 8, fontWeight: '600' },

  blocoReserva: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: cores.linha,
    paddingTop: 12,
  },
  avisoReserva: { color: cores.vagas, fontSize: 13, lineHeight: 19 },
  linhaBotoes: { flexDirection: 'row', gap: 10, marginTop: 12 },
  botaoPagar: {
    flex: 1,
    backgroundColor: cores.menta,
    borderRadius: 20,
    paddingVertical: 11,
    alignItems: 'center',
  },
  botaoPagarSecundario: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: cores.menta,
  },
  textoBotaoPagar: { color: cores.sobreMenta, fontSize: 14, fontWeight: '700' },
});
