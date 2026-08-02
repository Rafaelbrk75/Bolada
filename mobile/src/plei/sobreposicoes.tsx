import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
  CampoRotulado,
  Chips,
  SeletorNivel,
} from './componentes';
import { SeletorInicio } from './SeletorInicio';
import { IconeAvancar, IconeCheck, IconeEnviar, IconeVoltar } from './icones';
import { AJUSTES, DURACOES, NIVEIS_JOGO, PRAZOS } from './dados';
import { previsaoReembolso, rotuloParticipacao } from './adaptador';
import { MetodoPagamento, useJogoAberto, usePlei } from './estado';
import { formatarCentavos } from '../utils/moeda';
import { formatarDataHora, somarHoras, somarMinutos } from '../utils/data';

export function Sobreposicoes() {
  return (
    <>
      <FolhaDetalheJogo />
      <FolhaConfirmarEntrada />
      <FolhaEntradaConfirmada />
      <FolhaCancelamento />
      <FolhaCriarJogo />
      <FolhaEditarPerfil />
      <FolhaChat />
      <FolhaAjustes />
    </>
  );
}

function SeletorMetodo({
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

function FolhaDetalheJogo() {
  const { passoEntrada, fecharSobreposicoes, iniciarEntrada } = usePlei();
  const jogo = useJogoAberto();
  const visivel = !!jogo && !passoEntrada;
  const lotado = !!jogo && jogo.going >= jogo.total;

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
            <Text style={estilos.legendaFoto}>{jogo.dataLonga}</Text>
          </LinearGradient>

          <View style={{ padding: 20 }}>
            <Text style={estilos.tituloDetalhe}>{jogo.title}</Text>
            <Text style={estilos.subtituloDetalhe}>por: {jogo.host}</Text>
            <Text style={[estilos.subtituloDetalhe, { marginTop: 4 }]}>{jogo.location}</Text>

            <View style={estilos.linhaEtiquetas}>
              <View style={estilos.etiqueta}>
                <Text style={estilos.textoEtiqueta}>{jogo.tag}</Text>
              </View>
              <View style={estilos.etiqueta}>
                <Text style={estilos.textoEtiqueta}>
                  {jogo.going}/{jogo.total} confirmados
                </Text>
              </View>
              <View style={estilos.etiqueta}>
                <Text style={estilos.textoEtiqueta}>{jogo.format}</Text>
              </View>
            </View>

            <Text style={estilos.descricao}>{jogo.description}</Text>

            <View style={estilos.divisor} />

            <View style={estilos.linhaPreco}>
              <Text style={estilos.textoPreco}>{jogo.timeRange}</Text>
              <Text style={[estilos.textoPreco, { fontWeight: '700' }]}>{jogo.price}</Text>
            </View>

            <Text style={estilos.tituloJogadores}>Quem já está dentro</Text>
            {jogo.players.length > 0 ? (
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
            ) : (
              <Text style={estilos.semJogadores}>Ninguém ainda — seja o primeiro.</Text>
            )}

            {jogo.minha ? (
              <View style={estilos.blocoStatus}>
                <Text style={estilos.textoStatus}>{rotuloParticipacao(jogo.minha)}</Text>
              </View>
            ) : (
              <BotaoPrimario
                rotulo={lotado ? 'Entrar na fila de espera' : 'Entrar no jogo'}
                onPress={() => iniciarEntrada(jogo.id)}
                estilo={{ marginTop: 24 }}
              />
            )}
          </View>
        </ScrollView>
      ) : null}
    </FolhaInferior>
  );
}

