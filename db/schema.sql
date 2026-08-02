-- ============================================================
-- FutMatch — Schema PostgreSQL (v1)
-- Marketplace de vagas em jogos (modelo Plei / Modelo A)
-- Valores monetários SEMPRE em centavos (integer). Nunca float.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- ---------- ENUMS ----------
CREATE TYPE nivel_jogo        AS ENUM ('iniciante', 'intermediario', 'avancado', 'aberto');
CREATE TYPE formato_jogo      AS ENUM ('5v5', '6v6', '7v7', '9v9', '11v11');
CREATE TYPE status_jogo       AS ENUM ('rascunho', 'aberto', 'confirmado', 'em_andamento', 'realizado', 'liquidado', 'cancelado');
CREATE TYPE status_participacao AS ENUM ('reservada', 'autorizada', 'confirmada', 'em_espera', 'cancelada', 'reembolsada', 'no_show', 'concluida');
CREATE TYPE status_transacao  AS ENUM ('pendente', 'autorizada', 'capturada', 'reembolsada', 'parcialmente_reembolsada', 'falhou', 'expirada');
CREATE TYPE metodo_pagamento  AS ENUM ('cartao', 'pix', 'credito_plataforma');
CREATE TYPE status_repasse    AS ENUM ('pendente', 'processando', 'pago', 'falhou');
CREATE TYPE papel_usuario     AS ENUM ('jogador', 'organizador', 'admin_quadra', 'admin_plataforma');

-- ---------- USUÁRIOS ----------
CREATE TABLE usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone        VARCHAR(20) UNIQUE NOT NULL,          -- login principal (OTP)
  email           VARCHAR(255) UNIQUE,
  nome            VARCHAR(120) NOT NULL,
  foto_url        TEXT,
  posicao         VARCHAR(30),                          -- goleiro, zagueiro, meia, atacante
  nivel           nivel_jogo NOT NULL DEFAULT 'intermediario',
  pais            CHAR(2) NOT NULL DEFAULT 'BR',
  papel           papel_usuario NOT NULL DEFAULT 'jogador',
  perfil_completo_pct SMALLINT NOT NULL DEFAULT 0,      -- barra "5/7" do Plei
  reputacao       NUMERIC(3,2) NOT NULL DEFAULT 5.00,   -- média das avaliações
  jogos_realizados INT NOT NULL DEFAULT 0,
  no_shows        INT NOT NULL DEFAULT 0,
  bloqueado_ate   TIMESTAMPTZ,                          -- punição por no-shows
  gateway_customer_id VARCHAR(64),                      -- id do cliente no gateway
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- QUADRAS PARCEIRAS ----------
CREATE TABLE quadras (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(160) NOT NULL,
  descricao       TEXT,
  endereco        TEXT NOT NULL,
  cidade          VARCHAR(120) NOT NULL,
  uf              CHAR(2) NOT NULL,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  fotos           JSONB NOT NULL DEFAULT '[]',
  comissao_quadra_bps INT NOT NULL DEFAULT 1000,        -- comissão cobrada DA quadra, em basis points (1000 = 10%)
  gateway_account_id  VARCHAR(64),                      -- conta conectada (Stripe Connect / recebedor Pagar.me)
  ativa           BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uma quadra tem N campos (5v5 coberto, society, etc.)
CREATE TABLE campos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quadra_id       UUID NOT NULL REFERENCES quadras(id) ON DELETE CASCADE,
  nome            VARCHAR(120) NOT NULL,                -- "Campo 1 — Society"
  formato_max     formato_jogo NOT NULL,
  coberto         BOOLEAN NOT NULL DEFAULT false,
  preco_hora_centavos INT NOT NULL CHECK (preco_hora_centavos >= 0),
  ativo           BOOLEAN NOT NULL DEFAULT true
);

