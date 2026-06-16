const express = require('express');
const router = express.Router();
const { criarAgenda, listarAgendas, listarLembretes, marcarLembrete } = require('../controllers/agendaController');

router.post('/', criarAgenda);
router.get('/', listarAgendas);
router.get('/:agenda_id/lembretes', listarLembretes);
router.patch('/lembrete/:id', marcarLembrete);

module.exports = router;