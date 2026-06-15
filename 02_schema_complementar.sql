-- =====================================================================
--  PHARMASYNC - TABELAS COMPLEMENTARES (as 12 restantes da Secao 5)
--  SGBD: MySQL 8.0  |  Rodar DEPOIS do schema MVP (as 5 primeiras)
--
--  Mantem os mesmos padroes do MVP:
--   IDs INT AUTO_INCREMENT | precos em centavos (RN-014) | datas UTC (RN-015)
--   soft delete via deletado_em (RN-013) | InnoDB | utf8mb4
-- =====================================================================

USE pharmasync;


-- =====================================================================
--  6) enderecos  (TB_ENDERECOS / UC-007)
--  Ate 5 enderecos por consumidor; um marcado como principal.
-- =====================================================================
CREATE TABLE enderecos (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id    INT          NOT NULL,
    apelido       VARCHAR(50)  NULL,            -- ex: "Casa", "Trabalho"
    cep           CHAR(8)      NOT NULL,
    logradouro    VARCHAR(150) NOT NULL,
    numero        VARCHAR(20)  NOT NULL,
    complemento   VARCHAR(100) NULL,
    bairro        VARCHAR(100) NOT NULL,
    cidade        VARCHAR(100) NOT NULL,
    uf            CHAR(2)      NOT NULL,
    principal     BOOLEAN      NOT NULL DEFAULT FALSE,   -- endereco principal
    criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
    deletado_em   DATETIME     NULL,            -- soft delete (UC-007 exige)

    CONSTRAINT fk_enderecos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  7) horarios_farmacia  (TB_HORARIOS_FARMACIA / UC-004)
