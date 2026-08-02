# FutMatch

Fundação de um marketplace de jogos de futebol no estilo Plei: jogadores compram vagas em jogos organizados em quadras parceiras; a plataforma processa o pagamento e divide o valor entre quadra e plataforma.

## Estrutura

```
db/schema.sql              Schema PostgreSQL completo (usuários, quadras, jogos,
                           participações, transações, repasses, social, eventos)
docs/regras-de-negocio.md  Fonte de verdade das regras, em prosa
src/domain/pagamento.ts    Split de taxa dupla + sugestão de preço de equilíbrio
src/domain/jogo.ts         Máquina de estados do jogo com efeitos declarados
src/domain/cancelamento.ts Faixas de reembolso + punição de no-show
src/domain/waitlist.ts     Fila de espera com janela de pagamento
src/services/inscricao.ts  Fluxo "Join Game": autorizar/capturar/void/refund
test/regras.test.ts        17 testes cobrindo todas as regras acima
```

## Rodar

```bash
npm install
npx tsc && node dist/test/regras.test.js   # roda os testes das regras
psql -f db/schema.sql                      # cria o banco
```

## Decisões-chave

Modelo A (marketplace de vagas) com mínimo de jogadores e auto-cancelamento; receita de taxa dupla (10% do jogador + 10% da quadra); pré-autorização no cartão com captura na confirmação do jogo; Pix cobrado na hora com refund instantâneo; repasses semanais em lote; dinheiro sempre em centavos inteiros.

## Próximos passos

API HTTP (NestJS ou Fastify) por cima dos serviços de domínio; integração real com gateway (Stripe Connect ou Pagar.me, atrás da interface `GatewayPagamento`); app React Native consumindo a API; jobs agendados para `prazo_confirmacao`, promoção de waitlist e fechamento de repasses.
