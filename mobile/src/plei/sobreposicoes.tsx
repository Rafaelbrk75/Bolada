import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cores, direcao160 } from './tema';
import { FolhaInferior } from './folha';
import {
  AlcaFolha,
  Avatar,
  BotaoPrimario,
  BotaoTexto,
  Campo,
  SeletorNivel,
} from './componentes';
import { IconeAvancar, IconeCheck, IconeEnviar, IconeVoltar } from './icones';
import { AJUSTES } from './dados';
import { usePlei } from './estado';

export function Sobreposicoes() {
  return (
    <>
      <FolhaDetalheJogo />
      <FolhaConfirmarEntrada />
      <FolhaEntradaConfirmada />
      <FolhaCriarJogo />
      <FolhaEditarPerfil />
      <FolhaChat />
      <FolhaAjustes />
    </>
  );
}

function FolhaDetalheJogo() {
  const { jogos, jogoAbertoId, passoEntrada, inscritos, fecharSobreposicoes, iniciarEntrada } =
    usePlei();
  const jogo = jogos.find((g) => g.id === jogoAbertoId);
  const visivel = !!jogo && !passoEntrada;

  return (
    <FolhaInferior visivel={visivel} aoFechar={fecharSobreposicoes}>
      {jogo ? (
        <ScrollView bounces={false}>
          <LinearGradient
            colors={jogo.gradient.colors as [string, string, ...string[]]}
            locations={jogo.gradient.locations as [number, number, ...number[]]}
            start={direcao160.start}
            end={direcao160.end}
            style={estilos.capaDetalhe}
          >
            <Pressable onPress={fecharSobreposicoes} style={estilos.botaoVoltarRedondo}>
              <IconeVoltar />
            </Pressable>
            <Text style={estilos.legendaFoto}>field photo</Text>
          </LinearGradient>

          <View style={{ padding: 20 }}>
            <Text style={estilos.tituloDetalhe}>{jogo.title}</Text>
            <Text style={estilos.subtituloDetalhe}>by: {jogo.host}</Text>
            <Text style={[estilos.subtituloDetalhe, { marginTop: 4 }]}>{jogo.location}</Text>

            <View style={estilos.linhaEtiquetas}>
              <View style={estilos.etiqueta}>
                <Text style={estilos.textoEtiqueta}>{jogo.tag}</Text>
              </View>
              <View style={estilos.etiqueta}>
                <Text style={estilos.textoEtiqueta}>
                  {jogo.going}/{jogo.total} Going
                </Text>
              </View>
            </View>

            <Text style={estilos.descricao}>{jogo.description}</Text>

            <View style={estilos.divisor} />

            <View style={estilos.linhaPreco}>
              <Text style={estilos.textoPreco}>
                {jogo.timeRange} • {jogo.format}
              </Text>
              <Text style={[estilos.textoPreco, { fontWeight: '700' }]}>{jogo.price}</Text>
            </View>

            <Text style={estilos.tituloJogadores}>Players going</Text>
            <View style={{ flexDirection: 'row' }}>
              {jogo.players.map((inicial, i) => (
                <Avatar
                  key={`${inicial}-${i}`}
                  inicial={inicial}
                  tamanho={36}
                  estilo={{
                    borderWidth: 2,
                    borderColor: cores.folha,
                    marginLeft: i === 0 ? 0 : -8,
                  }}
                />
              ))}
            </View>

            <BotaoPrimario
              rotulo={inscritos.includes(jogo.id) ? 'Joined ✓' : 'Join Game'}
              onPress={() => iniciarEntrada(jogo.id)}
              estilo={{ marginTop: 24 }}
            />
          </View>
        </ScrollView>
      ) : null}
    </FolhaInferior>
  );
}