function FolhaConfirmarEntrada() {
  const {
    passoEntrada,
    splitPrevisto,
    metodoPagamento,
    setMetodoPagamento,
    confirmarEntrada,
    cancelarEntrada,
    enviandoEntrada,
    erroEntrada,
  } = usePlei();
  const jogo = useJogoAberto();
  const lotado = !!jogo && jogo.going >= jogo.total;

  return (
    <FolhaInferior visivel={passoEntrada === 'confirm' && !!jogo} aoFechar={cancelarEntrada}>
      {jogo ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 34 }}>
          <AlcaFolha />
          <Text style={estilos.tituloFolha}>
            {lotado ? 'Entrar na fila de espera' : 'Confirmar sua vaga'}
          </Text>

          <View style={estilos.cartaoResumo}>
            <Text style={estilos.tituloResumo}>{jogo.title}</Text>
            <Text style={estilos.subtituloResumo}>
              {jogo.dataLonga} • {jogo.timeRange}
            </Text>

            <View style={estilos.divisorResumo} />

            {splitPrevisto ? (
              <>
                <LinhaValor rotulo="Vaga" valor={splitPrevisto.precoVagaCentavos} />
                <LinhaValor rotulo="Taxa de serviço" valor={splitPrevisto.taxaServicoCentavos} />
                <LinhaValor
                  rotulo="Total"
                  valor={splitPrevisto.totalCobradoCentavos}
                  destaque
                />
              </>
            ) : (
              <LinhaValor rotulo="Vaga" valor={jogo.precoVagaCentavos} destaque />
            )}
          </View>

          {lotado ? (
            <Text style={estilos.avisoFila}>
              O jogo está cheio. Você entra na fila sem pagar nada agora — se abrir vaga, tem 10
              minutos pra confirmar.
            </Text>
          ) : (
            <View style={{ marginTop: 18, gap: 8 }}>
              <Text style={estilos.rotuloMetodo}>Forma de pagamento</Text>
              <SeletorMetodo valor={metodoPagamento} onSelect={setMetodoPagamento} />
              <Text style={estilos.notaMetodo}>
                {metodoPagamento === 'cartao'
                  ? 'No cartão a cobrança só acontece quando o jogo confirma o mínimo de jogadores.'
                  : 'No Pix a cobrança é imediata; se o jogo não confirmar, o valor volta integral.'}
              </Text>
            </View>
          )}

          {erroEntrada ? <Text style={estilos.erro}>{erroEntrada}</Text> : null}

          {enviandoEntrada ? (
            <ActivityIndicator color={cores.menta} style={{ marginTop: 24 }} />
          ) : (
            <BotaoPrimario
              rotulo={lotado ? 'Entrar na fila' : 'Confirmar e entrar'}
              onPress={() => void confirmarEntrada()}
              estilo={{ marginTop: 20 }}
            />
          )}
          <BotaoTexto rotulo="Cancelar" onPress={cancelarEntrada} estilo={{ marginTop: 12 }} />
        </View>
      ) : null}
    </FolhaInferior>
  );
}

function FolhaEntradaConfirmada() {
  const { passoEntrada, desfechoEntrada, irParaReservas, fecharSobreposicoes } = usePlei();
  const jogo = useJogoAberto();

  const emEspera = desfechoEntrada?.situacao === 'em_espera';
  const titulo = emEspera
    ? `Você é o ${desfechoEntrada?.posicaoEspera ?? '?'}º da fila`
    : 'Vaga garantida!';

  const descricao = emEspera
    ? 'Ninguém foi cobrado. Se abrir vaga, você recebe 10 minutos pra confirmar o pagamento.'
    : desfechoEntrada?.situacao === 'paga'
      ? `Pix pago. ${jogo?.title ?? 'O jogo'} está nas suas vagas.`
      : desfechoEntrada?.jogoConfirmou
        ? 'O mínimo de jogadores bateu com a sua entrada — a cobrança no cartão já foi feita.'
        : 'Cartão pré-autorizado. A cobrança só acontece quando o jogo confirmar o mínimo.';

  return (
    <FolhaInferior visivel={passoEntrada === 'success'} aoFechar={fecharSobreposicoes}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' }}>
        <View style={estilos.circuloCheck}>
          <IconeCheck color={emEspera ? cores.vagas : cores.menta} />
        </View>
        <Text style={estilos.tituloSucesso}>{titulo}</Text>
        <Text style={estilos.descricaoSucesso}>{descricao}</Text>
        <BotaoPrimario
          rotulo="Ver minhas vagas"
          onPress={irParaReservas}
          estilo={{ marginTop: 24, alignSelf: 'stretch' }}
        />
        <BotaoTexto rotulo="Fechar" onPress={fecharSobreposicoes} estilo={{ marginTop: 12 }} />
      </View>
    </FolhaInferior>
  );
}

