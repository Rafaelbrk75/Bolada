import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores } from '../tema';
import { Avatar, BarraProgresso, Cabecalho } from '../componentes';
import { IconeEngrenagem } from '../icones';
import { usePlei } from '../estado';

export function TelaProfile({ topo }: { topo: number }) {
  const { perfil, abrirAjustes, abrirEdicaoPerfil } = usePlei();

  return (
    <>
      <Cabecalho
        topo={topo}
        titulo="Perfil"
        acao={
          <Pressable onPress={abrirAjustes}>
            <IconeEngrenagem />
          </Pressable>
        }
      />

      <View style={{ alignItems: 'center', paddingTop: 12, paddingHorizontal: 20 }}>
        <Avatar inicial={perfil.initial} tamanho={100} variante="claro" estilo={{ marginBottom: 14 }} />
        <Text style={estilos.nome}>{perfil.name}</Text>
        <Text style={estilos.pais}>
          {perfil.flag} {perfil.country}
        </Text>
      </View>

      <View style={estilos.cartaoProgresso}>
        <View style={estilos.linhaProgresso}>
          <Text style={estilos.tituloProgresso}>Quase lá!</Text>
          <Text style={estilos.contador}>{perfil.progress}/7</Text>
        </View>
        <View style={{ marginVertical: 12 }}>
          <BarraProgresso progresso={perfil.progress} />
        </View>
        <Text style={estilos.dicaProgresso}>
          Jogadores confiam mais em perfis com foto. Coloque a sua pra ser reconhecido e convidado
          com mais frequência.
        </Text>
        <Pressable onPress={abrirEdicaoPerfil} style={estilos.botaoFinalizar}>
          <Text style={estilos.textoFinalizar}>Completar perfil  ✎</Text>
        </Pressable>
      </View>

      <View style={estilos.linhaAtributos}>
        <View style={estilos.atributo}>
          <Text style={estilos.rotuloAtributo}>
            Posição: <Text style={estilos.valorAtributo}>{perfil.position}</Text>
          </Text>
        </View>
        <View style={estilos.atributo}>
          <Text style={estilos.rotuloAtributo}>
            Nível: <Text style={estilos.selo}> {perfil.skill} </Text>
          </Text>
        </View>
      </View>

      <View style={estilos.painelNumeros}>
        <View style={[estilos.celulaNumero, estilos.comBorda]}>
          <Text style={estilos.emoji}>⚽</Text>
          <Text style={estilos.rotuloNumero}>Jogos</Text>
          <Text style={estilos.numero}>{perfil.games}</Text>
        </View>
        <View style={[estilos.celulaNumero, estilos.comBorda]}>
          <Text style={estilos.emoji}>🏟</Text>
          <Text style={estilos.rotuloNumero}>Quadras</Text>
          <Text style={estilos.numero}>{perfil.facilities}</Text>
        </View>
        <View style={estilos.celulaNumero}>
          <Text style={estilos.emoji}>🕑</Text>
          <Text style={estilos.rotuloNumero}>Horas</Text>
          <Text style={estilos.numero}>{perfil.hours}</Text>
        </View>
      </View>

      <View style={{ padding: 20, paddingBottom: 30 }}>
        <Text style={estilos.tituloAtividade}>Atividade</Text>
        <View style={estilos.cartaoAtividade}>
          <Text style={estilos.textoAtividade}>
            Nenhuma atividade ainda.{' '}
            <Text style={{ color: cores.texto, fontWeight: '600' }}>
              Volte aqui depois do seu primeiro jogo!
            </Text>
          </Text>
        </View>
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  nome: { color: cores.texto, fontSize: 22, fontWeight: '700' },
  pais: { color: cores.textoSuave, fontSize: 14, marginTop: 6 },

  cartaoProgresso: {
    marginTop: 22,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 18,
    padding: 18,
    backgroundColor: cores.preenchimentoCartao,
  },
  linhaProgresso: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tituloProgresso: { color: cores.texto, fontSize: 15, fontWeight: '700' },
  contador: { color: cores.textoSuave, fontSize: 13, fontWeight: '600' },
  dicaProgresso: { color: cores.textoTenue, fontSize: 13, lineHeight: 20 },
  botaoFinalizar: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 22,
    paddingVertical: 13,
    alignItems: 'center',
  },
  textoFinalizar: { color: cores.texto, fontSize: 15, fontWeight: '700' },

  linhaAtributos: { flexDirection: 'row', gap: 12, marginTop: 16, marginHorizontal: 20 },
  atributo: {
    flex: 1,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  rotuloAtributo: { color: cores.textoSuave, fontSize: 14 },
  valorAtributo: { color: cores.texto, fontWeight: '600' },
  selo: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: cores.texto,
    fontWeight: '600',
  },

  painelNumeros: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 16,
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  celulaNumero: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  comBorda: { borderRightWidth: 1, borderRightColor: cores.borda },
  emoji: { fontSize: 18 },
  rotuloNumero: { color: cores.textoSuave, fontSize: 12, marginTop: 6 },
  numero: { color: cores.texto, fontSize: 17, fontWeight: '700', marginTop: 2 },

  tituloAtividade: { color: cores.texto, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  cartaoAtividade: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 16,
    padding: 18,
  },
  textoAtividade: { color: cores.textoTenue, fontSize: 13, lineHeight: 20 },
});
