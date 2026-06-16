// Controller de Notas Fiscais
// Geração e consulta da nota de um pedido (UC-011)

const db = require('../config/database');

// gera um número de nota simples e sequencial
function gerarNumeroNota() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const aleatorio = Math.floor(100000 + Math.random() * 900000); // 6 dígitos
  return `NF-${ano}-${aleatorio}`;
}

// =====================================================
//  GERAR NOTA FISCAL (UC-011)
//  Cria a nota de um pedido. Uma nota por pedido (1:1).
// =====================================================
async function gerarNota(req, res) {
  try {
    const { pedido_id, arquivo_pdf } = req.body;

    if (!pedido_id) {
      return res.status(400).json({ erro: 'Informe o pedido_id.' });
    }

    // 1) confere se o pedido existe e pega os dados necessários
    const [pedidos] = await db.query(
      'SELECT id, farmacia_id, total_centavos, status FROM pedidos WHERE id = ? AND deletado_em IS NULL',
      [pedido_id]
    );
    if (pedidos.length === 0) {
      return res.status(404).json({ erro: 'Pedido nao encontrado.' });
    }

    const pedido = pedidos[0];

    // 2) só gera nota pra pedido que não está cancelado
    if (pedido.status === 'CANCELADO') {
      return res.status(400).json({ erro: 'Nao e possivel gerar nota de um pedido cancelado.' });
    }

    // 3) confere se já não existe nota pra esse pedido (1 por pedido)
    const [existentes] = await db.query(
      'SELECT id FROM notas_fiscais WHERE pedido_id = ?',
      [pedido_id]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ erro: 'Este pedido ja possui nota fiscal.' });
    }

    // 4) cria a nota
    const numeroNota = gerarNumeroNota();
    const [resultado] = await db.query(
      `INSERT INTO notas_fiscais (pedido_id, farmacia_id, numero_nota, valor_total_centavos, arquivo_pdf)
       VALUES (?, ?, ?, ?, ?)`,
      [pedido_id, pedido.farmacia_id, numeroNota, pedido.total_centavos, arquivo_pdf || null]
    );

    return res.status(201).json({
      mensagem: 'Nota fiscal gerada com sucesso!',
      nota: {
        id: resultado.insertId,
        numero_nota: numeroNota,
        valor_total_centavos: pedido.total_centavos
      }
    });

  } catch (err) {
    console.error('Erro ao gerar nota fiscal:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

// =====================================================
//  CONSULTAR NOTA DE UM PEDIDO
// =====================================================
async function consultarNota(req, res) {
  try {
    const { pedido_id } = req.params;

    const [notas] = await db.query(
      `SELECT nf.id, nf.numero_nota, nf.valor_total_centavos, nf.arquivo_pdf, nf.emitida_em,
              p.numero_pedido, f.nome_fantasia AS farmacia
       FROM notas_fiscais nf
       JOIN pedidos p ON p.id = nf.pedido_id
       JOIN farmacias f ON f.id = nf.farmacia_id
       WHERE nf.pedido_id = ?`,
      [pedido_id]
    );

    if (notas.length === 0) {
      return res.status(404).json({ erro: 'Nenhuma nota fiscal encontrada para este pedido.' });
    }

    return res.status(200).json(notas[0]);
  } catch (err) {
    console.error('Erro ao consultar nota:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { gerarNota, consultarNota };