--  Horario de funcionamento por dia da semana.
-- =====================================================================
CREATE TABLE horarios_farmacia (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    farmacia_id   INT     NOT NULL,
    dia_semana    TINYINT NOT NULL,            -- 0=Dom, 1=Seg ... 6=Sab
    hora_abertura TIME    NULL,                -- HH:MM
    hora_fechamento TIME  NULL,
    fechado       BOOLEAN NOT NULL DEFAULT FALSE,  -- dia que nao abre

    CONSTRAINT fk_horarios_farmacia
        FOREIGN KEY (farmacia_id) REFERENCES farmacias(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_horarios_dia CHECK (dia_semana BETWEEN 0 AND 6),
    -- um registro por dia por farmacia
    CONSTRAINT uq_horarios_farmacia_dia UNIQUE (farmacia_id, dia_semana)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  8) historico_precos  (TB_HISTORICO_PRECOS / UC-005, RN-014)
--  Cada alteracao de preco vira um registro (com responsavel e data).
-- =====================================================================
CREATE TABLE historico_precos (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    medicamento_id      INT  NOT NULL,
    preco_antigo_centavos INT NULL,            -- pode ser NULL no 1o registro
    preco_novo_centavos INT  NOT NULL,
    alterado_por        INT  NULL,             -- usuario gestor que mudou (FK)
    alterado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_histprecos_medicamento
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_histprecos_usuario
        FOREIGN KEY (alterado_por) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  9) cartoes_salvos  (TB_CARTOES_SALVOS / UC-010, RN-010, RN-011)
--  Guarda APENAS token do gateway + ultimos 4 digitos. NUNCA CVV/numero.
-- =====================================================================
CREATE TABLE cartoes_salvos (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT          NOT NULL,
    token_gateway   VARCHAR(255) NOT NULL,      -- token retornado pelo gateway
    ultimos4        CHAR(4)      NOT NULL,       -- ex: "1234"
    bandeira        VARCHAR(30)  NULL,           -- Visa, Mastercard...
    validade_mes    TINYINT      NULL,           -- 1-12
    validade_ano    SMALLINT     NULL,           -- ex: 2027
    padrao          BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletado_em     DATETIME     NULL,           -- soft delete

    CONSTRAINT fk_cartoes_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_cartoes_mes CHECK (validade_mes BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  10) notas_fiscais  (TB_NOTAS_FISCAIS / UC-011)
--  Uma nota por pedido (1:1). Pode ser gerada pelo sistema ou PDF da farmacia.
-- =====================================================================
CREATE TABLE notas_fiscais (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id       INT          NOT NULL,
    farmacia_id     INT          NOT NULL,
    numero_nota     VARCHAR(50)  NOT NULL,       -- sequencial do sistema ou da farmacia
    valor_total_centavos INT     NOT NULL,
    arquivo_pdf     VARCHAR(255) NULL,           -- caminho/UUID do PDF (upload da farmacia)
    emitida_em      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_notas_pedido UNIQUE (pedido_id),   -- 1 nota por pedido
    CONSTRAINT fk_notas_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_notas_farmacia
        FOREIGN KEY (farmacia_id) REFERENCES farmacias(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  11) receitas  (TB_RECEITAS / UC-012)
--  Receita enviada pelo consumidor; validada manualmente pelo gestor.
-- =====================================================================
CREATE TABLE receitas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT          NOT NULL,        -- quem enviou
    pedido_id       INT          NULL,            -- vinculada a um pedido (pode ser depois)
    arquivo         VARCHAR(255) NOT NULL,        -- caminho/UUID do arquivo (storage privado)
    tipo_receita    ENUM('BRANCA_SIMPLES','AZUL','AMARELA','VERMELHA') NOT NULL,
    nome_medico     VARCHAR(100) NOT NULL,
    crm_medico      VARCHAR(20)  NOT NULL,        -- ex: CRM-SP 123456
    data_emissao    DATE         NOT NULL,        -- nao pode ser futura (validado na API)
    status          ENUM('PENDENTE','VALIDADA','REJEITADA') NOT NULL DEFAULT 'PENDENTE',
    motivo_rejeicao VARCHAR(255) NULL,            -- preenchido se rejeitada
    criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_receitas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_receitas_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  12) agenda_medicacao  (TB_AGENDA_MEDICACAO / UC-014)
--  Configuracao do lembrete de um medicamento para um usuario.
-- =====================================================================
CREATE TABLE agenda_medicacao (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT          NOT NULL,
    medicamento_id  INT          NULL,            -- vem do pedido (pode ser manual = NULL)
    frequencia      ENUM('6H','8H','12H','24H','PERSONALIZADO') NOT NULL,
    horario_inicial TIME         NOT NULL,        -- ex: 08:00
    data_inicio     DATE         NOT NULL,
    data_fim        DATE         NULL,            -- vazio = continuo
    observacao      VARCHAR(255) NULL,            -- ex: "tomar com agua"
    ativo           BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
    deletado_em     DATETIME     NULL,

    CONSTRAINT fk_agenda_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_agenda_medicamento
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  13) lembretes  (TB_LEMBRETES / UC-014)
--  Cada disparo individual de uma agenda (status tomado/ignorado).
-- =====================================================================
CREATE TABLE lembretes (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    agenda_id           INT      NOT NULL,
    horario_previsto    DATETIME NOT NULL,        -- quando deve tocar (UTC)
    status              ENUM('PENDENTE','TOMADO','IGNORADO') NOT NULL DEFAULT 'PENDENTE',
    respondido_em       DATETIME NULL,            -- quando o usuario marcou

    CONSTRAINT fk_lembretes_agenda
        FOREIGN KEY (agenda_id) REFERENCES agenda_medicacao(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  14) cupons  (TB_CUPONS / UC-016)
--  Cupons de desconto criados pelo admin, com regras de uso/validade.
-- =====================================================================
CREATE TABLE cupons (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    codigo              VARCHAR(40)  NOT NULL,     -- ex: "BEMVINDO10"
    descricao           VARCHAR(150) NULL,
    tipo_desconto       ENUM('PERCENTUAL','VALOR_FIXO') NOT NULL,
    valor_desconto      INT          NOT NULL,     -- % (ex:10) OU centavos (ex:500=R$5)
    valor_minimo_centavos INT        NULL,         -- pedido minimo p/ usar
    validade_inicio     DATETIME     NULL,
    validade_fim        DATETIME     NULL,
    limite_uso          INT          NULL,         -- quantas vezes pode ser usado no total
    usos_atuais         INT          NOT NULL DEFAULT 0,
    ativo               BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletado_em         DATETIME     NULL,

    CONSTRAINT uq_cupons_codigo UNIQUE (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  15) avaliacoes  (TB_AVALIACOES / UC-017)
--  Avaliacao 1-5 de um pedido ENTREGUE. 1 avaliacao por pedido.
-- =====================================================================
CREATE TABLE avaliacoes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id       INT          NOT NULL,
    usuario_id      INT          NOT NULL,
    farmacia_id     INT          NOT NULL,
    nota            TINYINT      NOT NULL,         -- 1 a 5 estrelas
    comentario      VARCHAR(500) NULL,            -- opcional, max 500
    criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_avaliacoes_pedido UNIQUE (pedido_id),  -- 1 por pedido
    CONSTRAINT fk_avaliacoes_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_avaliacoes_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_avaliacoes_farmacia
        FOREIGN KEY (farmacia_id) REFERENCES farmacias(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_avaliacoes_nota CHECK (nota BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  16) tentativas_login  (TB_TENTATIVAS_LOGIN / RN-003)
--  Conta tentativas erradas por e-mail p/ bloqueio (5 erros = 15 min).
-- =====================================================================
CREATE TABLE tentativas_login (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(150) NOT NULL,        -- e-mail tentado (mesmo se nao existir)
    sucesso         BOOLEAN      NOT NULL,        -- a tentativa deu certo?
    ip              VARCHAR(45)  NULL,            -- IPv4/IPv6 de origem
    tentado_em      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- indice p/ contar rapidamente erros recentes por e-mail
    INDEX idx_tentativas_email_data (email, tentado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  17) logs_auditoria  (TB_LOGS_AUDITORIA / UC-016, Secao 6)
--  Quem fez o que e quando. Retido por 5 anos (LGPD).
-- =====================================================================
CREATE TABLE logs_auditoria (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,  -- BIGINT: cresce muito
    usuario_id      INT          NULL,            -- quem fez (NULL se sistema)
    acao            VARCHAR(100) NOT NULL,        -- ex: "LOGIN", "APROVAR_FARMACIA"
    entidade        VARCHAR(60)  NULL,            -- ex: "pedidos", "farmacias"
    entidade_id     INT          NULL,            -- id do registro afetado
    detalhes        JSON         NULL,            -- dados extras (MySQL 8.0 suporta JSON)
    ip              VARCHAR(45)  NULL,
    criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_logs_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_logs_data (criado_em),
    INDEX idx_logs_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
--  FIM - agora o banco tem as 17 tabelas da Secao 5 completas.
-- =====================================================================
