// Controller de Usuários
// Contém a lógica de cada ação relacionada a usuários (UC-001)

const bcrypt = require('bcrypt');
const db = require('../config/database');
const { cpfValido, emailValido, senhaForte, maiorDeIdade } = require('../utils/validacoes');

// CADASTRAR USUÁRIO (UC-001)
async function cadastrarUsuario(req, res) {
  try {
    // 1) pega os dados que vieram do app (corpo da requisição)
    const { nome, email, senha, cpf, telefone, data_nascimento } = req.body;

    // 2) valida campos obrigatórios
    if (!nome || !email || !senha || !cpf || !data_nascimento) {
      return res.status(400).json({
        erro: 'Campos obrigatorios faltando: nome, email, senha, cpf e data_nascimento.'
      });
    }

    // 3) valida cada regra de negócio
    if (!emailValido(email)) {
      return res.status(400).json({ erro: 'E-mail invalido.' });
    }
    if (!cpfValido(cpf)) {
      return res.status(400).json({ erro: 'CPF invalido.' });
    }
    if (!senhaForte(senha)) {
      return res.status(400).json({
        erro: 'Senha fraca. Use no minimo 8 caracteres, com maiuscula, minuscula, numero e simbolo.'
      });
    }
    if (!maiorDeIdade(data_nascimento)) {
      return res.status(400).json({ erro: 'E necessario ter 18 anos ou mais.' });
    }

    // 4) limpa o CPF pra guardar só dígitos (CHAR(11) no banco)
    const cpfLimpo = cpf.replace(/\D/g, '');

    // 5) verifica se email ou CPF já existem (RN-001 - únicos)
    const [existentes] = await db.query(
      'SELECT id FROM usuarios WHERE email = ? OR cpf = ?',
      [email, cpfLimpo]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ erro: 'E-mail ou CPF ja cadastrado.' });
    }

    // 6) criptografa a senha (NUNCA guardar texto puro)
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    // 7) insere o usuário no banco
    const [resultado] = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, cpf, telefone, data_nascimento, perfil, status)
       VALUES (?, ?, ?, ?, ?, ?, 'CONSUMIDOR', 'PENDENTE')`,
      [nome, email, senhaHash, cpfLimpo, telefone || null, data_nascimento]
    );

    // 8) responde com sucesso (NUNCA devolve a senha)
    return res.status(201).json({
      mensagem: 'Usuario cadastrado com sucesso!',
      usuario: {
        id: resultado.insertId,
        nome,
        email,
        perfil: 'CONSUMIDOR',
        status: 'PENDENTE'
      }
    });

  } catch (err) {
    console.error('Erro ao cadastrar usuario:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// LISTAR USUÁRIOS (auxiliar, pra testar)
async function listarUsuarios(req, res) {
  try {
    const [usuarios] = await db.query(
      `SELECT id, nome, email, cpf, perfil, status, criado_em
       FROM usuarios
       WHERE deletado_em IS NULL
       ORDER BY id`
    );
    return res.status(200).json(usuarios);
  } catch (err) {
    console.error('Erro ao listar usuarios:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { cadastrarUsuario, listarUsuarios };