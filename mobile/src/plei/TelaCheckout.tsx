import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores } from './tema';
import { BotaoPrimario, Chips } from './componentes';
import { IconeAgenda, IconeFechar, IconeLocal, IconeMais, IconeMenos, IconeRelogio } from './icones';
import { formatarRotuloDia } from './adaptador';
import { MetodoPagamento, useJogoAberto, usePlei } from './estado';
import { formatarCentavos } from '../utils/moeda';

/**
 * Tela cheia de checkout do "Join Game", conforme o protótipo
 * "Checkout - Join Game.dc.html". Só entra aqui quem tem vaga disponível —
 * jogo lotado usa a folha simples de entrada na fila (sem cobrança).
 */
export function TelaCheckout() {
  const { passoEntrada, cancelarEntrada } = usePlei();
  const jogo = useJogoAberto();
  const lotado = !!jogo && jogo.going >= jogo.total;
  const visivel = passoEntrada === 'confirm' && !!jogo && !lotado;

  const insets = useSafeAreaInsets();
  const [guestCount, setGuestCount] = useState(0);
  const [trocandoMetodo, setTrocandoMetodo] = useState(false);

  useEffect(() => {
    if (visivel) {
      setGuestCount(0);
      setTrocandoMetodo(false);
    }
  }, [visivel, jogo?.id]);

  if (!visivel || !jogo) return null;

  return (
    <Modal transparent={false} visible animationType="slide" onRequestClose={cancelarEntrada}>
      <ConteudoCheckout
        insetTop={insets.top}
        insetBottom={insets.bottom}
        guestCount={guestCount}
        setGuestCount={setGuestCount}
        trocandoMetodo={trocandoMetodo}
        setTrocandoMetodo={setTrocandoMetodo}
      />
    </Modal>
  );
}

