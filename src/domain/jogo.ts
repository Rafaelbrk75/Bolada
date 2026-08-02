/**
 * Máquina de estados do JOGO. Toda mudança de status passa por aqui —
 * o serviço de aplicação nunca seta status direto no banco.
 */

export type StatusJogo =
  | 'rascunho'
  | 'aberto'
  | 'confirmado'
  | 'em_andamento'
  | 'realizado'
  | 'liquidado'
  | 'cancelado';

export type EventoJogo =
  | 'publicar'            // organizador publica o rascunho
  | 'atingir_minimo'      // nº de vagas pagas >= minimo_jogadores
  | 'prazo_sem_minimo'    // deadline passou sem bater o mínimo
  | 'cancelar_manual'     // clima, quadra indisponível, decisão do organizador
  | 'iniciar'             // horário de início chegou
  | 'finalizar'           // horário de fim passou
  | 'liquidar';           // transações conciliadas e incluídas em repasse

/** Efeitos que o serviço DEVE executar após a transição (contrato explícito). */
export type EfeitoJogo =
  | 'notificar_jogadores_confirmacao'
  | 'capturar_pagamentos_autorizados'
  | 'liberar_autorizacoes'        // void nas pré-autorizações de cartão
  | 'reembolsar_pagamentos'       // devolve capturas (Pix / cartão capturado)
  | 'notificar_cancelamento'
  | 'abrir_janela_avaliacao'
  | 'registrar_no_shows'
  | 'incluir_em_repasse';

interface Transicao {
  para: StatusJogo;
  efeitos: EfeitoJogo[];
}

const TRANSICOES: Record<StatusJogo, Partial<Record<EventoJogo, Transicao>>> = {
  rascunho: {
    publicar: { para: 'aberto', efeitos: [] },
    cancelar_manual: { para: 'cancelado', efeitos: [] },
  },
  aberto: {
    atingir_minimo: {
      para: 'confirmado',
      efeitos: ['capturar_pagamentos_autorizados', 'notificar_jogadores_confirmacao'],
    },
    prazo_sem_minimo: {
      para: 'cancelado',
      efeitos: ['liberar_autorizacoes', 'reembolsar_pagamentos', 'notificar_cancelamento'],
    },
    cancelar_manual: {
      para: 'cancelado',
      efeitos: ['liberar_autorizacoes', 'reembolsar_pagamentos', 'notificar_cancelamento'],
    },
  },
  confirmado: {
    iniciar: { para: 'em_andamento', efeitos: [] },
    cancelar_manual: {
      // após confirmado, todo mundo já foi cobrado -> reembolso integral
      para: 'cancelado',
      efeitos: ['reembolsar_pagamentos', 'notificar_cancelamento'],
    },
  },
  em_andamento: {
    finalizar: {
      para: 'realizado',
      efeitos: ['registrar_no_shows', 'abrir_janela_avaliacao'],
    },
  },
  realizado: {
    liquidar: { para: 'liquidado', efeitos: ['incluir_em_repasse'] },
  },
  liquidado: {},
  cancelado: {},
};

export function transicionar(
  atual: StatusJogo,
  evento: EventoJogo
): Transicao {
  const t = TRANSICOES[atual][evento];
  if (!t) {
    throw new Error(`Transição inválida: ${atual} --${evento}-->`);
  }
  return t;
}

export function transicaoValida(atual: StatusJogo, evento: EventoJogo): boolean {
  return Boolean(TRANSICOES[atual][evento]);
}
