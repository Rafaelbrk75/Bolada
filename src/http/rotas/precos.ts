import { FastifyInstance } from 'fastify';
import { calcularSplitVaga, sugerirPrecoVaga } from '../../domain/pagamento';
import { ErroRequisicaoInvalida } from '../../app/erros';

const splitSchema = {
  body: {
    type: 'object',
    required: ['precoVagaCentavos'],
    properties: { precoVagaCentavos: { type: 'integer' } },
  },
};

const sugestaoSchema = {
  body: {
    type: 'object',
    required: ['custoQuadraCentavos', 'minimoJogadores'],
    properties: {
      custoQuadraCentavos: { type: 'integer' },
      minimoJogadores: { type: 'integer' },
      folgaBps: { type: 'integer' },
    },
  },
};

export function registrarRotasPrecos(app: FastifyInstance): void {
  app.post('/precos/split', { schema: splitSchema }, async (req) => {
    const { precoVagaCentavos } = req.body as { precoVagaCentavos: number };
    try {
      return calcularSplitVaga(precoVagaCentavos);
    } catch (e) {
      throw new ErroRequisicaoInvalida((e as Error).message);
    }
  });

  app.post('/precos/sugestao', { schema: sugestaoSchema }, async (req) => {
    const { custoQuadraCentavos, minimoJogadores, folgaBps } = req.body as {
      custoQuadraCentavos: number;
      minimoJogadores: number;
      folgaBps?: number;
    };
    try {
      const precoVagaCentavos =
        folgaBps === undefined
          ? sugerirPrecoVaga(custoQuadraCentavos, minimoJogadores)
          : sugerirPrecoVaga(custoQuadraCentavos, minimoJogadores, undefined, folgaBps);
      return { precoVagaCentavos, split: calcularSplitVaga(precoVagaCentavos) };
    } catch (e) {
      throw new ErroRequisicaoInvalida((e as Error).message);
    }
  });
}