function ConteudoCheckout({
  insetTop,
  insetBottom,
  guestCount,
  setGuestCount,
  trocandoMetodo,
  setTrocandoMetodo,
}: {
  insetTop: number;
  insetBottom: number;
  guestCount: number;
  setGuestCount(fn: (atual: number) => number): void;
  trocandoMetodo: boolean;
  setTrocandoMetodo(v: boolean): void;
}) {
  const {
    metodoPagamento,
    setMetodoPagamento,
    splitPrevisto,
    confirmarEntrada,
    cancelarEntrada,
    enviandoEntrada,
    erroEntrada,
  } = usePlei();
  const jogo = useJogoAberto();
  if (!jogo) return null;

  const spotsLeft = Math.max(jogo.total - jogo.going, 0);
  const precoAssento = splitPrevisto?.totalCobradoCentavos ?? jogo.precoVagaCentavos;
  const numeroJogadores = 1 + guestCount;
  const totalCheckout = precoAssento * numeroJogadores;

  return (
    <View style={[estilos.raiz, { paddingTop: insetTop + 22 }]}>
      <View style={estilos.cabecalho}>
        <Pressable onPress={cancelarEntrada} style={estilos.botaoFechar} hitSlop={10}>
          <IconeFechar />
        </Pressable>
        <Text style={estilos.tituloCabecalho}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <View style={estilos.linhaTitulo}>
          <Text style={estilos.titulo}>Entrar no jogo ({jogo.format})</Text>
          <View style={estilos.blocoVagas}>
            <View style={{ flexDirection: 'row' }}>
              {jogo.players.slice(0, 3).map((inicial, i) => (
                <View
                  key={`${inicial}-${i}`}
                  style={[estilos.avatarMini, { marginLeft: i === 0 ? 0 : -8 }]}
                >
                  <Text style={estilos.textoAvatarMini}>{inicial}</Text>
                </View>
              ))}
            </View>
            <Text style={estilos.textoVagas}>{spotsLeft} vagas restantes</Text>
          </View>
        </View>

        <View style={estilos.linhaIcones}>
          <View style={estilos.itemIcone}>
            <IconeAgenda size={18} color={cores.menta} />
            <Text style={estilos.textoIcone}>{formatarRotuloDia(jogo.inicio)}</Text>
          </View>
          <View style={estilos.itemIcone}>
            <IconeRelogio size={18} color={cores.menta} />
            <Text style={estilos.textoIcone}>{jogo.timeRange}</Text>
          </View>
        </View>

        <View style={estilos.linhaLocal}>
          <IconeLocal size={18} color={cores.menta} />
          <View>
            <Text style={estilos.tituloLocal}>{jogo.title}</Text>
            <Text style={estilos.subtituloLocal}>{jogo.location}</Text>
          </View>
        </View>

        <View style={estilos.divisor} />

        <Text style={estilos.perguntaConvidados}>Quer levar convidados?</Text>
        <View style={estilos.stepper}>
          <Pressable
            onPress={() => setGuestCount((atual) => Math.max(0, atual - 1))}
            style={estilos.botaoStepper}
          >
            <IconeMenos size={16} color="#fff" />
          </Pressable>
          <View style={estilos.contadorStepper}>
            <Text style={estilos.textoContador}>{guestCount}</Text>
          </View>
          <Pressable
            onPress={() => setGuestCount((atual) => atual + 1)}
            style={estilos.botaoStepper}
          >
            <IconeMais size={16} color="#fff" />
          </Pressable>
        </View>
        {guestCount > 0 && (
          <Text style={estilos.avisoConvidados}>
            As vagas dos convidados ainda não são reservadas automaticamente — avise cada um pra
            entrar por conta própria.
          </Text>
        )}

        <View style={estilos.divisor} />

        <View style={estilos.linhaTotal}>
          <Text style={estilos.rotuloTotal}>Total:</Text>
          <View style={estilos.valorTotalBloco}>
            <Text style={estilos.valorTotal}>{formatarCentavos(totalCheckout)}</Text>
            <Text style={estilos.barraTotal}>/</Text>
            <Text style={estilos.detalheTotal}>
              {formatarCentavos(precoAssento)} × {numeroJogadores} jogador
              {numeroJogadores > 1 ? 'es' : ''}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 26 }}>
          <Text style={estilos.rotuloSecao}>FORMA DE PAGAMENTO</Text>
          <View style={estilos.linhaPagamento}>
            <Text style={estilos.textoPagamento}>
              {metodoPagamento === 'cartao' ? 'Cartão' : 'Pix'}
            </Text>
            <Pressable onPress={() => setTrocandoMetodo(!trocandoMetodo)}>
              <Text style={estilos.linkTrocar}>TROCAR FORMA DE PAGAMENTO</Text>
            </Pressable>
          </View>
          {trocandoMetodo && (
            <View style={{ marginTop: 12 }}>
              <SeletorMetodoCheckout
                valor={metodoPagamento}
                onSelect={(m) => {
                  setMetodoPagamento(m);
                  setTrocandoMetodo(false);
                }}
              />
            </View>
          )}
          <Text style={estilos.notaPagamento}>
            {metodoPagamento === 'cartao'
              ? 'Você só será cobrado quando o jogo for confirmado.'
              : 'No Pix a cobrança é imediata; se o jogo não confirmar, o valor volta integral.'}
          </Text>
        </View>

        {erroEntrada ? <Text style={estilos.erro}>{erroEntrada}</Text> : null}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[estilos.rodape, { paddingBottom: Math.max(insetBottom, 16) + 14 }]}>
          {enviandoEntrada ? (
            <ActivityIndicator color={cores.menta} />
          ) : (
            <BotaoPrimario rotulo="Vamos jogar!" onPress={() => void confirmarEntrada()} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function SeletorMetodoCheckout({
  valor,
  onSelect,
}: {
  valor: MetodoPagamento;
  onSelect(m: MetodoPagamento): void;
}) {
  return (
    <Chips
      opcoes={[
        { valor: 'cartao' as const, rotulo: 'Cartão' },
        { valor: 'pix' as const, rotulo: 'Pix' },
      ]}
      valor={valor}
      onSelecionar={onSelect}
    />
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.folha },

  cabecalho: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  botaoFechar: { position: 'absolute', left: 20 },
  tituloCabecalho: { color: cores.texto, fontSize: 18, fontWeight: '700' },

  conteudo: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },

  linhaTitulo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
  },
  titulo: { flex: 1, color: cores.texto, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  blocoVagas: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  avatarMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(74,222,154,0.35)',
    borderWidth: 2,
    borderColor: cores.folha,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAvatarMini: { color: cores.texto, fontSize: 11, fontWeight: '700' },
  textoVagas: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  linhaIcones: { flexDirection: 'row', gap: 22, marginTop: 22 },
  itemIcone: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textoIcone: { color: cores.texto, fontSize: 14 },

  linhaLocal: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 22 },
  tituloLocal: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  subtituloLocal: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 2 },

  divisor: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 24 },

  perguntaConvidados: { textAlign: 'center', color: cores.texto, fontSize: 17, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16 },
  botaoStepper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorStepper: {
    width: 64,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoContador: { color: cores.texto, fontSize: 20, fontWeight: '700' },
  avisoConvidados: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 17,
  },

  linhaTotal: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  rotuloTotal: { color: cores.texto, fontSize: 15, fontWeight: '700' },
  valorTotalBloco: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  valorTotal: { color: cores.texto, fontSize: 20, fontWeight: '700' },
  barraTotal: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  detalheTotal: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },

  rotuloSecao: { color: cores.textoFraco, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  linhaPagamento: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  textoPagamento: { color: cores.texto, fontSize: 15 },
  linkTrocar: { color: '#8FA6FF', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  notaPagamento: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 18, lineHeight: 19 },

  erro: { color: cores.erro, fontSize: 13, marginTop: 16 },

  rodape: { flexShrink: 0, paddingHorizontal: 20, paddingTop: 16 },
});
