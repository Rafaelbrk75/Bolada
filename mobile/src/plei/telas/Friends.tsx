import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores } from '../tema';
import { Abas, Avatar, Cabecalho, CampoBusca } from '../componentes';
import { IconeNovoGrupo, IconeSino } from '../icones';
import { usePlei } from '../estado';

export function TelaFriends({ topo }: { topo: number }) {
  const { abaAmigos, setAbaAmigos, amigos, abrirChatComAmigo, mostrarTorrada } = usePlei();

  return (
    <>
      <Cabecalho
        topo={topo}
        titulo="Amigos"
        acao={
          <Pressable onPress={() => mostrarTorrada('Sem notificações novas')}>
            <IconeSino />
          </Pressable>
        }
      />

      <Abas
        ativa={abaAmigos}
        onSelect={setAbaAmigos}
        itens={[
          { chave: 'friends', rotulo: 'MEUS AMIGOS' },
          { chave: 'contacts', rotulo: 'CONTATOS' },
        ]}
      />

      <View style={{ paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row' }}>
        <CampoBusca texto="Buscar amigos" />
      </View>

      {abaAmigos === 'friends' ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
          <Text style={estilos.secao}>Grupos</Text>
          <Pressable
            onPress={() => mostrarTorrada('Criação de grupo em breve')}
            style={estilos.criarGrupo}
          >
            <IconeNovoGrupo />
            <Text style={estilos.textoCriarGrupo}>Criar grupo</Text>
          </Pressable>

          <Text style={estilos.secao}>Amigos</Text>
          <View style={{ gap: 2 }}>
            {amigos.map((amigo) => (
              <View key={amigo.id} style={estilos.linhaAmigo}>
                <Avatar inicial={amigo.initial} tamanho={44} />
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nome}>{amigo.name}</Text>
                  <Text style={estilos.mutuo}>{amigo.mutual}</Text>
                </View>
                <Pressable onPress={() => abrirChatComAmigo(amigo)} style={estilos.botaoMensagem}>
                  <Text style={estilos.textoBotaoMensagem}>Mensagem</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 30, paddingTop: 60 }}>
          <View style={estilos.esqueleto}>
            <View style={[estilos.barraEsqueleto, { width: 180 }]} />
            <View style={[estilos.barraEsqueleto, { width: 150 }]} />
            <View style={[estilos.barraEsqueleto, { width: 165 }]} />
          </View>
          <Text style={estilos.tituloVazio}>Nenhum contato disponível</Text>
          <Text style={estilos.descricaoVazio}>
            Pra convidar amigos, libere o acesso aos seus contatos.
          </Text>
          <Pressable
            onPress={() => mostrarTorrada('Permissão de contatos solicitada')}
            style={estilos.botaoContatos}
          >
            <Text style={estilos.textoBotaoContatos}>Compartilhar contatos</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  secao: { color: cores.texto, fontSize: 15, fontWeight: '700', marginBottom: 12 },

  criarGrupo: {
    width: 130,
    height: 130,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(74,222,154,0.6)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 22,
  },
  textoCriarGrupo: { color: cores.menta, fontSize: 13, fontWeight: '600' },

  linhaAmigo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: cores.linhaFraca,
  },
  nome: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  mutuo: { color: cores.textoFraco, fontSize: 12 },
  botaoMensagem: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(74,222,154,0.4)',
    borderRadius: 14,
  },
  textoBotaoMensagem: { color: cores.menta, fontSize: 13, fontWeight: '600' },

  esqueleto: { alignItems: 'center', gap: 10, marginBottom: 30, opacity: 0.4 },
  barraEsqueleto: { height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.15)' },
  tituloVazio: { color: cores.texto, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  descricaoVazio: {
    color: cores.textoTenue,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 21,
    textAlign: 'center',
  },
  botaoContatos: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: 'rgba(74,222,154,0.5)',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  textoBotaoContatos: { color: cores.menta, fontSize: 15, fontWeight: '700' },
});
