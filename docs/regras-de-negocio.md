# FutMatch — Regras de negócio (v1)

Este documento é a fonte de verdade das regras. Cada regra tem correspondência direta no código (`src/domain`) e nos testes (`test/regras.test.ts`).

## Modelo do negócio

O FutMatch opera como marketplace de vagas no estilo Plei (Modelo A). Um organizador reserva o horário de uma quadra parceira e publica um jogo com capacidade, formato, nível e preço por vaga. Jogadores compram vagas individualmente pelo app. A plataforma processa o pagamento, divide o dinheiro entre quadra e plataforma, e repassa às quadras em ciclos semanais.

## Receita: modelo de taxa dupla

A plataforma ganha dos dois lados da transação, como Airbnb e iFood fazem, o que dilui a percepção de custo e aumenta a margem sem inflar o preço de vitrine.

Do lado do jogador, uma **taxa de serviço de 10%** sobre o preço da vaga, exibida separadamente no checkout ("R$ 20,00 + R$ 2,00 de taxa de serviço"), com piso de R$ 1,00 para vagas baratas. Do lado da quadra, uma **comissão de 10%** retida do valor repassado — negociável por parceiro (campo `comissao_quadra_bps` na tabela `quadras`).

Exemplo com vaga de R$ 20,00 no cartão: o jogador paga R$ 22,00; a quadra recebe R$ 18,00; a plataforma fica com R$ 4,00 brutos e, descontado o custo do gateway (~R$ 1,27), lucra **R$ 2,73 líquidos por vaga** (~12,4% do volume transacionado). Num jogo 9v9 cheio (18 vagas), isso dá cerca de R$ 49 de margem líquida por jogo.

Todos os valores são armazenados e calculados em **centavos (inteiros)**; percentuais em basis points. Float nunca toca em dinheiro.

## Ciclo de vida do jogo

O jogo transita por: rascunho → aberto → confirmado → em andamento → realizado → liquidado, com cancelamento possível até "confirmado". As transições e seus efeitos obrigatórios estão codificados na máquina de estados (`src/domain/jogo.ts`); nenhum serviço altera status diretamente.

A regra que protege o caixa: todo jogo tem `minimo_jogadores` e `prazo_confirmacao`. Se o mínimo de vagas pagas não for atingido até o prazo, o jogo **auto-cancela** e ninguém é efetivamente cobrado (ver política de cobrança abaixo). O preço sugerido da vaga é calculado para que, com o mínimo de jogadores, a locação da quadra já esteja coberta com 15% de folga (`sugerirPrecoVaga`).

## Política de cobrança: autorizar agora, capturar na confirmação

No cartão, a inscrição gera uma **pré-autorização** (o valor fica reservado, não cobrado). A captura só acontece quando o jogo confirma. Se o jogo não bater o mínimo, a autorização é liberada (void) — sem estorno, sem atrito, sem custo de reembolso. No Pix, que não tem pré-autorização, a cobrança é imediata e o reembolso, quando necessário, é instantâneo e de custo desprezível.

## Cancelamento pelo jogador

Com 24 horas ou mais de antecedência, reembolso integral no método original. Entre 6 e 24 horas, o jogador escolhe: 100% em crédito na plataforma (que retém o dinheiro no ecossistema) ou 50% de volta no cartão. Com menos de 6 horas, sem reembolso. Em qualquer faixa, se a vaga liberada for preenchida pela lista de espera antes do jogo, o reembolso vira **integral retroativamente** — a regra que mantém jogos cheios sem punir quem teve imprevisto.

No-show (pagou e não apareceu no check-in) não gera reembolso e conta na reputação, com bloqueio progressivo: aviso na primeira falta, 7 dias na segunda, 30 na terceira, 90 da quarta em diante.

## Lista de espera

Jogo cheio coloca novos interessados em fila ordenada, sem cobrança. Quando abre vaga, o primeiro é promovido e recebe uma janela de 10 minutos para concluir o pagamento; expirou, promove o próximo. A promoção dispara notificação push.

## Repasses às quadras

O valor da quadra em cada transação capturada acumula e é pago em **lote semanal** (tabela `repasses` + `repasse_itens`), reduzindo custo de transferência e simplificando conciliação. Cada repasse referencia as transações que o compõem, permitindo auditoria item a item. O log imutável de eventos (`eventos`) registra toda mudança relevante de estado e é a base da conciliação financeira.

## Confiança e qualidade

Nível autodeclarado (iniciante/intermediário/avançado) filtra a descoberta de jogos. Após cada jogo realizado abre-se janela de avaliação de jogadores e da quadra (nota 1–5). A reputação média, o total de jogos e o histórico de no-shows compõem o perfil público. A barra de completude do perfil (estilo "5/7" do Plei) incentiva foto e dados completos, que aumentam convites.

## Integridade de agenda

Uma constraint de exclusão no PostgreSQL (`jogos_sem_sobreposicao`) impede fisicamente que dois jogos ativos ocupem o mesmo campo em horários sobrepostos — a regra vale mesmo se o código de aplicação falhar.

## Segurança (resumo das decisões)

Login por telefone com OTP; sessões com refresh token em armazenamento seguro; dados de cartão **nunca** tocam o servidor — tokenização direta no SDK do gateway (PCI fica com o gateway); webhooks do gateway validados por assinatura; valores monetários recalculados sempre no backend (o app nunca envia preço); rate limiting nos endpoints de OTP e checkout.
