// Controller de Farmácias
// Cadastro e aprovação (UC-004)

const db = require('../config/database');

// valida CNPJ pelo algoritmo oficial
function cnpjValido(cnpj) {
  if (!cnpj) return false;
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calc = (base, pesos) => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) soma += parseInt(base[i]) * pesos[i];
    const r = 11 - (soma % 11);
    return r >= 10 ? 0 : r;
  };
  const p1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const p2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  const d1 = calc(cnpj, p1);
  if (d1 !== parseInt(cnpj[12])) return false;
  const d2 = calc(cnpj, p2);
  return d2 === parseInt(cnpj[13]);
}

// =====================================================
//  CADASTRAR FARMÁCIA (UC-004)
//  Um gestor cadastra a farmácia. Entra com status PENDENTE
//  (precisa ser aprovada por um admin depois).
// =====================================================
async function cadastrarFarmacia(req, res) {
  try {
    const {
      gestor_id, razao_social, nome_fantasia, cnpj, email_comercial,
      telefone, cep, logradouro, numero, bairro, cidade, uf,
      latitude, longitude, aceita_delivery, raio_entrega_km
    } = req.body;

    // 1) campos obrigatórios
    if (!gestor_id || !razao_social || !nome_fantasia || !cnpj || !email_comercial ||
        !telefone || !cep || !logradouro || !numero || !bairro || !cidade || !uf) {
      return res.status(400).json({ erro: 'Preencha todos os campos obrigatorios da farmacia.' });
    }

    // 2) valida CNPJ (RN-001)
    if (!cnpjValido(cnpj)) {
      return res.status(400).json({ erro: 'CNPJ invalido.' });
    }

    // 3) se aceita delivery, precisa do raio de entrega
    if (aceita_delivery && (!raio_entrega_km || raio_entrega_km <= 0)) {
      return res.status(400).json({ erro: 'Informe o raio de entrega para delivery.' });
    }

    // 4) confere se o gestor existe e é GESTOR
    const [gestores] = await db.query(
      "SELECT id, perfil FROM usuarios WHERE id = ? AND deletado_em IS NULL",
      [gestor_id]
    );
    if (gestores.length === 0) {
      return res.status(404).json({ erro: 'Usuario gestor nao encontrado.' });
    }

    // 5) confere CNPJ duplicado (RN-001)
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const [existentes] = await db.query(
      'SELECT id FROM farmacias WHERE cnpj = ?',
      [cnpjLimpo]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ erro: 'Ja existe uma farmacia com esse CNPJ.' });
    }

    // 6) insere a farmácia (status PENDENTE)
    const cepLimpo = cep.replace(/\D/g, '');
    const [resultado] = await db.query(
      `INSERT INTO farmacias
       (gestor_id, razao_social, nome_fantasia, cnpj, email_comercial, telefone,
        cep, logradouro, numero, bairro, cidade, uf, latitude, longitude,
        aceita_delivery, raio_entrega_km, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE')`,
      [gestor_id, razao_social, nome_fantasia, cnpjLimpo, email_comercial, telefone,
       cepLimpo, logradouro, numero, bairro, cidade, uf,
       latitude || null, longitude || null,
       aceita_delivery ? 1 : 0, raio_entrega_km || null]
    );

    return res.status(201).json({
      mensagem: 'Farmacia cadastrada com sucesso! Aguardando aprovacao.',
      farmacia: { id: resultado.insertId, nome_fantasia, status: 'PENDENTE' }
    });

  } catch (err) {
    console.error('Erro ao cadastrar farmacia:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  LISTAR FARMÁCIAS
//  Por padrão, só as ativas. Aceita ?status=PENDENTE pro admin.
// =====================================================
async function listarFarmacias(req, res) {
  try {
    const { status } = req.query;
    let sql = `SELECT id, nome_fantasia, cnpj, cidade, uf, aceita_delivery, status
               FROM farmacias WHERE deletado_em IS NULL`;
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else {
      sql += " AND status = 'ATIVO'";
    }
    sql += ' ORDER BY nome_fantasia';

    const [farmacias] = await db.query(sql, params);
    return res.status(200).json({ total: farmacias.length, farmacias });
  } catch (err) {
    console.error('Erro ao listar farmacias:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  APROVAR / REJEITAR FARMÁCIA (UC-004 - admin)
// =====================================================
async function aprovarFarmacia(req, res) {
  try {
    const { id } = req.params;
    const { acao } = req.body; // "APROVAR" ou "REJEITAR"

    if (!acao || !['APROVAR', 'REJEITAR'].includes(acao)) {
      return res.status(400).json({ erro: 'Acao invalida. Use APROVAR ou REJEITAR.' });
    }

    const novoStatus = acao === 'APROVAR' ? 'ATIVO' : 'REJEITADO';

    const [resultado] = await db.query(
      "UPDATE farmacias SET status = ? WHERE id = ? AND deletado_em IS NULL",
      [novoStatus, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Farmacia nao encontrada.' });
    }

    return res.status(200).json({ mensagem: `Farmacia ${novoStatus.toLowerCase()}!`, id: Number(id), status: novoStatus });
  } catch (err) {
    console.error('Erro ao aprovar farmacia:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { cadastrarFarmacia, listarFarmacias, aprovarFarmacia };