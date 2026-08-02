import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores } from '../tema';
import { Abas, Avatar, Cabecalho, CampoBusca } from '../componentes';
import { IconeBalaoVazio, IconeLapis } from '../icones';
import { usePlei } from '../estado';

export function TelaMessages({ topo }: { topo: number }) {
  const { abaMensagens, setAbaMensagens, conversas, abrirConversa, mostrarTorrada } = usePlei();
  const listaDireta = abaMensagens === 'direct' ? conversas : [];

  return (
    <>
      <Cabecalho
        topo={topo}
        titulo="Mensagens"
        acao={
          <Pressable onPress={() => mostrarTorrada('Escolha um amigo pra começar')}>
            <IconeLapis />
          </Pressable>
        }
      />

      <Abas
        ativa={abaMensagens}
        onSelect={setAbaMensagens}
        itens={[
          { chave: 'direct', rotulo: 'DIRETAS' },
          { chave: 'groups', rotulo: 'GRUPOS' },
        ]}
      />

      <View style={{ paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row' }}>
        <CampoBusca texto="Buscar amigos" />
      </View>

      {abaMensagens === 'groups' ? (
        <View style={estilos.vazio}>
          <Text style={estilos.tituloVazio}>Nenhum grupo</Text>
          <Text style={estilos.descricaoVazio}>Crie um grupo com seus amigos pra conversarem juntos.</Text>
        </View>
      ) : listaDireta.length === 0 ? (
        <View style={estilos.vazio}>
          <View style={{ marginBottom: 18, opacity: 0.9 }}>
            <IconeBalaoVazio />
          </View>
          <Text style={estilos.tituloVazio}>Nenhuma mensagem</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20 }}>
          {listaDireta.map((c) => (
            <Pressable key={c.id} onPress={() => abrirConversa(c.id)} style={estilos.linha}>
              <Avatar inicial={c.initial} tamanho={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={estilos.nome}>{c.name}</Text>
                <Text style={estilos.previa} numberOfLines={1}>
                  {c.lastText}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  vazio: { paddingHorizontal: 30, paddingTop: 60, alignItems: 'center' },
  tituloVazio: { color: cores.texto, fontSize: 19, fontWeight: '700' },
  descricaoVazio: { color: cores.textoFraco, fontSize: 14, marginTop: 8, textAlign: 'center' },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: cores.linhaFraca,
  },
  nome: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  previa: { color: cores.textoFraco, fontSize: 13 },
});