function FolhaConfirmarEntrada() {
  const { jogos, jogoAbertoId, passoEntrada, confirmarEntrada, cancelarEntrada } = usePlei();
  const jogo = jogos.find((g) => g.id === jogoAbertoId);

  return (
    <FolhaInferior visivel={passoEntrada === 'confirm' && !!jogo} aoFechar={cancelarEntrada}>
      {jogo ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 34 }}>
          <AlcaFolha />
          <Text style={estilos.tituloFolha}>Confirm your spot</Text>

          <View style={estilos.cartaoResumo}>
            <Text style={estilos.tituloResumo}>{jogo.title}</Text>
            <Text style={estilos.subtituloResumo}>
              {jogo.location} • {jogo.timeRange}
            </Text>
            <View style={estilos.linhaResumo}>
              <Text style={estilos.textoResumo}>Price</Text>
              <Text style={[estilos.textoResumo, { fontWeight: '700' }]}>{jogo.price}</Text>
            </View>
          </View>

          <BotaoPrimario rotulo="Confirm & Join" onPress={confirmarEntrada} estilo={{ marginTop: 20 }} />
          <BotaoTexto rotulo="Cancel" onPress={cancelarEntrada} estilo={{ marginTop: 12 }} />
        </View>
      ) : null}
    </FolhaInferior>
  );
}

function FolhaEntradaConfirmada() {
  const { jogos, jogoAbertoId, passoEntrada, irParaReservas, fecharSobreposicoes } = usePlei();
  const jogo = jogos.find((g) => g.id === jogoAbertoId);

  return (
    <FolhaInferior visivel={passoEntrada === 'success'} aoFechar={fecharSobreposicoes}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' }}>
        <View style={estilos.circuloCheck}>
          <IconeCheck />
        </View>
        <Text style={estilos.tituloSucesso}>You're in!</Text>
        <Text style={estilos.descricaoSucesso}>
          {jogo?.title} has been added to your bookings.
        </Text>
        <BotaoPrimario
          rotulo="View Bookings"
          onPress={irParaReservas}
          estilo={{ marginTop: 24, alignSelf: 'stretch' }}
        />
        <BotaoTexto rotulo="Close" onPress={fecharSobreposicoes} estilo={{ marginTop: 12 }} />
      </View>
    </FolhaInferior>
  );
}

function FolhaCriarJogo() {
  const {
    criacaoAberta,
    rascunhoJogo,
    setRascunhoJogo,
    erroCriacao,
    publicarJogo,
    fecharSobreposicoes,
  } = usePlei();

  return (
    <FolhaInferior visivel={criacaoAberta} aoFechar={fecharSobreposicoes}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 34 }}
        >
          <AlcaFolha />
          <Text style={[estilos.tituloFolha, { marginBottom: 18 }]}>Create a game</Text>

          <View style={{ gap: 14 }}>
            <Campo
              value={rascunhoJogo.location}
              onChangeText={(location) => setRascunhoJogo({ location })}
              placeholder="Location (e.g. McCarren Park)"
            />
            <Campo
              value={rascunhoJogo.timeRange}
              onChangeText={(timeRange) => setRascunhoJogo({ timeRange })}
              placeholder="Time (e.g. 6:00 PM to 7:00 PM)"
            />
            <Campo
              value={rascunhoJogo.format}
              onChangeText={(format) => setRascunhoJogo({ format })}
              placeholder="Format (e.g. 7v7)"
            />
            <Campo
              value={rascunhoJogo.price}
              onChangeText={(price) => setRascunhoJogo({ price })}
              placeholder="Price (e.g. $10.00)"
            />
            <SeletorNivel valor={rascunhoJogo.skill} onSelect={(skill) => setRascunhoJogo({ skill })} />
          </View>

          {erroCriacao ? (
            <Text style={estilos.erro}>Please fill in at least the location and time.</Text>
          ) : null}

          <BotaoPrimario rotulo="Publish game" onPress={publicarJogo} estilo={{ marginTop: 20 }} />
          <BotaoTexto rotulo="Cancel" onPress={fecharSobreposicoes} estilo={{ marginTop: 12 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </FolhaInferior>
  );
}

