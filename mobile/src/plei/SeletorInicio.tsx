import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cores } from './tema';

/**
 * Início do jogo em dois trilhos de chips (dia e horário) no lugar do picker
 * nativo: fica no tema escuro da folha e funciona igual em iOS, Android e web.
 */
export function SeletorInicio({
  valor,
  onChange,
  dias = 14,
}: {
  valor: Date;
  onChange(data: Date): void;
  dias?: number;
}) {
  const opcoesDia = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: dias }, (_, i) => {
      const d = new Date(base.getTime() + i * 86_400_000);
      return {
        data: d,
        chave: d.toDateString(),
        rotulo: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      };
    });
  }, [dias]);

  // 06:00 às 23:30, de meia em meia hora.
  const opcoesHora = useMemo(() => {
    const lista: { minutos: number; rotulo: string }[] = [];
    for (let m = 6 * 60; m <= 23 * 60 + 30; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      lista.push({
        minutos: m,
        rotulo: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      });
    }
    return lista;
  }, []);

  const diaSelecionado = valor.toDateString();
  const minutosSelecionados = valor.getHours() * 60 + valor.getMinutes();

  function trocarDia(dia: Date) {
    const nova = new Date(dia);
    nova.setHours(valor.getHours(), valor.getMinutes(), 0, 0);
    onChange(nova);
  }

  function trocarHora(minutos: number) {
    const nova = new Date(valor);
    nova.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
    onChange(nova);
  }

  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.trilho}>
        {opcoesDia.map((opcao) => {
          const ativo = opcao.chave === diaSelecionado;
          return (
            <Pressable
              key={opcao.chave}
              onPress={() => trocarDia(opcao.data)}
              style={[estilos.chip, ativo && estilos.chipAtivo]}
            >
              <Text style={[estilos.texto, ativo && estilos.textoAtivo]}>{opcao.rotulo}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.trilho}>
        {opcoesHora.map((opcao) => {
          const ativo = opcao.minutos === minutosSelecionados;
          return (
            <Pressable
              key={opcao.minutos}
              onPress={() => trocarHora(opcao.minutos)}
              style={[estilos.chip, ativo && estilos.chipAtivo]}
            >
              <Text style={[estilos.texto, ativo && estilos.textoAtivo]}>{opcao.rotulo}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  trilho: { gap: 8, paddingRight: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.bordaCampo,
    backgroundColor: cores.preenchimento,
  },
  chipAtivo: { backgroundColor: cores.menta, borderColor: cores.menta },
  texto: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  textoAtivo: { color: cores.sobreMenta },
});
