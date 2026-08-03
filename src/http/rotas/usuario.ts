import { FastifyInstance } from 'fastify';
import { JogoAppService } from '../../app/jogoAppService';

// Perfil/reputação do jogador (no-shows, jogos realizados, bloqueio) —
// separado de repasses.ts porque este é dado do jogador, não de backoffice.
const TAG = ['Usuário'];

export function registrarRotasUsuario(app: FastifyInstance, service: JogoAppService): void {
  app.get(
    '/usuarios/:id',
    { schema: { tags: TAG, summary: 'Obtém o perfil/reputação de um usuário' } },
    async (req) => {
      const { id } = req.params as { id: string };
      return service.obterUsuario(id);
    }
  );
}
