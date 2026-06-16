// Controller de Agenda de Medicação (UC-014)
const db = require('../config/database');

function horasDaFrequencia(freq) {
  const mapa = { '6H': 6, '8H': 8, '12H': 12, '24H': 24 };
  return mapa[freq] || null;
}

async function criarAgenda(req, res) {
  const conexao = await db.getConnection();
  try {
    const { usuario_id, medicamento_id, frequencia, horario_inicial, data_inicio, data_fim, observacao } = req.body;
    if (!usuario_id || !frequencia || !horario_inicial || !data_inicio) {
      return res.status(400).json({ erro: 'Campos obrigatorios: usuario_id, frequencia, horario_inicial e data_inicio.' });
    }
    const horas = horasDaFrequencia(frequencia);
    if (!horas && frequencia !== 'PERSONALIZADO') {
      return res.status(400).json({ erro: 'Frequencia invalida. Use 6H, 8H, 12H, 24H ou PERSONALIZADO.' });
    }
    const [usuarios] = await conexao.query('SELECT id FROM usuarios WHERE id = ? AND deletado_em IS NULL', [usuario_id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ erro: 'Usuario nao encontrado.' });
    }
    await conexao.beginTransaction();
    const [resultadoAgenda] = await conexao.query(
      `INSERT INTO agenda_medicacao (usuario_id, medicamento_id, frequencia, horario_inicial, data_inicio, data_fim, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, medicamento_id || null, frequencia, horario_inicial, data_inicio, data_fim || null, observacao || null]
    );
    const agendaId = resultadoAgenda.insertId;
    let lembretesGerados = 0;
    if (horas) {
      const inicio = new Date(`${data_inicio}T${horario_inicial}`);
      const fim = data_fim ? new Date(`${data_fim}T23:59:59`) : new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
      let momento = new Date(inicio);
      while (momento <= fim && lembretesGerados < 100) {
        await conexao.query(
          'INSERT INTO lembretes (agenda_id, horario_previsto, status) VALUES (?, ?, ?)',
          [agendaId, momento.toISOString().slice(0, 19).replace('T', ' '), 'PENDENTE']
        );
        lembretesGerados++;
        momento = new Date(momento.getTime() + horas * 60 * 60 * 1000);
      }
    }
    await conexao.commit();
    return res.status(201).json({
      mensagem: 'Agenda de medicacao criada!',
      agenda: { id: agendaId, frequencia, lembretes_gerados: lembretesGerados }
    });
  } catch (err) {
    await conexao.rollback();
    console.error('Erro ao criar agenda:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  } finally {
    conexao.release();
  }
}

async function listarAgendas(req, res) {
  try {
    const { usuario_id } = req.query;
    if (!usuario_id) {
      return res.status(400).json({ erro: 'Informe o usuario_id.' });
    }
    const [agendas] = await db.query(
      `SELECT a.id, a.frequencia, a.horario_inicial, a.data_inicio, a.data_fim,
              a.observacao, a.ativo, m.nome_comercial AS medicamento,
              (SELECT COUNT(*) FROM lembretes WHERE agenda_id = a.id) AS total_lembretes
       FROM agenda_medicacao a
       LEFT JOIN medicamentos m ON m.id = a.medicamento_id
       WHERE a.usuario_id = ? AND a.deletado_em IS NULL
       ORDER BY a.criado_em DESC`,
      [usuario_id]
    );
    return res.status(200).json({ total: agendas.length, agendas });
  } catch (err) {
    console.error('Erro ao listar agendas:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

async function listarLembretes(req, res) {
  try {
    const { agenda_id } = req.params;
    const [lembretes] = await db.query(
      'SELECT id, horario_previsto, status, respondido_em FROM lembretes WHERE agenda_id = ? ORDER BY horario_previsto',
      [agenda_id]
    );
    return res.status(200).json({ total: lembretes.length, lembretes });
  } catch (err) {
    console.error('Erro ao listar lembretes:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

async function marcarLembrete(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['TOMADO', 'IGNORADO'].includes(status)) {
      return res.status(400).json({ erro: 'Status invalido. Use TOMADO ou IGNORADO.' });
    }
    const [resultado] = await db.query(
      'UPDATE lembretes SET status = ?, respondido_em = NOW() WHERE id = ?',
      [status, id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Lembrete nao encontrado.' });
    }
    return res.status(200).json({ mensagem: `Lembrete marcado como ${status.toLowerCase()}!`, id: Number(id) });
  } catch (err) {
    console.error('Erro ao marcar lembrete:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { criarAgenda, listarAgendas, listarLembretes, marcarLembrete };