function FolhaCancelamento() {
  const { cancelamentoAlvo, cancelando, confirmarCancelamento, fecharCancelamento } = usePlei();
  const participacao = cancelamentoAlvo?.minha;
  const naFila = participacao?.status === 'em_espera';
  const horasAntes = cancelamentoAlvo
    ? (new Date(cancelamentoAlvo.inicio).getTime() - Date.now()) / 3_600_000
    : 0;
  const ofereceCredito = !naFila && horasAntes >= 6 && horasAntes < 24;

  return (
    <FolhaInferior visivel={!!cancelamentoAlvo} aoFechar={fecharCancelamento}>
      {cancelamentoAlvo ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 34 }}>
          <AlcaFolha />
          <Text style={estilos.tituloFolha}>Cancelar participação</Text>

          <View style={estilos.cartaoResumo}>
            <Text style={estilos.tituloResumo}>{cancelamentoAlvo.title}</Text>
            <Text style={estilos.subtituloResumo}>
              {cancelamentoAlvo.dataLonga} • {cancelamentoAlvo.timeRange}
            </Text>
            <View style={estilos.divisorResumo} />
            <Text style={estilos.politica}>
              {naFila
                ? 'Você só está na fila — sair não gera cobrança nem devolução.'
                : previsaoReembolso(cancelamentoAlvo.inicio)}
            </Text>
          </View>

          {cancelando ? (
            <ActivityIndicator color={cores.menta} style={{ marginTop: 24 }} />
          ) : (
            <>
              <BotaoPrimario
                rotulo={ofereceCredito ? 'Receber 50% no cartão' : 'Confirmar cancelamento'}
                onPress={() => void confirmarCancelamento('cartao')}
                estilo={{ marginTop: 20 }}
              />
              {ofereceCredito && (
                <Pressable
                  onPress={() => void confirmarCancelamento('credito')}
                  style={estilos.botaoSecundario}
                >
                  <Text style={estilos.textoBotaoSecundario}>Receber 100% em crédito</Text>
                </Pressable>
              )}
            </>
          )}
          <BotaoTexto rotulo="Voltar" onPress={fecharCancelamento} estilo={{ marginTop: 12 }} />
        </View>
      ) : null}
    </FolhaInferior>
  );
}