-- Grade de disponibilidade recorrente do campo
CREATE TABLE disponibilidades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_id        UUID NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
  dia_semana      SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio     TIME NOT NULL,
  hora_fim        TIME NOT NULL,
  CHECK (hora_fim > hora_inicio)
);

-- ---------- JOGOS ----------
CREATE TABLE jogos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_id        UUID NOT NULL REFERENCES campos(id),
  organizador_id  UUID NOT NULL REFERENCES usuarios(id),
  titulo          VARCHAR(160) NOT NULL,                -- "Bushwickinlet 9v9"
  formato         formato_jogo NOT NULL,
  nivel           nivel_jogo NOT NULL DEFAULT 'aberto',
  inicio          TIMESTAMPTZ NOT NULL,
  fim             TIMESTAMPTZ NOT NULL,
  capacidade      SMALLINT NOT NULL CHECK (capacidade BETWEEN 2 AND 30),
  minimo_jogadores SMALLINT NOT NULL,                   -- mínimo p/ confirmar; senão auto-cancela
  prazo_confirmacao TIMESTAMPTZ NOT NULL,               -- deadline p/ bater o mínimo
  preco_vaga_centavos INT NOT NULL CHECK (preco_vaga_centavos >= 0),
  custo_quadra_centavos INT NOT NULL,                   -- quanto a quadra cobra pelo horário (locação cheia)
  status          status_jogo NOT NULL DEFAULT 'rascunho',
  motivo_cancelamento TEXT,
  publico         BOOLEAN NOT NULL DEFAULT true,        -- false = jogo privado de grupo
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fim > inicio),
  CHECK (minimo_jogadores <= capacidade),
  CHECK (prazo_confirmacao <= inicio)
);
CREATE INDEX idx_jogos_descoberta ON jogos (status, inicio) WHERE publico = true;
-- impede dois jogos no mesmo campo com horários sobrepostos
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE jogos ADD CONSTRAINT jogos_sem_sobreposicao
  EXCLUDE USING gist (campo_id WITH =, tstzrange(inicio, fim) WITH &&)
  WHERE (status NOT IN ('cancelado', 'rascunho'));

-- ---------- PARTICIPAÇÕES (jogador <-> jogo) ----------
CREATE TABLE participacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jogo_id         UUID NOT NULL REFERENCES jogos(id),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  status          status_participacao NOT NULL DEFAULT 'reservada',
  posicao_espera  INT,                                  -- ordem na waitlist (NULL se não está em espera)
  checkin_em      TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jogo_id, usuario_id)
);
CREATE INDEX idx_participacoes_jogo ON participacoes (jogo_id, status);

-- ---------- PAGAMENTOS ----------
CREATE TABLE transacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participacao_id UUID NOT NULL REFERENCES participacoes(id),
  metodo          metodo_pagamento NOT NULL,
  status          status_transacao NOT NULL DEFAULT 'pendente',
  -- decomposição do valor (tudo em centavos)
  preco_vaga_centavos      INT NOT NULL,                -- valor base da vaga
  taxa_servico_centavos    INT NOT NULL,                -- taxa cobrada DO jogador (lado da demanda)
  total_cobrado_centavos   INT NOT NULL,                -- preco_vaga + taxa_servico = o que sai do cartão
  comissao_quadra_centavos INT NOT NULL,                -- retido da parte da quadra (lado da oferta)
  custo_gateway_centavos   INT NOT NULL DEFAULT 0,      -- estimativa da taxa do adquirente
  valor_quadra_centavos    INT NOT NULL,                -- o que a quadra efetivamente recebe desta vaga
  receita_plataforma_centavos INT NOT NULL,             -- taxa_servico + comissao_quadra - custo_gateway
  gateway_payment_id       VARCHAR(64),                 -- payment_intent / charge id
  autorizada_em   TIMESTAMPTZ,
  capturada_em    TIMESTAMPTZ,
  reembolsada_em  TIMESTAMPTZ,
  valor_reembolsado_centavos INT NOT NULL DEFAULT 0,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transacoes_participacao ON transacoes (participacao_id);

