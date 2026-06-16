// Controller de Cupons
// Criação, listagem e validação de cupons de desconto (UC-016)

const db = require('../config/database');

// =====================================================
//  CRIAR CUPOM (UC-016 - admin)
// =====================================================
async function criarCupom(req, res) {
  try {
    const {
      codigo, descricao, tipo_desconto, valor_desconto,
      valor_minimo_centavos, validade_inicio, validade_fim, limite_uso
    } = req.body;

    // 1) campos obrigatórios
    if (!codigo || !tipo_desconto || valor_desconto == null) {
      return res.status(400).json({ erro: 'Campos obrigatorios: codigo, tipo_desconto e valor_desconto.' });
    }

    // 2) tipo de desconto válido
    if (!['PERCENTUAL', 'VALOR_FIXO'].includes(tipo_desconto)) {
      return res.status(400).json({ erro: 'tipo_desconto deve ser PERCENTUAL ou VALOR_FIXO.' });
    }

    // 3) valor coerente (percentual entre 1 e 100)
    if (valor_desconto <= 0) {
      return res.status(400).json({ erro: 'O valor do desconto deve ser maior que zero.' });
    }
    if (tipo_desconto === 'PERCENTUAL' && valor_desconto > 100) {
      return res.status(400).json({ erro: 'Desconto percentual nao pode passar de 100.' });
    }

    // 4) confere código duplicado (único)
    const [existentes] = await db.query(
      'SELECT id FROM cupons WHERE codigo = ?',
      [codigo.toUpperCase()]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ erro: 'Ja existe um cupom com esse codigo.' });
    }

    // 5) insere o cupom
    const [resultado] = await db.query(
      `INSERT INTO cupons
       (codigo, descricao, tipo_desconto, valor_desconto, valor_minimo_centavos,
        validade_inicio, validade_fim, limite_uso)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo.toUpperCase(), descricao || null, tipo_desconto, valor_desconto,
       valor_minimo_centavos || null, validade_inicio || null, validade_fim || null, limite_uso || null]
    );

    return res.status(201).json({
      mensagem: 'Cupom criado com sucesso!',
      cupom: { id: resultado.insertId, codigo: codigo.toUpperCase() }
    });

  } catch (err) {
    console.error('Erro ao criar cupom:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  LISTAR CUPONS ATIVOS
// =====================================================
async function listarCupons(req, res) {
  try {
    const [cupons] = await db.query(
      `SELECT id, codigo, descricao, tipo_desconto, valor_desconto,
              valor_minimo_centavos, validade_fim, limite_uso, usos_atuais
       FROM cupons
       WHERE ativo = TRUE AND deletado_em IS NULL
       ORDER BY codigo`
    );
    return res.status(200).json({ total: cupons.length, cupons });
  } catch (err) {
    console.error('Erro ao listar cupons:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  VALIDAR / APLICAR CUPOM (UC-016)
//  Recebe o código e o valor do pedido, e calcula o desconto.
// =====================================================
async function validarCupom(req, res) {
  try {
    const { codigo, subtotal_centavos } = req.body;

    if (!codigo || subtotal_centavos == null) {
      return res.status(400).json({ erro: 'Informe o codigo e o subtotal_centavos.' });
    }

    // 1) busca o cupom
    const [cupons] = await db.query(
      'SELECT * FROM cupons WHERE codigo = ? AND ativo = TRUE AND deletado_em IS NULL',
      [codigo.toUpperCase()]
    );
    if (cupons.length === 0) {
      return res.status(404).json({ erro: 'Cupom invalido ou inexistente.' });
    }

    const cupom = cupons[0];
    const agora = new Date();

    // 2) checa validade (início e fim)
    if (cupom.validade_inicio && agora < new Date(cupom.validade_inicio)) {
      return res.status(400).json({ erro: 'Este cupom ainda nao esta valido.' });
    }
    if (cupom.validade_fim && agora > new Date(cupom.validade_fim)) {
      return res.status(400).json({ erro: 'Este cupom expirou.' });
    }

    // 3) checa limite de uso
    if (cupom.limite_uso && cupom.usos_atuais >= cupom.limite_uso) {
      return res.status(400).json({ erro: 'Este cupom atingiu o limite de uso.' });
    }

    // 4) checa valor mínimo
    if (cupom.valor_minimo_centavos && subtotal_centavos < cupom.valor_minimo_centavos) {
      return res.status(400).json({
        erro: `Pedido minimo de R$ ${(cupom.valor_minimo_centavos / 100).toFixed(2)} para usar este cupom.`
      });
    }

    // 5) calcula o desconto
    let desconto;
    if (cupom.tipo_desconto === 'PERCENTUAL') {
      desconto = Math.round(subtotal_centavos * (cupom.valor_desconto / 100));
    } else {
      desconto = cupom.valor_desconto; // VALOR_FIXO já está em centavos
    }
    // o desconto não pode passar do subtotal
    if (desconto > subtotal_centavos) desconto = subtotal_centavos;

    const totalComDesconto = subtotal_centavos - desconto;

    return res.status(200).json({
      mensagem: 'Cupom aplicado!',
      codigo: cupom.codigo,
      desconto_centavos: desconto,
      subtotal_original: subtotal_centavos,
      total_com_desconto: totalComDesconto
    });

  } catch (err) {
    console.error('Erro ao validar cupom:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { criarCupom, listarCupons, validarCupom };