function FolhaEditarPerfil() {
  const { edicaoAberta, rascunhoPerfil, setRascunhoPerfil, salvarPerfil, fecharSobreposicoes } =
    usePlei();

  return (
    <FolhaInferior visivel={edicaoAberta} aoFechar={fecharSobreposicoes}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 34 }}
        >
          <AlcaFolha />
          <Text style={[estilos.tituloFolha, { marginBottom: 18 }]}>Edit profile</Text>

          <View style={{ gap: 14 }}>
            <View>
              <Text style={estilos.rotuloCampo}>Full name</Text>
              <Campo
                value={rascunhoPerfil.name}
                onChangeText={(name) => setRascunhoPerfil({ name })}
              />
            </View>
            <View>
              <Text style={estilos.rotuloCampo}>Position</Text>
              <Campo
                value={rascunhoPerfil.position}
                onChangeText={(position) => setRascunhoPerfil({ position })}
                placeholder="e.g. Midfielder"
              />
            </View>
            <View>
              <Text style={[estilos.rotuloCampo, { marginBottom: 8 }]}>Skill level</Text>
              <SeletorNivel
                valor={rascunhoPerfil.skill}
                onSelect={(skill) => setRascunhoPerfil({ skill })}
              />
            </View>
          </View>

          <BotaoPrimario rotulo="Save changes" onPress={salvarPerfil} estilo={{ marginTop: 22 }} />
          <BotaoTexto rotulo="Cancel" onPress={fecharSobreposicoes} estilo={{ marginTop: 12 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </FolhaInferior>
  );
}

