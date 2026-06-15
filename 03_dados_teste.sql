-- =====================================================================
--  PHARMASYNC - DADOS DE TESTE (SEED)
--  Rodar DEPOIS de criar as tabelas.
--
--  ORDEM OBRIGATORIA (por causa das chaves estrangeiras):
--   1. usuarios  ->  2. farmacias  ->  3. medicamentos
--   ->  4. pedidos  ->  5. itens_pedido
--
--  Lembrete dos padroes:
--   - precos em CENTAVOS (1990 = R$ 19,90)
--   - senha_hash aqui e' so um EXEMPLO de hash bcrypt (nao e' senha real)
--   - CPF/CNPJ sao numeros validos de exemplo, so digitos
-- =====================================================================

USE pharmasync;


-- =====================================================================
--  1) USUARIOS  (1 admin, 2 gestores, 2 consumidores)
--  senha_hash = exemplo de hash bcrypt de "Senha@123"
-- =====================================================================
INSERT INTO usuarios (nome, email, senha_hash, cpf, telefone, data_nascimento, perfil, status) VALUES
('Admin PharmaSync', 'admin@pharmasync.com.br', '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUV1234567890', '11144477735', '61999990000', '1990-01-15', 'ADMIN', 'ATIVO'),
('Carlos Gestor',    'carlos@drogariacentral.com.br', '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUV1234567890', '52998224725', '61988887777', '1985-06-20', 'GESTOR', 'ATIVO'),
('Mariana Gestora',  'mariana@farmaciapopular.com.br', '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUV1234567890', '39053344705', '61977776666', '1988-11-03', 'GESTOR', 'ATIVO'),
('Joao Pedro',       'joao.pedro@email.com', '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUV1234567890', '40442820135', '61966665555', '2000-03-10', 'CONSUMIDOR', 'ATIVO'),
('Ana Souza',        'ana.souza@email.com', '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUV1234567890', '93541134780', '61955554444', '1995-09-25', 'CONSUMIDOR', 'ATIVO');


-- =====================================================================
--  2) FARMACIAS  (2 farmacias, ligadas aos gestores id=2 e id=3)
--  Coordenadas aproximadas de Brasilia/Luziania (regiao do usuario).
-- =====================================================================
INSERT INTO farmacias (gestor_id, razao_social, nome_fantasia, cnpj, email_comercial, telefone, cep, logradouro, numero, bairro, cidade, uf, latitude, longitude, aceita_delivery, raio_entrega_km, status) VALUES
(2, 'Drogaria Central LTDA', 'Drogaria Central', '11222333000181', 'contato@drogariacentral.com.br', '6133334444', '72010100', 'Quadra 1 Conjunto A', '10', 'Setor Central', 'Luziania', 'GO', -16.25280000, -47.95020000, TRUE, 10, 'ATIVO'),
(3, 'Farmacia Popular ME',   'Farmacia Popular',  '44555666000181', 'contato@farmaciapopular.com.br', '6135556666', '72020200', 'Avenida JK', '200', 'Jardim Ingá', 'Luziania', 'GO', -16.03330000, -47.99970000, FALSE, NULL, 'ATIVO');


-- =====================================================================
--  3) MEDICAMENTOS  (catalogo das 2 farmacias)
--  precos em centavos | farmacia_id 1 = Central, 2 = Popular
-- =====================================================================
INSERT INTO medicamentos (farmacia_id, nome_comercial, principio_ativo, sku, ean_gtin, preco_centavos, estoque, estoque_minimo, requer_receita, tipo_controle, posologia_padrao, ativo) VALUES
-- Drogaria Central (farmacia_id = 1)
(1, 'Dipirona 500mg',    'Dipirona Sodica',     'DIP500-C', '7891234567890', 1290, 150, 20, FALSE, NULL, 'Tomar 1 comprimido a cada 6 horas', TRUE),
(1, 'Amoxicilina 500mg', 'Amoxicilina',         'AMOX500-C','7891234567891', 3450, 80,  15, TRUE,  'BRANCA', 'Tomar 1 capsula a cada 8 horas', TRUE),
(1, 'Paracetamol 750mg', 'Paracetamol',         'PARA750-C','7891234567892', 1590, 0,   10, FALSE, NULL, 'Tomar 1 comprimido a cada 8 horas', TRUE),  -- estoque ZERO (some na busca)
(1, 'Rivotril 2mg',      'Clonazepam',          'RIVO2-C',  '7891234567893', 2890, 30,  5,  TRUE,  'AZUL', 'Conforme prescricao medica', TRUE),
-- Farmacia Popular (farmacia_id = 2)
(2, 'Dipirona 500mg',    'Dipirona Sodica',     'DIP500-P', '7891234567890', 1190, 200, 30, FALSE, NULL, 'Tomar 1 comprimido a cada 6 horas', TRUE),
(2, 'Ibuprofeno 600mg',  'Ibuprofeno',          'IBU600-P', '7891234567894', 1990, 120, 20, FALSE, NULL, 'Tomar 1 comprimido a cada 8 horas', TRUE),
(2, 'Losartana 50mg',    'Losartana Potassica', 'LOS50-P',  '7891234567895', 2250, 90,  15, TRUE,  'BRANCA', 'Tomar 1 comprimido ao dia', TRUE);


-- =====================================================================
--  4) PEDIDOS  (1 pedido do Joao Pedro id=4 na Drogaria Central id=1)
--  Total = soma dos itens + frete. Tudo em centavos.
--  2x Dipirona (1290) + 1x Amoxicilina (3450) = 6030 ; frete 500 = 6530
-- =====================================================================
INSERT INTO pedidos (numero_pedido, consumidor_id, farmacia_id, status, tipo_entrega, forma_pagamento, subtotal_centavos, frete_centavos, total_centavos, endereco_entrega) VALUES
('PS-20260613-00000001', 4, 1, 'CONFIRMADO', 'DELIVERY', 'PIX', 6030, 500, 6530, 'Quadra 5 Casa 12, Setor Central, Luziania-GO');


-- =====================================================================
--  5) ITENS_PEDIDO  (itens do pedido id=1)
--  preco_unit congelado = preco no momento da compra
--  medicamento_id 1 = Dipirona Central ; 2 = Amoxicilina Central
-- =====================================================================
INSERT INTO itens_pedido (pedido_id, medicamento_id, quantidade, preco_unit_centavos, subtotal_centavos) VALUES
(1, 1, 2, 1290, 2580),   -- 2x Dipirona = 2580
(1, 2, 1, 3450, 3450);   -- 1x Amoxicilina = 3450


-- =====================================================================
--  FIM DO SEED - banco populado com dados de teste.
-- =====================================================================
