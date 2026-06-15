// Controller de Avaliações
// Avaliação de pedidos entregues (UC-017)

const db = require('../config/database');

// =====================================================
//  CRIAR AVALIAÇÃO (UC-017)
//  Nota de 1 a 5. Só pra pedido ENTREGUE. Uma por pedido.
// =====================================================
async function criarAvaliacao(req, res) {
  try {
    const { pedido_id, usuario_id, nota, comentario } = req.body;

    // 1) campos obrigatórios
    if (!pedido_id || !usuario_id || nota == null) {
      return res.status(400).json({ erro: 'Campos obrigatorios: pedido_id, usuario_id e nota.' });
    }

    // 2) nota entre 1 e 5
    if (nota < 1 || nota > 5) {
      return res.status(400).json({ erro: 'A nota deve ser entre 1 e 5.' });
    }

    // 3) confere se o pedido existe, é do usuário e está ENTREGUE
    const [pedidos] = await db.query(
      'SELECT id, consumidor_id, farmacia_id, status FROM pedidos WHERE id = ? AND deletado_em IS NULL',
      [pedido_id]
    );
    if (pedidos.length === 0) {
      return res.status(404).json({ erro: 'Pedido nao encontrado.' });
    }

    const pedido = pedidos[0];

    if (pedido.consumidor_id !== usuario_id) {
      return res.status(403).json({ erro: 'Este pedido nao pertence a este usuario.' });
    }

    if (pedido.status !== 'ENTREGUE') {
      return res.status(400).json({ erro: 'So e possivel avaliar pedidos ENTREGUES.' });
    }

    // 4) confere se já não foi avaliado (1 por pedido)
    const [existentes] = await db.query(
      'SELECT id FROM avaliacoes WHERE pedido_id = ?',
      [pedido_id]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ erro: 'Este pedido ja foi avaliado.' });
    }

    // 5) insere a avaliação
    const [resultado] = await db.query(
      `INSERT INTO avaliacoes (pedido_id, usuario_id, farmacia_id, nota, comentario)
       VALUES (?, ?, ?, ?, ?)`,
      [pedido_id, usuario_id, pedido.farmacia_id, nota, comentario || null]
    );

    return res.status(201).json({
      mensagem: 'Avaliacao registrada com sucesso!',
      avaliacao: { id: resultado.insertId, nota, comentario: comentario || null }
    });

  } catch (err) {
    console.error('Erro ao criar avaliacao:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  LISTAR AVALIAÇÕES DE UMA FARMÁCIA (com média)
// =====================================================
async function listarAvaliacoesFarmacia(req, res) {
  try {
    const { farmacia_id } = req.query;
    if (!farmacia_id) {
      return res.status(400).json({ erro: 'Informe o farmacia_id.' });
    }

    const [avaliacoes] = await db.query(
      `SELECT a.id, a.nota, a.comentario, a.criado_em, u.nome AS cliente
       FROM avaliacoes a
       JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.farmacia_id = ?
       ORDER BY a.criado_em DESC`,
      [farmacia_id]
    );

    // calcula a média das notas
    const [media] = await db.query(
      'SELECT AVG(nota) AS media, COUNT(*) AS total FROM avaliacoes WHERE farmacia_id = ?',
      [farmacia_id]
    );

    return res.status(200).json({
      total: media[0].total,
      media: media[0].media ? Number(media[0].media).toFixed(1) : null,
      avaliacoes
    });
  } catch (err) {
    console.error('Erro ao listar avaliacoes:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { criarAvaliacao, listarAvaliacoesFarmacia };