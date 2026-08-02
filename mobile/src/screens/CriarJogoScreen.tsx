import { useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { criarJogo, publicarJogo, sugerirPreco } from '../api/jogos';
import { ErroApi } from '../api/cliente';
import { Botao, Campo, Chips, Entrada } from '../components/formulario';
import { SeletorDataHora } from '../components/SeletorDataHora';
import { RootStackParamList } from '../navigation/tipos';
import { SplitVaga } from '../types/jogo';
import { formatarCentavos, lerCentavos } from '../utils/moeda';
import { formatarDataHora, proximaHoraCheia, somarHoras, somarMinutos } from '../utils/data';

type Props = NativeStackScreenProps<RootStackParamList, 'CriarJogo'>;

// TODO: substituir por seleção real de quadra/campo e id do organizador logado
// quando existirem endpoints de quadras e autenticação.
const CAMPO_PADRAO = 'campo-1';
const QUADRA_PADRAO = 'quadra-1';
const ORGANIZADOR_PADRAO = 'organizador-teste';

const NIVEIS = [
  { valor: 'livre', rotulo: 'Livre' },
  { valor: 'iniciante', rotulo: 'Iniciante' },
  { valor: 'intermediario', rotulo: 'Intermediário' },
  { valor: 'avancado', rotulo: 'Avançado' },
];

const DURACOES = [
  { valor: 60, rotulo: '1h' },
  { valor: 90, rotulo: '1h30' },
  { valor: 120, rotulo: '2h' },
];

const PRAZOS = [
  { valor: 2, rotulo: '2h antes' },
  { valor: 6, rotulo: '6h antes' },
  { valor: 12, rotulo: '12h antes' },
  { valor: 24, rotulo: '24h antes' },
];

export function CriarJogoScreen({ navigation }: Props) {
  const [titulo, setTitulo] = useState('');
  const [nivel, setNivel] = useState('livre');
  const [inicio, setInicio] = useState(() => somarHoras(proximaHoraCheia(), 24));
  const [duracaoMinutos, setDuracaoMinutos] = useState(90);
  const [prazoHorasAntes, setPrazoHorasAntes] = useState(6);
  const [capacidadeTexto, setCapacidadeTexto] = useState('14');
  const [minimoTexto, setMinimoTexto] = useState('10');
  const [precoTexto, setPrecoTexto] = useState('');
  const [publico, setPublico] = useState(true);
  const [custoQuadraTexto, setCustoQuadraTexto] = useState('');
  const [split, setSplit] = useState<SplitVaga | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const fim = useMemo(() => somarMinutos(inicio, duracaoMinutos), [inicio, duracaoMinutos]);
  const prazoConfirmacao = useMemo(() => somarHoras(inicio, -prazoHorasAntes), [inicio, prazoHorasAntes]);

  const capacidade = Number(capacidadeTexto);
  const minimoJogadores = Number(minimoTexto);
  const precoVagaCentavos = lerCentavos(precoTexto);

  // Mesmas regras que o backend aplica em criarJogo — validar aqui só evita ida e volta.
  const erros = useMemo(() => {
    const e: Record<string, string> = {};
    if (!titulo.trim()) e.titulo = 'informe um título';
    if (!Number.isInteger(capacidade) || capacidade < 2 || capacidade > 30) {
      e.capacidade = 'capacidade deve ser inteiro entre 2 e 30';
    }
    if (!Number.isInteger(minimoJogadores) || minimoJogadores <= 0 || minimoJogadores > capacidade) {
      e.minimo = 'mínimo deve ser > 0 e <= capacidade';
    }
    if (precoVagaCentavos === null) e.preco = 'informe um preço válido';
    return e;
  }, [titulo, capacidade, minimoJogadores, precoVagaCentavos]);

  const valido = Object.keys(erros).length === 0;

  function erro(campo: string): string | undefined {
    return tentouEnviar ? erros[campo] : undefined;
  }

  async function calcularSugestao() {
    const custo = lerCentavos(custoQuadraTexto);
    if (custo === null || !Number.isInteger(minimoJogadores) || minimoJogadores <= 0) {
      Alert.alert('Preencha o custo da quadra e o mínimo de jogadores.');
      return;
    }
    try {
      const sugestao = await sugerirPreco({ custoQuadraCentavos: custo, minimoJogadores });
      setPrecoTexto((sugestao.precoVagaCentavos / 100).toFixed(2).replace('.', ','));
      setSplit(sugestao.split);
    } catch (e) {
      Alert.alert('Erro', mensagemDeErro(e));
    }
  }

  async function enviar() {
    setTentouEnviar(true);
    if (!valido || precoVagaCentavos === null) return;

    setEnviando(true);
    try {
      const jogo = await criarJogo({
        campoId: CAMPO_PADRAO,
        quadraId: QUADRA_PADRAO,
        organizadorId: ORGANIZADOR_PADRAO,
        titulo: titulo.trim(),
        nivel,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        capacidade,
        minimoJogadores,
        prazoConfirmacao: prazoConfirmacao.toISOString(),
        precoVagaCentavos,
        publico,
      });

      // Jogo nasce 'rascunho' — só entra na lista pública depois de publicado.
      Alert.alert('Jogo criado', 'Publicar agora para receber inscrições?', [
        { text: 'Deixar como rascunho', style: 'cancel', onPress: () => navigation.goBack() },
        {
          text: 'Publicar',
          onPress: async () => {
            try {
              await publicarJogo(jogo.id);
            } catch (e) {
              Alert.alert('Jogo criado, mas falhou ao publicar', mensagemDeErro(e));
            } finally {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Erro ao criar jogo', mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Campo rotulo="Título" erro={erro('titulo')}>
          <Entrada
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Pelada de quinta"
            temErro={!!erro('titulo')}
          />
        </Campo>

        <Campo rotulo="Nível">
          <Chips opcoes={NIVEIS} valor={nivel} onSelecionar={setNivel} />
        </Campo>

        <Campo rotulo="Início">
          <SeletorDataHora valor={inicio} onChange={setInicio} minimo={new Date()} />
        </Campo>

        <Campo rotulo="Duração" dica={`Termina ${formatarDataHora(fim)}`}>
          <Chips opcoes={DURACOES} valor={duracaoMinutos} onSelecionar={setDuracaoMinutos} />
        </Campo>

        <Campo
          rotulo="Prazo de confirmação"
          dica={`Cancela automaticamente em ${formatarDataHora(prazoConfirmacao)} se não bater o mínimo`}
        >
          <Chips opcoes={PRAZOS} valor={prazoHorasAntes} onSelecionar={setPrazoHorasAntes} />
        </Campo>

        <View style={styles.linha}>
          <View style={styles.metade}>
            <Campo rotulo="Capacidade" erro={erro('capacidade')}>
              <Entrada
                value={capacidadeTexto}
                onChangeText={setCapacidadeTexto}
                keyboardType="number-pad"
                temErro={!!erro('capacidade')}
              />
            </Campo>
          </View>
          <View style={styles.metade}>
            <Campo rotulo="Mínimo" erro={erro('minimo')}>
              <Entrada
                value={minimoTexto}
                onChangeText={setMinimoTexto}
                keyboardType="number-pad"
                temErro={!!erro('minimo')}
              />
            </Campo>
          </View>
        </View>

        <Campo rotulo="Preço da vaga" erro={erro('preco')}>
          <Entrada
            value={precoTexto}
            onChangeText={(t) => {
              setPrecoTexto(t);
              setSplit(null);
            }}
            keyboardType="decimal-pad"
            placeholder="R$ 0,00"
            temErro={!!erro('preco')}
          />
        </Campo>

        <View style={styles.caixaSugestao}>
          <Text style={styles.tituloSecao}>Não sabe quanto cobrar?</Text>
          <Campo rotulo="Custo da locação da quadra">
            <Entrada
              value={custoQuadraTexto}
              onChangeText={setCustoQuadraTexto}
              keyboardType="decimal-pad"
              placeholder="R$ 0,00"
            />
          </Campo>
          <Botao titulo="Sugerir preço" variante="fantasma" onPress={calcularSugestao} />
          {split && (
            <View style={styles.split}>
              <LinhaSplit rotulo="Preço da vaga" valor={split.precoVagaCentavos} />
              <LinhaSplit rotulo="Taxa do jogador" valor={split.taxaServicoCentavos} />
              <LinhaSplit rotulo="Jogador paga" valor={split.totalCobradoCentavos} destaque />
              <LinhaSplit rotulo="Quadra recebe" valor={split.valorQuadraCentavos} />
              <LinhaSplit rotulo="Plataforma" valor={split.receitaPlataformaCentavos} />
            </View>
          )}
        </View>

        <View style={styles.linhaSwitch}>
          <View style={styles.textoSwitch}>
            <Text style={styles.rotuloSwitch}>Jogo público</Text>
            <Text style={styles.dicaSwitch}>Aparece na busca para qualquer jogador</Text>
          </View>
          <Switch value={publico} onValueChange={setPublico} />
        </View>

        <Botao
          titulo={enviando ? 'Criando...' : 'Criar jogo'}
          onPress={enviar}
          desabilitado={enviando}
          estilo={styles.enviar}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LinhaSplit({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <View style={styles.linhaSplit}>
      <Text style={[styles.splitRotulo, destaque && styles.splitDestaque]}>{rotulo}</Text>
      <Text style={[styles.splitValor, destaque && styles.splitDestaque]}>
        {formatarCentavos(valor)}
      </Text>
    </View>
  );
}

function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroApi) {
    const corpo = e.corpo as { erro?: string } | undefined;
    return corpo?.erro ?? `erro ${e.status}`;
  }
  return e instanceof Error ? e.message : 'erro desconhecido';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  conteudo: { padding: 16, gap: 18, paddingBottom: 40 },
  linha: { flexDirection: 'row', gap: 12 },
  metade: { flex: 1 },
  caixaSugestao: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tituloSecao: { fontSize: 15, fontWeight: '700', color: '#111827' },
  split: { gap: 4, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10 },
  linhaSplit: { flexDirection: 'row', justifyContent: 'space-between' },
  splitRotulo: { color: '#6b7280', fontSize: 13 },
  splitValor: { color: '#374151', fontSize: 13 },
  splitDestaque: { color: '#111827', fontWeight: '700' },
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textoSwitch: { flex: 1, paddingRight: 12 },
  rotuloSwitch: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dicaSwitch: { fontSize: 12, color: '#6b7280' },
  enviar: { marginTop: 4 },
});
