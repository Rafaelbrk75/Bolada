import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { inscrever, listarParticipacoes, obterJogo } from '../api/jogos';
import { ErroApi } from '../api/cliente';
import { Botao } from '../components/formulario';
import { Jogo, Participacao, RespostaInscricao } from '../types/jogo';
import { RootStackParamList } from '../navigation/tipos';
import { formatarCentavos } from '../utils/moeda';
import { formatarDataHora } from '../utils/data';

type Props = NativeStackScreenProps<RootStackParamList, 'DetalheJogo'>;

// TODO: trocar pelo id do usuário autenticado quando o login existir.
const USUARIO_TESTE = 'usuario-teste';

/** Participações que ocupam vaga de fato (mesma noção de "vagasPagas" do backend). */
const OCUPAM_VAGA = ['autorizada', 'confirmada', 'concluida', 'reservada'];

export function DetalheJogoScreen({ route }: Props) {
  const { jogoId } = route.params;
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [inscrevendo, setInscrevendo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [dadosJogo, dadosParticipacoes] = await Promise.all([
        obterJogo(jogoId),
        listarParticipacoes(jogoId),
      ]);
      setJogo(dadosJogo);
      setParticipacoes(dadosParticipacoes);
    } catch (e) {
      Alert.alert('Erro', mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, [jogoId]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  async function participar(metodo: 'cartao' | 'pix') {
    setInscrevendo(true);
    try {
      const resposta = await inscrever(jogoId, USUARIO_TESTE, metodo);
      Alert.alert(tituloDoResultado(resposta), detalheDoResultado(resposta));
      await carregar();
    } catch (e) {
      Alert.alert('Não foi possível entrar', mensagemDeErro(e));
    } finally {
      setInscrevendo(false);
    }
  }

  if (carregando || !jogo) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator />
      </View>
    );
  }

  const ocupadas = participacoes.filter((p) => OCUPAM_VAGA.includes(p.status)).length;
  const emEspera = participacoes.filter((p) => p.status === 'em_espera').length;
  const aceitaInscricao = jogo.status === 'aberto' || jogo.status === 'confirmado';

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{jogo.titulo}</Text>

      <Linha rotulo="Status" valor={jogo.status.replace('_', ' ')} />
      <Linha rotulo="Nível" valor={jogo.nivel} />
      <Linha rotulo="Início" valor={formatarDataHora(new Date(jogo.inicio))} />
      <Linha rotulo="Fim" valor={formatarDataHora(new Date(jogo.fim))} />
      <Linha rotulo="Vagas" valor={`${ocupadas}/${jogo.capacidade} (mín. ${jogo.minimoJogadores})`} />
      {emEspera > 0 && <Linha rotulo="Fila de espera" valor={`${emEspera}`} />}
      <Linha rotulo="Preço da vaga" valor={formatarCentavos(jogo.precoVagaCentavos)} />
      <Linha
        rotulo="Confirmação até"
        valor={formatarDataHora(new Date(jogo.prazoConfirmacao))}
      />
      {jogo.motivoCancelamento && <Linha rotulo="Motivo" valor={jogo.motivoCancelamento} />}

      {aceitaInscricao ? (
        <View style={styles.acoes}>
          <Botao
            titulo={inscrevendo ? 'Processando...' : 'Entrar via Pix'}
            variante="secundario"
            desabilitado={inscrevendo}
            onPress={() => participar('pix')}
          />
          <Botao
            titulo={inscrevendo ? 'Processando...' : 'Entrar via Cartão'}
            desabilitado={inscrevendo}
            onPress={() => participar('cartao')}
          />
        </View>
      ) : (
        <Text style={styles.aviso}>Este jogo não está aceitando inscrições.</Text>
      )}
    </View>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

function tituloDoResultado({ resultado }: RespostaInscricao): string {
  if (resultado.situacao === 'em_espera') return 'Você entrou na fila de espera';
  if (resultado.jogoConfirmou) return 'Jogo confirmado!';
  return resultado.situacao === 'paga' ? 'Pagamento feito' : 'Vaga reservada';
}

function detalheDoResultado({ resultado }: RespostaInscricao): string {
  if (resultado.situacao === 'em_espera') {
    return 'Nada foi cobrado. Você é avisado se abrir vaga.';
  }
  const total = formatarCentavos(resultado.split.totalCobradoCentavos);
  return resultado.situacao === 'paga'
    ? `Cobrado ${total} (vaga + taxa de serviço).`
    : `Pré-autorizado ${total}. A cobrança só acontece quando o jogo confirmar.`;
}

function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroApi) {
    const corpo = e.corpo as { erro?: string } | undefined;
    return corpo?.erro ?? `erro ${e.status}`;
  }
  return e instanceof Error ? e.message : 'erro desconhecido';
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: 16, gap: 10, backgroundColor: '#fff' },
  titulo: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rotulo: { color: '#6b7280', fontSize: 15 },
  valor: { color: '#111827', fontSize: 15, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  acoes: { marginTop: 24, gap: 12 },
  aviso: { marginTop: 24, color: '#6b7280', fontStyle: 'italic' },
});
