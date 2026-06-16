// Rotas de Receitas

const express = require('express');
const router = express.Router();
const { enviarReceita, listarReceitas, validarReceita } = require('../controllers/receitaController');

// POST /api/receitas -> envia receita (UC-012)
router.post('/', enviarReceita);

// GET /api/receitas?usuario_id=4 -> lista receitas (aceita ?status=PENDENTE)
router.get('/', listarReceitas);

// PATCH /api/receitas/:id/validar -> valida ou rejeita (UC-012, gestor)
router.patch('/:id/validar', validarReceita);

module.exports = router;