-- Créditos na plataforma (reembolso em crédito, promoções)
CREATE TABLE creditos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  valor_centavos  INT NOT NULL,                         -- positivo = crédito, negativo = uso
  origem          VARCHAR(60) NOT NULL,                 -- 'reembolso_parcial', 'promo', 'uso_em_jogo'
  referencia_id   UUID,                                 -- transacao/jogo relacionado
  expira_em       TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- REPASSES ÀS QUADRAS (em lote, ciclo semanal) ----------
CREATE TABLE repasses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quadra_id       UUID NOT NULL REFERENCES quadras(id),
  periodo_inicio  DATE NOT NULL,
  periodo_fim     DATE NOT NULL,
  valor_centavos  INT NOT NULL,
  status          status_repasse NOT NULL DEFAULT 'pendente',
  gateway_payout_id VARCHAR(64),
  pago_em         TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quadra_id, periodo_inicio, periodo_fim)
);

-- itens do repasse: cada transação capturada de jogos daquela quadra
CREATE TABLE repasse_itens (
  repasse_id      UUID NOT NULL REFERENCES repasses(id) ON DELETE CASCADE,
  transacao_id    UUID NOT NULL REFERENCES transacoes(id),
  valor_centavos  INT NOT NULL,
  PRIMARY KEY (repasse_id, transacao_id)
);

-- ---------- SOCIAL ----------
CREATE TABLE amizades (
  usuario_a       UUID NOT NULL REFERENCES usuarios(id),
  usuario_b       UUID NOT NULL REFERENCES usuarios(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'pendente', -- pendente | aceita | bloqueada
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_a, usuario_b),
  CHECK (usuario_a < usuario_b)                          -- evita duplicata invertida
);

CREATE TABLE grupos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(120) NOT NULL,
  dono_id         UUID NOT NULL REFERENCES usuarios(id),
  foto_url        TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE grupo_membros (
  grupo_id        UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  papel           VARCHAR(20) NOT NULL DEFAULT 'membro', -- membro | admin
  PRIMARY KEY (grupo_id, usuario_id)
);

CREATE TABLE mensagens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id    UUID NOT NULL REFERENCES usuarios(id),
  destinatario_id UUID REFERENCES usuarios(id),          -- direct
  grupo_id        UUID REFERENCES grupos(id),            -- ou grupo
  jogo_id         UUID REFERENCES jogos(id),             -- ou chat do jogo
  conteudo        TEXT NOT NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(destinatario_id, grupo_id, jogo_id) = 1)
);

CREATE TABLE avaliacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jogo_id         UUID NOT NULL REFERENCES jogos(id),
  avaliador_id    UUID NOT NULL REFERENCES usuarios(id),
  avaliado_id     UUID REFERENCES usuarios(id),          -- avalia jogador...
  quadra_id       UUID REFERENCES quadras(id),           -- ...ou a quadra
  nota            SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario      TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jogo_id, avaliador_id, avaliado_id),
  CHECK (num_nonnulls(avaliado_id, quadra_id) = 1)
);

-- ---------- NOTIFICAÇÕES / AUDITORIA ----------
CREATE TABLE notificacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  tipo            VARCHAR(60) NOT NULL,                  -- 'jogo_confirmado', 'vaga_liberada', ...
  payload         JSONB NOT NULL DEFAULT '{}',
  lida            BOOLEAN NOT NULL DEFAULT false,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- log imutável de eventos de negócio (fonte de verdade p/ conciliação)
CREATE TABLE eventos (
  id              BIGSERIAL PRIMARY KEY,
  tipo            VARCHAR(80) NOT NULL,                  -- 'jogo.confirmado', 'pagamento.capturado', ...
  entidade_id     UUID NOT NULL,
  ator_id         UUID,
  dados           JSONB NOT NULL DEFAULT '{}',
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_eventos_entidade ON eventos (entidade_id, criado_em);