function FolhaCriarJogo() {
  const {
    criacaoAberta,
    rascunhoJogo,
    setRascunhoJogo,
    errosCriacao,
    mostrarErrosCriacao,
    splitSugerido,
    pedirSugestaoPreco,
    enviarNovoJogo,
    criandoJogo,
    fecharSobreposicoes,
  } = usePlei();

  const fim = somarMinutos(rascunhoJogo.inicio, rascunhoJogo.duracaoMinutos);
  const prazo = somarHoras(rascunhoJogo.inicio, -rascunhoJogo.prazoHorasAntes);
  const erro = (campo: string) => (mostrarErrosCriacao ? errosCriacao[campo] : undefined);

  return (
    <FolhaInferior visivel={criacaoAberta} aoFechar={fecharSobreposicoes}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 34 }}
        >
          <AlcaFolha />
          <Text style={[estilos.tituloFolha, { marginBottom: 18 }]}>Criar jogo</Text>

          <View style={{ gap: 16 }}>
            <CampoRotulado rotulo="Título" erro={erro('titulo')}>
              <Campo
                value={rascunhoJogo.titulo}
                onChangeText={(titulo) => setRascunhoJogo({ titulo })}
                placeholder="Pelada de quinta"
              />
            </CampoRotulado>

            <CampoRotulado rotulo="Nível">
              <Chips
                opcoes={NIVEIS_JOGO}
                valor={rascunhoJogo.nivel}
                onSelecionar={(nivel) => setRascunhoJogo({ nivel })}
              />
            </CampoRotulado>

            <CampoRotulado rotulo="Início" dica={formatarDataHora(rascunhoJogo.inicio)}>
              <SeletorInicio
                valor={rascunhoJogo.inicio}
                onChange={(inicio) => setRascunhoJogo({ inicio })}
              />
            </CampoRotulado>

            <CampoRotulado rotulo="Duração" dica={`Termina ${formatarDataHora(fim)}`}>
              <Chips
                opcoes={DURACOES}
                valor={rascunhoJogo.duracaoMinutos}
                onSelecionar={(duracaoMinutos) => setRascunhoJogo({ duracaoMinutos })}
              />
            </CampoRotulado>

            <CampoRotulado
              rotulo="Prazo de confirmação"
              dica={`Cancela sozinho em ${formatarDataHora(prazo)} se não bater o mínimo`}
            >
              <Chips
                opcoes={PRAZOS}
                valor={rascunhoJogo.prazoHorasAntes}
                onSelecionar={(prazoHorasAntes) => setRascunhoJogo({ prazoHorasAntes })}
              />
            </CampoRotulado>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <CampoRotulado rotulo="Capacidade" erro={erro('capacidade')}>
                  <Campo
                    value={rascunhoJogo.capacidade}
                    onChangeText={(capacidade) => setRascunhoJogo({ capacidade })}
                    keyboardType="number-pad"
                  />
                </CampoRotulado>
              </View>
              <View style={{ flex: 1 }}>
                <CampoRotulado rotulo="Mínimo" erro={erro('minimo')}>
                  <Campo
                    value={rascunhoJogo.minimo}
                    onChangeText={(minimo) => setRascunhoJogo({ minimo })}
                    keyboardType="number-pad"
                  />
                </CampoRotulado>
              </View>
            </View>

            <CampoRotulado rotulo="Preço da vaga" erro={erro('preco')}>
              <Campo
                value={rascunhoJogo.preco}
                onChangeText={(preco) => setRascunhoJogo({ preco })}
                keyboardType="decimal-pad"
                placeholder="R$ 0,00"
              />
            </CampoRotulado>

            <View style={estilos.caixaSugestao}>
              <Text style={estilos.tituloSugestao}>Não sabe quanto cobrar?</Text>
              <CampoRotulado rotulo="Custo da locação da quadra">
                <Campo
                  value={rascunhoJogo.custoQuadra}
                  onChangeText={(custoQuadra) => setRascunhoJogo({ custoQuadra })}
                  keyboardType="decimal-pad"
                  placeholder="R$ 0,00"
                />
              </CampoRotulado>
              <Pressable onPress={() => void pedirSugestaoPreco()} style={estilos.botaoSugerir}>
                <Text style={estilos.textoBotaoSugerir}>Sugerir preço</Text>
              </Pressable>
              {splitSugerido && (
                <View style={estilos.blocoSplit}>
                  <LinhaValor rotulo="Vaga" valor={splitSugerido.precoVagaCentavos} />
                  <LinhaValor rotulo="Taxa do jogador" valor={splitSugerido.taxaServicoCentavos} />
                  <LinhaValor
                    rotulo="Jogador paga"
                    valor={splitSugerido.totalCobradoCentavos}
                    destaque
                  />
                  <LinhaValor rotulo="Quadra recebe" valor={splitSugerido.valorQuadraCentavos} />
                  <LinhaValor
                    rotulo="Plataforma"
                    valor={splitSugerido.receitaPlataformaCentavos}
                  />
                </View>
              )}
            </View>

            <View style={estilos.linhaSwitch}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={estilos.rotuloSwitch}>Jogo público</Text>
                <Text style={estilos.dicaSwitch}>Aparece na busca pra qualquer jogador</Text>
              </View>
              <Switch
                value={rascunhoJogo.publico}
                onValueChange={(publico) => setRascunhoJogo({ publico })}
                trackColor={{ true: cores.menta, false: 'rgba(255,255,255,0.2)' }}
              />
            </View>
          </View>

          {criandoJogo ? (
            <ActivityIndicator color={cores.menta} style={{ marginTop: 24 }} />
          ) : (
            <BotaoPrimario
              rotulo="Publicar jogo"
              onPress={() => void enviarNovoJogo()}
              estilo={{ marginTop: 20 }}
            />
          )}
          <BotaoTexto rotulo="Cancelar" onPress={fecharSobreposicoes} estilo={{ marginTop: 12 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </FolhaInferior>
  );
}

