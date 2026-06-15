// Controller de Medicamentos
// Cadastro e listagem do catálogo (UC-005)

const db = require('../config/database');

// =====================================================
//  CADASTRAR MEDICAMENTO (UC-005)
//  O gestor adiciona um medicamento ao catálogo da farmácia.
// =====================================================
async function cadastrarMedicamento(req, res) {
  try {
    const {
      farmacia_id, nome_comercial, principio_ativo, sku, ean_gtin,
      preco_centavos, estoque, estoque_minimo, requer_receita,
      tipo_controle, posologia_padrao
    } = req.body;

    // 1) valida campos obrigatórios
    if (!farmacia_id || !nome_comercial || !principio_ativo || !sku || preco_centavos == null) {
      return res.status(400).json({
        erro: 'Campos obrigatorios: farmacia_id, nome_comercial, principio_ativo, sku e preco_centavos.'
      });
    }

    // 2) preço precisa ser positivo (RN-014)
    if (preco_centavos <= 0) {
      return res.status(400).json({ erro: 'O preco deve ser maior que zero.' });
    }

    // 3) estoque não pode ser negativo
    if (estoque != null && estoque < 0) {
      return res.status(400).json({ erro: 'O estoque nao pode ser negativo.' });
    }

    // 4) confere se a farmácia existe e está ativa
    const [farmacias] = await db.query(
      'SELECT id, status FROM farmacias WHERE id = ? AND deletado_em IS NULL',
      [farmacia_id]
    );
    if (farmacias.length === 0) {
      return res.status(404).json({ erro: 'Farmacia nao encontrada.' });
    }

    // 5) confere se já existe esse SKU na mesma farmácia (RN: SKU único por farmácia)
    const [existentes] = await db.query(
      'SELECT id FROM medicamentos WHERE farmacia_id = ? AND sku = ?',
      [farmacia_id, sku]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ erro: 'Ja existe um medicamento com esse SKU nesta farmacia.' });
    }

    // 6) insere o medicamento
    const [resultado] = await db.query(
      `INSERT INTO medicamentos
       (farmacia_id, nome_comercial, principio_ativo, sku, ean_gtin, preco_centavos,
        estoque, estoque_minimo, requer_receita, tipo_controle, posologia_padrao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmacia_id, nome_comercial, principio_ativo, sku, ean_gtin || null,
        preco_centavos, estoque || 0, estoque_minimo || null,
        requer_receita ? 1 : 0, tipo_controle || null, posologia_padrao || null
      ]
    );

    // 7) responde com sucesso
    return res.status(201).json({
      mensagem: 'Medicamento cadastrado com sucesso!',
      medicamento: {
        id: resultado.insertId,
        nome_comercial,
        preco_centavos,
        estoque: estoque || 0
      }
    });

  } catch (err) {
    console.error('Erro ao cadastrar medicamento:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  LISTAR MEDICAMENTOS
//  Lista o catálogo. Por padrão, só mostra os com estoque
//  e ativos (RN-005: oculta sem estoque).
// =====================================================
async function listarMedicamentos(req, res) {
  try {
    // permite filtrar por farmácia via query string (?farmacia_id=1)
    const { farmacia_id } = req.query;

    let sql = `
      SELECT m.id, m.nome_comercial, m.principio_ativo, m.preco_centavos,
             m.estoque, m.requer_receita, f.nome_fantasia AS farmacia
      FROM medicamentos m
      JOIN farmacias f ON f.id = m.farmacia_id
      WHERE m.ativo = TRUE
        AND m.estoque > 0
        AND m.deletado_em IS NULL
    `;
    const params = [];

    if (farmacia_id) {
      sql += ' AND m.farmacia_id = ?';
      params.push(farmacia_id);
    }

    sql += ' ORDER BY m.nome_comercial';

    const [medicamentos] = await db.query(sql, params);
    return res.status(200).json(medicamentos);

  } catch (err) {
    console.error('Erro ao listar medicamentos:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}
// =====================================================
//  BUSCAR MEDICAMENTOS (UC-006) - O CORAÇÃO DO APP
//  Busca por nome ou princípio ativo e retorna as
//  farmácias que têm, ordenadas pelo MENOR preço.
// =====================================================
async function buscarMedicamentos(req, res) {
  try {
    // o termo de busca vem na query string: ?termo=dipirona
    const { termo } = req.query;

    // 1) valida que veio um termo de busca
    if (!termo || termo.trim().length < 2) {
      return res.status(400).json({
        erro: 'Informe um termo de busca com pelo menos 2 caracteres.'
      });
    }

    // 2) busca por nome comercial OU princípio ativo (parcial, com LIKE)
    //    só traz com estoque e ativos (RN-005), ordenado pelo mais barato
    const termoBusca = `%${termo.trim()}%`;
    const [resultados] = await db.query(
      `SELECT m.id, m.nome_comercial, m.principio_ativo, m.preco_centavos,
              m.estoque, m.requer_receita,
              f.id AS farmacia_id, f.nome_fantasia AS farmacia,
              f.cidade, f.uf, f.aceita_delivery
       FROM medicamentos m
       JOIN farmacias f ON f.id = m.farmacia_id
       WHERE (m.nome_comercial LIKE ? OR m.principio_ativo LIKE ?)
         AND m.ativo = TRUE
         AND m.estoque > 0
         AND m.deletado_em IS NULL
         AND f.status = 'ATIVO'
       ORDER BY m.preco_centavos ASC`,
      [termoBusca, termoBusca]
    );

    // 3) responde com os resultados + quantos foram encontrados
    return res.status(200).json({
      termo: termo.trim(),
      total: resultados.length,
      resultados
    });

  } catch (err) {
    console.error('Erro ao buscar medicamentos:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}
module.exports = { cadastrarMedicamento, listarMedicamentos, buscarMedicamentos };