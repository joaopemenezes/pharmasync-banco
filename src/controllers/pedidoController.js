// Controller de Pedidos
// Criação de pedido com transação (UC-009) e listagem (UC-013)

const db = require('../config/database');

// gera um número de pedido no formato PS-AAAAMMDD-XXXXXXXX
function gerarNumeroPedido() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const aleatorio = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `PS-${ano}${mes}${dia}-${aleatorio}`;
}

// =====================================================
//  CRIAR PEDIDO (UC-009) - COM TRANSAÇÃO
//  Recebe os itens, valida estoque, cria pedido+itens
//  e baixa o estoque. Tudo ou nada (transação).
// =====================================================
async function criarPedido(req, res) {
  // pega uma conexão dedicada pra transação
  const conexao = await db.getConnection();

  try {
    const { consumidor_id, farmacia_id, tipo_entrega, forma_pagamento, itens, endereco_entrega } = req.body;

    // 1) valida campos obrigatórios
    if (!consumidor_id || !farmacia_id || !tipo_entrega || !forma_pagamento || !itens) {
      return res.status(400).json({
        erro: 'Campos obrigatorios: consumidor_id, farmacia_id, tipo_entrega, forma_pagamento e itens.'
      });
    }

    // 2) valida que itens é uma lista não-vazia
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'O pedido precisa ter pelo menos um item.' });
    }

    // INICIA A TRANSAÇÃO (a partir daqui, tudo ou nada)
    await conexao.beginTransaction();

    let subtotal = 0;
    const itensValidados = [];

    // 3) para cada item: valida o medicamento, estoque e calcula preço
    for (const item of itens) {
      const { medicamento_id, quantidade } = item;

      if (!medicamento_id || !quantidade || quantidade <= 0) {
        await conexao.rollback();
        return res.status(400).json({ erro: 'Cada item precisa de medicamento_id e quantidade valida.' });
      }

      // quantidade máxima por item (UC-008: max 10)
      if (quantidade > 10) {
        await conexao.rollback();
        return res.status(400).json({ erro: 'Quantidade maxima por item e 10.' });
      }

      // busca o medicamento (trava a linha pra evitar concorrência)
      const [meds] = await conexao.query(
        'SELECT id, nome_comercial, preco_centavos, estoque, farmacia_id FROM medicamentos WHERE id = ? AND deletado_em IS NULL FOR UPDATE',
        [medicamento_id]
      );

      if (meds.length === 0) {
        await conexao.rollback();
        return res.status(404).json({ erro: `Medicamento ${medicamento_id} nao encontrado.` });
      }

      const med = meds[0];

      // confere se o medicamento é da farmácia do pedido
      if (med.farmacia_id !== farmacia_id) {
        await conexao.rollback();
        return res.status(400).json({ erro: `O medicamento ${med.nome_comercial} nao pertence a esta farmacia.` });
      }

      // confere estoque suficiente
      if (med.estoque < quantidade) {
        await conexao.rollback();
        return res.status(409).json({
          erro: `Estoque insuficiente para ${med.nome_comercial}. Disponivel: ${med.estoque}.`
        });
      }

      // calcula o subtotal deste item (preço congelado no momento da compra)
      const subtotalItem = med.preco_centavos * quantidade;
      subtotal += subtotalItem;

      itensValidados.push({
        medicamento_id: med.id,
        quantidade,
        preco_unit_centavos: med.preco_centavos,
        subtotal_centavos: subtotalItem,
        novo_estoque: med.estoque - quantidade
      });
    }

    // 4) calcula o total (subtotal + frete simples)
    const frete = tipo_entrega === 'DELIVERY' ? 500 : 0; // R$5 de frete no delivery
    const total = subtotal + frete;

    // 5) cria o pedido (cabeçalho)
    const numeroPedido = gerarNumeroPedido();
    const [resultadoPedido] = await conexao.query(
      `INSERT INTO pedidos
       (numero_pedido, consumidor_id, farmacia_id, status, tipo_entrega, forma_pagamento,
        subtotal_centavos, frete_centavos, total_centavos, endereco_entrega)
       VALUES (?, ?, ?, 'AGUARDANDO_PAGAMENTO', ?, ?, ?, ?, ?, ?)`,
      [numeroPedido, consumidor_id, farmacia_id, tipo_entrega, forma_pagamento,
       subtotal, frete, total, endereco_entrega || null]
    );

    const pedidoId = resultadoPedido.insertId;

    // 6) cria os itens do pedido e baixa o estoque de cada um
    for (const item of itensValidados) {
      await conexao.query(
        `INSERT INTO itens_pedido (pedido_id, medicamento_id, quantidade, preco_unit_centavos, subtotal_centavos)
         VALUES (?, ?, ?, ?, ?)`,
        [pedidoId, item.medicamento_id, item.quantidade, item.preco_unit_centavos, item.subtotal_centavos]
      );

      // baixa o estoque
      await conexao.query(
        'UPDATE medicamentos SET estoque = ? WHERE id = ?',
        [item.novo_estoque, item.medicamento_id]
      );
    }

    // 7) CONFIRMA A TRANSAÇÃO (tudo deu certo)
    await conexao.commit();

    // 8) responde com sucesso
    return res.status(201).json({
      mensagem: 'Pedido criado com sucesso!',
      pedido: {
        id: pedidoId,
        numero_pedido: numeroPedido,
        subtotal_centavos: subtotal,
        frete_centavos: frete,
        total_centavos: total,
        status: 'AGUARDANDO_PAGAMENTO',
        itens: itensValidados.length
      }
    });

  } catch (err) {
    // se qualquer coisa falhou, desfaz tudo
    await conexao.rollback();
    console.error('Erro ao criar pedido:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  } finally {
    // sempre devolve a conexão pro pool
    conexao.release();
  }
}
// =====================================================
//  LISTAR PEDIDOS DE UM USUÁRIO (UC-013)
// =====================================================
async function listarPedidos(req, res) {
  try {
    const { consumidor_id } = req.query;
    if (!consumidor_id) {
      return res.status(400).json({ erro: 'Informe o consumidor_id.' });
    }

    const [pedidos] = await db.query(
      `SELECT p.id, p.numero_pedido, p.status, p.tipo_entrega, p.forma_pagamento,
              p.total_centavos, p.criado_em, f.nome_fantasia AS farmacia
       FROM pedidos p
       JOIN farmacias f ON f.id = p.farmacia_id
       WHERE p.consumidor_id = ? AND p.deletado_em IS NULL
       ORDER BY p.criado_em DESC`,
      [consumidor_id]
    );

    return res.status(200).json({ total: pedidos.length, pedidos });
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  DETALHAR UM PEDIDO (com seus itens)
// =====================================================
async function detalharPedido(req, res) {
  try {
    const { id } = req.params;

    const [pedidos] = await db.query(
      `SELECT p.*, f.nome_fantasia AS farmacia, u.nome AS cliente
       FROM pedidos p
       JOIN farmacias f ON f.id = p.farmacia_id
       JOIN usuarios u ON u.id = p.consumidor_id
       WHERE p.id = ? AND p.deletado_em IS NULL`,
      [id]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({ erro: 'Pedido nao encontrado.' });
    }

    const [itens] = await db.query(
      `SELECT i.quantidade, i.preco_unit_centavos, i.subtotal_centavos,
              m.nome_comercial
       FROM itens_pedido i
       JOIN medicamentos m ON m.id = i.medicamento_id
       WHERE i.pedido_id = ?`,
      [id]
    );

    const pedido = pedidos[0];
    pedido.itens = itens;

    return res.status(200).json(pedido);
  } catch (err) {
    console.error('Erro ao detalhar pedido:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  ATUALIZAR STATUS DO PEDIDO (UC-013)
//  Usado pela farmácia pra avançar o pedido.
// =====================================================
async function atualizarStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const statusValidos = [
      'AGUARDANDO_PAGAMENTO', 'AGUARDANDO_CONFIRMACAO', 'CONFIRMADO',
      'EM_SEPARACAO', 'SAIU_PARA_ENTREGA', 'PRONTO_PARA_RETIRADA',
      'ENTREGUE', 'CANCELADO'
    ];

    if (!status || !statusValidos.includes(status)) {
      return res.status(400).json({
        erro: 'Status invalido. Valores aceitos: ' + statusValidos.join(', ')
      });
    }

    const [resultado] = await db.query(
      'UPDATE pedidos SET status = ? WHERE id = ? AND deletado_em IS NULL',
      [status, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Pedido nao encontrado.' });
    }

    return res.status(200).json({ mensagem: 'Status atualizado!', id: Number(id), novo_status: status });
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}
module.exports = { criarPedido, listarPedidos, detalharPedido, atualizarStatus };