function LinhaValor({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <View style={estilos.linhaValor}>
      <Text style={[estilos.rotuloValor, destaque && estilos.valorDestaque]}>{rotulo}</Text>
      <Text style={[estilos.valorValor, destaque && estilos.valorDestaque]}>
        {formatarCentavos(valor)}
      </Text>
    </View>
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
          <Text style={[estilos.tituloFolha, { marginBottom: 18 }]}>Editar perfil</Text>

          <View style={{ gap: 14 }}>
            <CampoRotulado rotulo="Nome completo">
              <Campo
                value={rascunhoPerfil.name}
                onChangeText={(name) => setRascunhoPerfil({ name })}
              />
            </CampoRotulado>
            <CampoRotulado rotulo="Posição">
              <Campo
                value={rascunhoPerfil.position}
                onChangeText={(position) => setRascunhoPerfil({ position })}
                placeholder="ex.: Meio-campo"
              />
            </CampoRotulado>
            <CampoRotulado rotulo="Nível">
              <SeletorNivel
                valor={rascunhoPerfil.skill}
                onSelect={(skill) => setRascunhoPerfil({ skill })}
              />
            </CampoRotulado>
          </View>

          <BotaoPrimario rotulo="Salvar" onPress={salvarPerfil} estilo={{ marginTop: 22 }} />
          <BotaoTexto rotulo="Cancelar" onPress={fecharSobreposicoes} estilo={{ marginTop: 12 }} />
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
              placeholder="Mensagem"
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
          <Text style={estilos.tituloAjustes}>Ajustes</Text>
        </View>

        <View style={estilos.perfilAjustes}>
          <Avatar inicial={perfil.initial} tamanho={48} variante="claro" />
          <View>
            <Text style={estilos.nomeAjustes}>{perfil.name}</Text>
            <Text style={estilos.legendaAjustes}>Preferências da sua conta</Text>
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
          <Pressable onPress={() => mostrarTorrada('Sessão encerrada')} style={estilos.itemSaida}>
            <Text style={[estilos.iconeAjuste, { color: cores.texto }]}>→</Text>
            <Text style={estilos.tituloItem}>Sair</Text>
          </Pressable>
          <Pressable
            onPress={() => mostrarTorrada('Exclusão de conta exige confirmação')}
            style={estilos.itemSaida}
          >
            <Text style={estilos.iconeAjuste}>🗑</Text>
            <View>
              <Text style={[estilos.tituloItem, { color: cores.perigo }]}>Excluir conta</Text>
              <Text style={estilos.subtituloItem}>Apaga sua conta em definitivo</Text>
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
    color: 'rgba(255,255,255,0.75)',
  },

  tituloDetalhe: { color: cores.texto, fontSize: 21, fontWeight: '700' },
  subtituloDetalhe: { color: cores.textoSuave, fontSize: 14, marginTop: 6 },
  linhaEtiquetas: { flexDirection: 'row', gap: 8, marginVertical: 14, flexWrap: 'wrap' },
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
  tituloJogadores: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
  },
  semJogadores: { color: cores.textoFraco, fontSize: 13 },
  blocoStatus: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: 'center',
  },
  textoStatus: { color: cores.menta, fontSize: 15, fontWeight: '700' },

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
  divisorResumo: { height: 1, backgroundColor: cores.linha, marginVertical: 14 },
  politica: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 20 },

  linhaValor: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rotuloValor: { color: cores.textoSuave, fontSize: 14 },
  valorValor: { color: cores.texto, fontSize: 14 },
  valorDestaque: { color: cores.texto, fontWeight: '700', fontSize: 15 },

  rotuloMetodo: { color: cores.textoFraco, fontSize: 12 },
  notaMetodo: { color: cores.textoFraco, fontSize: 12, lineHeight: 18 },
  avisoFila: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20, marginTop: 16 },

  botaoSecundario: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: cores.menta,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
  },
  textoBotaoSecundario: { color: cores.menta, fontSize: 15, fontWeight: '700' },

  circuloCheck: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(74,222,154,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  tituloSucesso: { color: cores.texto, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  descricaoSucesso: {
    color: cores.textoSuave,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
    textAlign: 'center',
  },

  erro: { color: cores.erro, fontSize: 13, marginTop: 12 },

  caixaSugestao: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    backgroundColor: cores.preenchimentoCartao,
  },
  tituloSugestao: { color: cores.texto, fontSize: 15, fontWeight: '700' },
  botaoSugerir: {
    borderWidth: 1,
    borderColor: cores.menta,
    borderRadius: 20,
    paddingVertical: 11,
    alignItems: 'center',
  },
  textoBotaoSugerir: { color: cores.menta, fontSize: 14, fontWeight: '700' },
  blocoSplit: { borderTopWidth: 1, borderTopColor: cores.linha, paddingTop: 10 },

  linhaSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rotuloSwitch: { color: cores.texto, fontSize: 14, fontWeight: '600' },
  dicaSwitch: { color: cores.textoFraco, fontSize: 12, marginTop: 2 },

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
