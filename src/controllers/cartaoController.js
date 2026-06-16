// Controller de Cartões Salvos
// Salva apenas token e últimos 4 dígitos - NUNCA o número completo nem CVV (RN-010, RN-011)

const db = require('../config/database');

// =====================================================
//  SALVAR CARTÃO (UC-010)
//  IMPORTANTE: por seguranca, NAO recebemos o numero do cartao
//  nem o CVV. Apenas o token do gateway e os ultimos 4 digitos.
// =====================================================
async function salvarCartao(req, res) {
  try {
    const { usuario_id, token_gateway, ultimos4, bandeira, validade_mes, validade_ano, padrao } = req.body;

    // 1) campos obrigatórios
    if (!usuario_id || !token_gateway || !ultimos4) {
      return res.status(400).json({ erro: 'Campos obrigatorios: usuario_id, token_gateway e ultimos4.' });
    }

    // 2) ultimos4 precisa ter exatamente 4 dígitos
    if (!/^\d{4}$/.test(ultimos4)) {
      return res.status(400).json({ erro: 'ultimos4 deve conter exatamente 4 digitos.' });
    }

    // 3) confere se o usuário existe
    const [usuarios] = await db.query(
      'SELECT id FROM usuarios WHERE id = ? AND deletado_em IS NULL',
      [usuario_id]
    );
    if (usuarios.length === 0) {
      return res.status(404).json({ erro: 'Usuario nao encontrado.' });
    }

    // 4) se for marcado como padrão, desmarca os outros
    if (padrao) {
      await db.query('UPDATE cartoes_salvos SET padrao = FALSE WHERE usuario_id = ?', [usuario_id]);
    }

    // 5) salva o cartão (só dados não-sensíveis)
    const [resultado] = await db.query(
      `INSERT INTO cartoes_salvos (usuario_id, token_gateway, ultimos4, bandeira, validade_mes, validade_ano, padrao)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, token_gateway, ultimos4, bandeira || null, validade_mes || null, validade_ano || null, padrao ? 1 : 0]
    );

    return res.status(201).json({
      mensagem: 'Cartao salvo com sucesso!',
      cartao: { id: resultado.insertId, ultimos4, bandeira: bandeira || null, padrao: !!padrao }
    });

  } catch (err) {
    console.error('Erro ao salvar cartao:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  LISTAR CARTÕES DE UM USUÁRIO
//  Retorna só dados seguros (nunca expõe o token completo).
// =====================================================
async function listarCartoes(req, res) {
  try {
    const { usuario_id } = req.query;
    if (!usuario_id) {
      return res.status(400).json({ erro: 'Informe o usuario_id.' });
    }

    const [cartoes] = await db.query(
      `SELECT id, ultimos4, bandeira, validade_mes, validade_ano, padrao
       FROM cartoes_salvos
       WHERE usuario_id = ? AND deletado_em IS NULL
       ORDER BY padrao DESC, id`,
      [usuario_id]
    );

    return res.status(200).json({ total: cartoes.length, cartoes });
  } catch (err) {
    console.error('Erro ao listar cartoes:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  REMOVER CARTÃO (soft delete - RN-013)
// =====================================================
async function removerCartao(req, res) {
  try {
    const { id } = req.params;

    const [resultado] = await db.query(
      'UPDATE cartoes_salvos SET deletado_em = NOW() WHERE id = ? AND deletado_em IS NULL',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Cartao nao encontrado.' });
    }

    return res.status(200).json({ mensagem: 'Cartao removido.', id: Number(id) });
  } catch (err) {
    console.error('Erro ao remover cartao:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { salvarCartao, listarCartoes, removerCartao };