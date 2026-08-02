/**
 * Implementação fake de GatewayPagamento pra rodar a API sem um gateway real
 * (Stripe Connect / Pagar.me) conectado ainda. Gera ids determinísticos e
 * nunca falha — troca pela integração real atrás da mesma interface.
 */

import { randomUUID } from 'node:crypto';
import { GatewayPagamento } from '../../services/inscricao';

export class GatewayPagamentoFake implements GatewayPagamento {
  async autorizar(_usuarioGatewayId: string, _valorCentavos: number): Promise<string> {
    return `auth_${randomUUID()}`;
  }

  async capturar(_paymentId: string): Promise<void> {}

  async liberarAutorizacao(_paymentId: string): Promise<void> {}

  async cobrarPix(_usuarioGatewayId: string, _valorCentavos: number): Promise<string> {
    return `pix_${randomUUID()}`;
  }

  async reembolsar(_paymentId: string, _valorCentavos: number): Promise<void> {}
}
