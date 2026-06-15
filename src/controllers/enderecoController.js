// Controller de Endereços
// Cadastro e listagem de endereços do usuário (UC-007)

const db = require('../config/database');

// =====================================================
//  CADASTRAR ENDEREÇO (UC-007)
//  Até 5 endereços por usuário. Se marcar como principal,
//  desmarca os outros.
// =====================================================
async function cadastrarEndereco(req, res) {
  const conexao = await db.getConnection();
  try {
    const { usuario_id, apelido, cep, logradouro, numero, complemento, bairro, cidade, uf, principal } = req.body;

    // 1) campos obrigatórios
    if (!usuario_id || !cep || !logradouro || !numero || !bairro || !cidade || !uf) {
      return res.status(400).json({ erro: 'Preencha todos os campos obrigatorios do endereco.' });
    }

    // 2) confere se o usuário existe
    const [usuarios] = await conexao.query(
      'SELECT id FROM usuarios WHERE id = ? AND deletado_em IS NULL',
      [usuario_id]
    );
    if (usuarios.length === 0) {
      return res.status(404).json({ erro: 'Usuario nao encontrado.' });
    }

    // 3) limite de 5 endereços por usuário (RN do UC-007)
    const [contagem] = await conexao.query(
      'SELECT COUNT(*) AS total FROM enderecos WHERE usuario_id = ? AND deletado_em IS NULL',
      [usuario_id]
    );
    if (contagem[0].total >= 5) {
      return res.status(409).json({ erro: 'Limite de 5 enderecos por usuario atingido.' });
    }

    await conexao.beginTransaction();

    // 4) se este vai ser o principal, desmarca os outros
    if (principal) {
      await conexao.query(
        'UPDATE enderecos SET principal = FALSE WHERE usuario_id = ?',
        [usuario_id]
      );
    }

    // 5) insere o endereço
    const cepLimpo = cep.replace(/\D/g, '');
    const [resultado] = await conexao.query(
      `INSERT INTO enderecos (usuario_id, apelido, cep, logradouro, numero, complemento, bairro, cidade, uf, principal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, apelido || null, cepLimpo, logradouro, numero, complemento || null, bairro, cidade, uf, principal ? 1 : 0]
    );

    await conexao.commit();

    return res.status(201).json({
      mensagem: 'Endereco cadastrado com sucesso!',
      endereco: { id: resultado.insertId, apelido: apelido || null, principal: !!principal }
    });

  } catch (err) {
    await conexao.rollback();
    console.error('Erro ao cadastrar endereco:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  } finally {
    conexao.release();
  }
}

// =====================================================
//  LISTAR ENDEREÇOS DE UM USUÁRIO
// =====================================================
async function listarEnderecos(req, res) {
  try {
    const { usuario_id } = req.query;
    if (!usuario_id) {
      return res.status(400).json({ erro: 'Informe o usuario_id.' });
    }

    const [enderecos] = await db.query(
      `SELECT id, apelido, cep, logradouro, numero, complemento, bairro, cidade, uf, principal
       FROM enderecos
       WHERE usuario_id = ? AND deletado_em IS NULL
       ORDER BY principal DESC, id`,
      [usuario_id]
    );

    return res.status(200).json({ total: enderecos.length, enderecos });
  } catch (err) {
    console.error('Erro ao listar enderecos:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  EXCLUIR ENDEREÇO (soft delete - RN-013)
// =====================================================
async function excluirEndereco(req, res) {
  try {
    const { id } = req.params;

    const [resultado] = await db.query(
      'UPDATE enderecos SET deletado_em = NOW() WHERE id = ? AND deletado_em IS NULL',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Endereco nao encontrado.' });
    }

    return res.status(200).json({ mensagem: 'Endereco removido.', id: Number(id) });
  } catch (err) {
    console.error('Erro ao excluir endereco:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { cadastrarEndereco, listarEnderecos, excluirEndereco };