function FolhaChat() {
  const {
    conversas,
    conversaAtivaId,
    rascunhoChat,
    setRascunhoChat,
    enviarMensagem,
    fecharSobreposicoes,
  } = usePlei();
  const conversa = conversas.find((c) => c.id === conversaAtivaId);

  return (
    <FolhaInferior
      visivel={!!conversa}
      aoFechar={fecharSobreposicoes}
      estiloPainel={{ height: '78%', maxHeight: '78%' }}
    >
      {conversa ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={estilos.cabecalhoChat}>
            <Pressable onPress={fecharSobreposicoes} hitSlop={10}>
              <IconeVoltar />
            </Pressable>
            <Avatar inicial={conversa.initial} tamanho={36} />
            <Text style={estilos.nomeChat}>{conversa.name}</Text>
          </View>

          <ScrollView contentContainerStyle={estilos.listaMensagens}>
            {conversa.messages.map((m, i) => {
              const minha = m.from === 'me';
              return (
                <View
                  key={i}
                  style={[
                    estilos.balao,
                    {
                      alignSelf: minha ? 'flex-end' : 'flex-start',
                      backgroundColor: minha ? cores.menta : 'rgba(255,255,255,0.1)',
                    },
                  ]}
                >
                  <Text style={{ color: minha ? cores.sobreMenta : cores.texto, fontSize: 14 }}>
                    {m.text}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={estilos.barraEnvio}>
            <TextInput
              value={rascunhoChat}
              onChangeText={setRascunhoChat}
              placeholder="Message"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={estilos.campoChat}
              onSubmitEditing={enviarMensagem}
              returnKeyType="send"
            />
            <Pressable onPress={enviarMensagem} style={estilos.botaoEnviar}>
              <IconeEnviar />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </FolhaInferior>
  );
}

function FolhaAjustes() {
  const { ajustesAbertos, perfil, mostrarTorrada, fecharSobreposicoes } = usePlei();

  return (
    <FolhaInferior
      visivel={ajustesAbertos}
      aoFechar={fecharSobreposicoes}
      estiloPainel={{ maxHeight: '90%' }}
    >
      <ScrollView bounces={false}>
        <View style={estilos.cabecalhoAjustes}>
          <Pressable onPress={fecharSobreposicoes} hitSlop={10}>
            <IconeVoltar />
          </Pressable>
          <Text style={estilos.tituloAjustes}>Settings</Text>
        </View>

        <View style={estilos.perfilAjustes}>
          <Avatar inicial={perfil.initial} tamanho={48} variante="claro" />
          <View>
            <Text style={estilos.nomeAjustes}>{perfil.name}</Text>
            <Text style={estilos.legendaAjustes}>Manage your account preferences</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
          {AJUSTES.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => mostrarTorrada(item.toast)}
              style={estilos.itemAjuste}
            >
              <Text style={estilos.iconeAjuste}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={estilos.tituloItem}>{item.title}</Text>
                <Text style={estilos.subtituloItem}>{item.subtitle}</Text>
              </View>
              <IconeAvancar />
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 }}>
          <Pressable onPress={() => mostrarTorrada('Logged out')} style={estilos.itemSaida}>
            <Text style={[estilos.iconeAjuste, { color: cores.texto }]}>→</Text>
            <Text style={estilos.tituloItem}>Log out</Text>
          </Pressable>
          <Pressable
            onPress={() => mostrarTorrada('Account deletion requires confirmation')}
            style={estilos.itemSaida}
          >
            <Text style={estilos.iconeAjuste}>🗑</Text>
            <View>
              <Text style={[estilos.tituloItem, { color: cores.perigo }]}>Delete account</Text>
              <Text style={estilos.subtituloItem}>Permanently delete your account</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </FolhaInferior>
  );
}

const estilos = StyleSheet.create({
  capaDetalhe: { height: 180, justifyContent: 'flex-end', padding: 16 },
  botaoVoltarRedondo: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendaFoto: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 10,
    color: cores.textoSuave,
  },

  tituloDetalhe: { color: cores.texto, fontSize: 21, fontWeight: '700' },
  subtituloDetalhe: { color: cores.textoSuave, fontSize: 14, marginTop: 6 },
  linhaEtiquetas: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  etiqueta: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  textoEtiqueta: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  descricao: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22 },
  divisor: { height: 1, backgroundColor: cores.linha, marginVertical: 18 },
  linhaPreco: { flexDirection: 'row', justifyContent: 'space-between' },
  textoPreco: { color: cores.texto, fontSize: 15 },
  tituloJogadores: { color: cores.texto, fontSize: 14, fontWeight: '700', marginTop: 20, marginBottom: 10 },

  tituloFolha: { color: cores.texto, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  cartaoResumo: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
  },
  tituloResumo: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  subtituloResumo: { color: cores.textoSuave, fontSize: 13, marginTop: 4 },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  textoResumo: { color: cores.texto, fontSize: 15 },

  circuloCheck: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(74,222,154,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  tituloSucesso: { color: cores.texto, fontSize: 20, fontWeight: '700' },
  descricaoSucesso: {
    color: cores.textoSuave,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
    textAlign: 'center',
  },

  erro: { color: cores.erro, fontSize: 13, marginTop: 12 },
  rotuloCampo: { color: cores.textoFraco, fontSize: 12, marginBottom: 6 },

  cabecalhoChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: cores.linha,
  },
  nomeChat: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  listaMensagens: { padding: 16, paddingHorizontal: 20, gap: 10 },
  balao: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, maxWidth: '75%' },
  barraEnvio: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: cores.linha,
  },
  campoChat: {
    flex: 1,
    backgroundColor: cores.preenchimento,
    borderWidth: 1,
    borderColor: cores.bordaCampo,
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 16,
    color: cores.texto,
    fontSize: 14,
  },
  botaoEnviar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.menta,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cabecalhoAjustes: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  tituloAjustes: { color: cores.texto, fontSize: 19, fontWeight: '700' },
  perfilAjustes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 6,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: cores.linha,
  },
  nomeAjustes: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  legendaAjustes: { color: cores.menta, fontSize: 13 },
  itemAjuste: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  iconeAjuste: { fontSize: 18, width: 22, textAlign: 'center' },
  tituloItem: { color: cores.texto, fontSize: 15, fontWeight: '700' },
  subtituloItem: { color: cores.textoFraco, fontSize: 13, marginTop: 2 },
  itemSaida: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
});
