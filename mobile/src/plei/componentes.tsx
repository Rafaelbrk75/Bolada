import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { cores } from './tema';
import { IconeLupa } from './icones';
import { NIVEIS } from './dados';

export function Cabecalho({
  titulo,
  acao,
  topo,
}: {
  titulo: string;
  acao?: React.ReactNode;
  topo: number;
}) {
  return (
    <View style={[estilos.cabecalho, { paddingTop: topo + 22 }]}>
      <View style={{ width: 36 }} />
      <Text style={estilos.tituloCabecalho}>{titulo}</Text>
      <View style={estilos.acaoCabecalho}>{acao}</View>
    </View>
  );
}

export function CampoBusca({ texto, estilo }: { texto: string; estilo?: ViewStyle }) {
  return (
    <View style={[estilos.busca, estilo]}>
      <IconeLupa size={16} color="rgba(255,255,255,0.5)" />
      <Text style={estilos.textoBusca}>{texto}</Text>
    </View>
  );
}

export function Abas<T extends string>({
  itens,
  ativa,
  onSelect,
}: {
  itens: { chave: T; rotulo: string }[];
  ativa: T;
  onSelect(chave: T): void;
}) {
  return (
    <View style={estilos.abas}>
      {itens.map((item) => {
        const selecionada = item.chave === ativa;
        return (
          <Pressable key={item.chave} onPress={() => onSelect(item.chave)}>
            <Text
              style={[
                estilos.aba,
                {
                  color: selecionada ? cores.menta : cores.textoFraco,
                  borderBottomColor: selecionada ? cores.menta : 'transparent',
                },
              ]}
            >
              {item.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({
  inicial,
  tamanho,
  variante = 'menta',
  estilo,
}: {
  inicial: string;
  tamanho: number;
  variante?: 'menta' | 'claro';
  estilo?: ViewStyle;
}) {
  const claro = variante === 'claro';
  return (
    <View
      style={[
        {
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: claro ? cores.avatarFundo : cores.avatarMenta,
          alignItems: 'center',
          justifyContent: 'center',
        },
        estilo,
      ]}
    >
      <Text
        style={{
          color: claro ? cores.avatarTexto : cores.menta,
          fontWeight: '700',
          fontSize: Math.round(tamanho * 0.38),
        }}
      >
        {inicial}
      </Text>
    </View>
  );
}

export function BotaoPrimario({
  rotulo,
  onPress,
  estilo,
}: {
  rotulo: string;
  onPress(): void;
  estilo?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={[estilos.botaoPrimario, estilo]}>
      <Text style={estilos.textoBotaoPrimario}>{rotulo}</Text>
    </Pressable>
  );
}

export function BotaoTexto({
  rotulo,
  onPress,
  estilo,
}: {
  rotulo: string;
  onPress(): void;
  estilo?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={estilo}>
      <Text style={estilos.botaoTexto}>{rotulo}</Text>
    </Pressable>
  );
}

export function Campo(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="rgba(255,255,255,0.4)"
      {...props}
      style={[estilos.campo, props.style]}
    />
  );
}

export function SeletorNivel({
  valor,
  onSelect,
}: {
  valor: string;
  onSelect(nivel: string): void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {NIVEIS.map((nivel) => {
        const ativo = valor === nivel;
        return (
          <Pressable
            key={nivel}
            onPress={() => onSelect(nivel)}
            style={[
              estilos.opcaoNivel,
              {
                backgroundColor: ativo ? cores.menta : cores.preenchimento,
                borderColor: ativo ? cores.menta : cores.bordaCampo,
              },
            ]}
          >
            <Text
              style={{
                color: ativo ? cores.sobreMenta : 'rgba(255,255,255,0.8)',
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {nivel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BarraProgresso({
  progresso,
  altura = 7,
  largura,
}: {
  progresso: number;
  altura?: number;
  largura?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: altura === 7 ? 5 : 4, width: largura }}>
      {Array.from({ length: 7 }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: altura,
            borderRadius: altura / 2,
            backgroundColor: i < progresso ? cores.menta : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </View>
  );
}

export function Divisor({ margemVertical = 12 }: { margemVertical?: number }) {
  return <View style={{ height: 1, backgroundColor: cores.linha, marginVertical: margemVertical }} />;
}

export function AlcaFolha() {
  return <View style={estilos.alca} />;
}

export function EstadoVazio({
  titulo,
  descricao,
  acima,
  abaixo,
}: {
  titulo: string;
  descricao?: string;
  acima?: React.ReactNode;
  abaixo?: React.ReactNode;
}) {
  return (
    <View style={estilos.vazio}>
      {acima}
      <Text style={estilos.tituloVazio}>{titulo}</Text>
      {descricao ? <Text style={estilos.descricaoVazio}>{descricao}</Text> : null}
      {abaixo}
    </View>
  );
}

/** ScrollView horizontal sem barra, usado nos chips de data. */
export function FaixaHorizontal({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 18 }}
    >
      {children}
    </ScrollView>
  );
}

export const estilos = StyleSheet.create({
  cabecalho: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tituloCabecalho: { color: cores.texto, fontSize: 22, fontWeight: '700' },
  acaoCabecalho: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  busca: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: cores.preenchimento,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  textoBusca: { color: cores.textoFraco, fontSize: 15 },

  abas: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 6,
    gap: 26,
    borderBottomWidth: 1,
    borderBottomColor: cores.linha,
  },
  aba: {
    paddingBottom: 12,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    borderBottomWidth: 2,
  },

  botaoPrimario: {
    backgroundColor: cores.menta,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  textoBotaoPrimario: { color: cores.sobreMenta, fontSize: 16, fontWeight: '700' },
  botaoTexto: { color: cores.textoFraco, fontSize: 14, textAlign: 'center' },

  campo: {
    backgroundColor: cores.preenchimento,
    borderWidth: 1,
    borderColor: cores.bordaCampo,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: cores.texto,
    fontSize: 15,
  },

  opcaoNivel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },

  alca: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },

  vazio: { paddingHorizontal: 30, paddingTop: 60, alignItems: 'center' },
  tituloVazio: { color: cores.texto, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  descricaoVazio: {
    color: cores.textoTenue,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 21,
    textAlign: 'center',
  },
});
