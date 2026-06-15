-- =====================================================================
--  PHARMASYNC - BANCO DE DADOS (MVP - Dia 2 do cronograma)
--  SGBD: MySQL 8.0
--  Tabelas essenciais: usuarios, farmacias, medicamentos, pedidos, itens
--
--  Padroes aplicados (conforme Documento Tecnico v6 - Secao 4):
--   - IDs:      INT AUTO_INCREMENT          (NUNCA sintaxe SQLite)
--   - Precos:   INT em CENTAVOS             (RN-014, evita erro decimal)
--   - Datas:    DATETIME em UTC             (RN-015)
--   - Delete:   coluna deletado_em (soft)   (RN-013, nunca apaga)
--   - Unicos:   CPF, CNPJ, e-mail UNIQUE     (RN-001)
--   - Senha:    campo p/ hash bcrypt         (Secao 6, nunca texto puro)
--   - Engine:   InnoDB  | Charset: utf8mb4
-- =====================================================================

-- 1) Cria o banco (se ainda nao existir) e seleciona ele
CREATE DATABASE IF NOT EXISTS pharmasync
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pharmasync;


-- =====================================================================
--  TABELA 1: usuarios
--  Armazena consumidores, gestores e admins (campo 'perfil' diferencia).
--  Referencia: TB_USUARIOS / UC-001 / UC-003
-- =====================================================================
CREATE TABLE usuarios (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(150)  NOT NULL,
    email           VARCHAR(150)  NOT NULL,
    senha_hash      VARCHAR(255)  NOT NULL,         -- bcrypt (NUNCA senha pura)
    cpf             CHAR(11)      NULL,             -- 11 digitos, sem pontuacao
    telefone        VARCHAR(20)   NULL,
    data_nascimento DATE          NULL,             -- regra dos 18 anos (validada na API)
    perfil          ENUM('CONSUMIDOR','GESTOR','ADMIN') NOT NULL DEFAULT 'CONSUMIDOR',
    status          ENUM('PENDENTE','ATIVO','BLOQUEADO') NOT NULL DEFAULT 'PENDENTE',
    criado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- UTC
    atualizado_em   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    deletado_em     DATETIME      NULL,             -- soft delete (RN-013)

    -- unicidade (RN-001 / ERR-005 / ERR-006)
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT uq_usuarios_cpf   UNIQUE (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  TABELA 2: farmacias
--  Dados da farmacia + localizacao (lat/lon) para busca geografica.
--  Referencia: TB_FARMACIAS / UC-004
-- =====================================================================
CREATE TABLE farmacias (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    gestor_id         INT           NOT NULL,        -- dono/gestor (FK -> usuarios)
    razao_social      VARCHAR(150)  NOT NULL,
    nome_fantasia     VARCHAR(150)  NOT NULL,
    cnpj              CHAR(14)      NOT NULL,         -- 14 digitos, sem pontuacao
    email_comercial   VARCHAR(150)  NOT NULL,
    telefone          VARCHAR(20)   NOT NULL,
    cep               CHAR(8)       NOT NULL,
    logradouro        VARCHAR(150)  NOT NULL,
    numero            VARCHAR(20)   NOT NULL,
    bairro            VARCHAR(100)  NOT NULL,
    cidade            VARCHAR(100)  NOT NULL,
    uf                CHAR(2)       NOT NULL,
    latitude          DECIMAL(10,8) NULL,            -- coordenada p/ raio de busca
    longitude         DECIMAL(11,8) NULL,
    aceita_delivery   BOOLEAN       NOT NULL DEFAULT FALSE,
    raio_entrega_km   INT           NULL,            -- obrigatorio se aceita_delivery (validado na API)
    status            ENUM('PENDENTE','ATIVO','REJEITADO','INATIVO') NOT NULL DEFAULT 'PENDENTE',
    criado_em         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    deletado_em       DATETIME      NULL,            -- soft delete (RN-013)

    CONSTRAINT uq_farmacias_cnpj UNIQUE (cnpj),
    CONSTRAINT fk_farmacias_gestor
        FOREIGN KEY (gestor_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT          -- nao deixa apagar usuario que e gestor
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  TABELA 3: medicamentos
--  Catalogo de cada farmacia, com preco (centavos) e estoque.
--  Referencia: TB_MEDICAMENTOS / UC-005
-- =====================================================================
CREATE TABLE medicamentos (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    farmacia_id       INT           NOT NULL,        -- dono do item (FK -> farmacias)
    nome_comercial    VARCHAR(150)  NOT NULL,
    principio_ativo   VARCHAR(200)  NOT NULL,
    sku               VARCHAR(60)   NOT NULL,        -- codigo interno (unico por farmacia)
    ean_gtin          VARCHAR(13)   NULL,            -- codigo de barras (8/12/13 digitos)
    preco_centavos    INT           NOT NULL,        -- RN-014: preco em centavos (ex: 1990 = R$19,90)
    estoque           INT           NOT NULL DEFAULT 0,
    estoque_minimo    INT           NULL,            -- alerta de estoque baixo
    requer_receita    BOOLEAN       NOT NULL DEFAULT FALSE,
    tipo_controle     ENUM('BRANCA','AZUL','AMARELA','VERMELHA') NULL, -- se requer_receita
    posologia_padrao  VARCHAR(255)  NULL,            -- usado p/ agenda de medicacao
    ativo             BOOLEAN       NOT NULL DEFAULT TRUE,  -- inativo some da busca
    criado_em         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    deletado_em       DATETIME      NULL,            -- soft delete (RN-013)

    -- SKU unico DENTRO da farmacia (duas farmacias podem repetir o mesmo SKU)
    CONSTRAINT uq_medicamentos_sku_farmacia UNIQUE (farmacia_id, sku),
    CONSTRAINT fk_medicamentos_farmacia
        FOREIGN KEY (farmacia_id) REFERENCES farmacias(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    -- preco e estoque nunca negativos (UC-005)
    CONSTRAINT chk_medicamentos_preco   CHECK (preco_centavos > 0),
    CONSTRAINT chk_medicamentos_estoque CHECK (estoque >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- indice para acelerar a busca por nome/principio (UC-006)
CREATE INDEX idx_medicamentos_busca
    ON medicamentos (nome_comercial, principio_ativo);


-- =====================================================================
--  TABELA 4: pedidos
--  Cabecalho do pedido: status, pagamento, valores e enderecos.
--  Referencia: TB_PEDIDOS / UC-009 / UC-013
-- =====================================================================
CREATE TABLE pedidos (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    numero_pedido       VARCHAR(25)   NOT NULL,      -- formato PS-AAAAMMDD-XXXXXXXX
    consumidor_id       INT           NOT NULL,      -- quem comprou (FK -> usuarios)
    farmacia_id         INT           NOT NULL,      -- de qual farmacia (FK -> farmacias)
    status              ENUM('AGUARDANDO_PAGAMENTO','AGUARDANDO_CONFIRMACAO',
                             'CONFIRMADO','EM_SEPARACAO','SAIU_PARA_ENTREGA',
                             'PRONTO_PARA_RETIRADA','ENTREGUE','CANCELADO')
                        NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    tipo_entrega        ENUM('DELIVERY','RETIRADA') NOT NULL,
    forma_pagamento     ENUM('CREDITO','DEBITO','PIX','BOLETO') NOT NULL,
    subtotal_centavos   INT           NOT NULL,      -- soma dos itens (RN-014)
    frete_centavos      INT           NOT NULL DEFAULT 0,
    total_centavos      INT           NOT NULL,      -- subtotal + frete
    -- endereco "congelado" no momento da compra (texto), p/ historico fiel
    endereco_entrega    VARCHAR(255)  NULL,
    criado_em           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,
    deletado_em         DATETIME      NULL,          -- soft delete (RN-013)

    CONSTRAINT uq_pedidos_numero UNIQUE (numero_pedido),
    CONSTRAINT fk_pedidos_consumidor
        FOREIGN KEY (consumidor_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_pedidos_farmacia
        FOREIGN KEY (farmacia_id) REFERENCES farmacias(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  TABELA 5: itens_pedido
--  Linhas de cada pedido. Guarda o PRECO DO MOMENTO da compra
--  (nao o preco atual do medicamento) - exigencia da TB_ITENS_PEDIDO.
--  Referencia: TB_ITENS_PEDIDO / UC-009
-- =====================================================================
CREATE TABLE itens_pedido (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id              INT          NOT NULL,    -- a qual pedido pertence (FK)
    medicamento_id         INT          NOT NULL,    -- qual medicamento (FK)
    quantidade             INT          NOT NULL,    -- max 10 (validado na API - UC-008)
    -- preco congelado: copia do preco no instante da compra
    preco_unit_centavos    INT          NOT NULL,
    subtotal_centavos      INT          NOT NULL,    -- quantidade * preco_unit
    criado_em              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_itens_pedido_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,          -- apagou pedido -> apaga itens junto
    CONSTRAINT fk_itens_pedido_medicamento
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_itens_quantidade CHECK (quantidade > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  FIM DO SCHEMA MVP
--  Proximas tabelas (enderecos, receitas, cartoes, etc.) entram
--  conforme o backend evoluir, sem quebrar estas.
-- =====================================================================
