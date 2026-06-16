// Controller de Receitas Médicas
// Envio pelo consumidor e validação pelo gestor (UC-012)

const db = require('../config/database');

// =====================================================
//  ENVIAR RECEITA (UC-012)
//  O consumidor envia a receita (arquivo + dados do médico).
//  Entra com status PENDENTE.
// =====================================================
async function enviarReceita(req, res) {
  try {
    const { usuario_id, pedido_id, arquivo, tipo_receita, nome_medico, crm_medico, data_emissao } = req.body;

    // 1) campos obrigatórios
    if (!usuario_id || !arquivo || !tipo_receita || !nome_medico || !crm_medico || !data_emissao) {
      return res.status(400).json({
        erro: 'Campos obrigatorios: usuario_id, arquivo, tipo_receita, nome_medico, crm_medico e data_emissao.'
      });
    }

    // 2) tipo de receita válido
    const tiposValidos = ['BRANCA_SIMPLES', 'AZUL', 'AMARELA', 'VERMELHA'];
    if (!tiposValidos.includes(tipo_receita)) {
      return res.status(400).json({ erro: 'tipo_receita invalido.' });
    }

    // 3) data de emissão não pode ser futura
    if (new Date(data_emissao) > new Date()) {
      return res.status(400).json({ erro: 'A data de emissao nao pode ser no futuro.' });
    }

    // 4) confere se o usuário existe
    const [usuarios] = await db.query(
      'SELECT id FROM usuarios WHERE id = ? AND deletado_em IS NULL',
      [usuario_id]
    );
    if (usuarios.length === 0) {
      return res.status(404).json({ erro: 'Usuario nao encontrado.' });
    }

    // 5) insere a receita (status PENDENTE)
    const [resultado] = await db.query(
      `INSERT INTO receitas (usuario_id, pedido_id, arquivo, tipo_receita, nome_medico, crm_medico, data_emissao, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE')`,
      [usuario_id, pedido_id || null, arquivo, tipo_receita, nome_medico, crm_medico, data_emissao]
    );

    return res.status(201).json({
      mensagem: 'Receita enviada! Aguardando validacao da farmacia.',
      receita: { id: resultado.insertId, tipo_receita, status: 'PENDENTE' }
    });

  } catch (err) {
    console.error('Erro ao enviar receita:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  LISTAR RECEITAS
//  Por padrão lista as de um usuário. Aceita ?status=PENDENTE.
// =====================================================
async function listarReceitas(req, res) {
  try {
    const { usuario_id, status } = req.query;

    let sql = `SELECT id, usuario_id, pedido_id, tipo_receita, nome_medico, crm_medico,
                      data_emissao, status, motivo_rejeicao, criado_em
               FROM receitas WHERE 1=1`;
    const params = [];

    if (usuario_id) { sql += ' AND usuario_id = ?'; params.push(usuario_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY criado_em DESC';

    const [receitas] = await db.query(sql, params);
    return res.status(200).json({ total: receitas.length, receitas });
  } catch (err) {
    console.error('Erro ao listar receitas:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  VALIDAR / REJEITAR RECEITA (UC-012 - gestor)
// =====================================================
async function validarReceita(req, res) {
  try {
    const { id } = req.params;
    const { acao, motivo_rejeicao } = req.body;

    if (!acao || !['VALIDAR', 'REJEITAR'].includes(acao)) {
      return res.status(400).json({ erro: 'Acao invalida. Use VALIDAR ou REJEITAR.' });
    }

    // se for rejeitar, precisa do motivo
    if (acao === 'REJEITAR' && !motivo_rejeicao) {
      return res.status(400).json({ erro: 'Informe o motivo da rejeicao.' });
    }

    const novoStatus = acao === 'VALIDAR' ? 'VALIDADA' : 'REJEITADA';

    const [resultado] = await db.query(
      'UPDATE receitas SET status = ?, motivo_rejeicao = ? WHERE id = ?',
      [novoStatus, acao === 'REJEITAR' ? motivo_rejeicao : null, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Receita nao encontrada.' });
    }

    return res.status(200).json({ mensagem: `Receita ${novoStatus.toLowerCase()}!`, id: Number(id), status: novoStatus });
  } catch (err) {
    console.error('Erro ao validar receita:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { enviarReceita, listarReceitas, validarReceita };