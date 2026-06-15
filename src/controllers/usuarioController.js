// Controller de Usuários
// Contém a lógica de cada ação relacionada a usuários (UC-001)

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
// =====================================================
//  LOGIN (UC-002)
//  Recebe email e senha, confere, e devolve um token JWT.
//  Trata bloqueio apos 5 tentativas erradas (RN-003).
// =====================================================
async function login(req, res) {
  try {
    const { email, senha } = req.body;

    // 1) valida campos obrigatorios
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha sao obrigatorios.' });
    }

    // 2) busca o usuario pelo email (respeitando soft delete)
    const [usuarios] = await db.query(
      'SELECT id, nome, email, senha_hash, perfil, status FROM usuarios WHERE email = ? AND deletado_em IS NULL',
      [email]
    );

    // 3) verifica tentativas recentes erradas (RN-003: 5 erros = bloqueio 15 min)
    const [tentativas] = await db.query(
      `SELECT COUNT(*) AS total FROM tentativas_login
       WHERE email = ? AND sucesso = 0 AND tentado_em > (NOW() - INTERVAL 15 MINUTE)`,
      [email]
    );
    if (tentativas[0].total >= 5) {
      return res.status(429).json({
        erro: 'Muitas tentativas falhas. Tente novamente em 15 minutos.'
      });
    }

    // funcao auxiliar pra registrar a tentativa
    const registrarTentativa = async (sucesso) => {
      await db.query(
        'INSERT INTO tentativas_login (email, sucesso, ip) VALUES (?, ?, ?)',
        [email, sucesso ? 1 : 0, req.ip || null]
      );
    };

    // 4) se nao achou o usuario, registra falha e responde generico
    if (usuarios.length === 0) {
      await registrarTentativa(false);
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    const usuario = usuarios[0];

    // 5) compara a senha enviada com o hash guardado (bcrypt)
    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaConfere) {
      await registrarTentativa(false);
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    // 6) verifica se a conta esta ativa
    if (usuario.status === 'BLOQUEADO') {
      return res.status(403).json({ erro: 'Conta bloqueada. Contate o suporte.' });
    }

    // 7) deu tudo certo: registra sucesso e gera o token JWT
    await registrarTentativa(true);

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, perfil: usuario.perfil }, // dados dentro do token
      process.env.JWT_SECRET,                                            // chave secreta
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }                  // validade
    );

    // 8) responde com o token e os dados do usuario (sem a senha)
    return res.status(200).json({
      mensagem: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        status: usuario.status
      }
    });

  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}
module.exports = { cadastrarUsuario, listarUsuarios, login };