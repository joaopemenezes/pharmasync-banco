// Rotas de Avaliações

const express = require('express');
const router = express.Router();
const { criarAvaliacao, listarAvaliacoesFarmacia } = require('../controllers/avaliacaoController');

// POST /api/avaliacoes -> avalia um pedido entregue (UC-017)
router.post('/', criarAvaliacao);

// GET /api/avaliacoes?farmacia_id=1 -> lista avaliações + média da farmácia
router.get('/', listarAvaliacoesFarmacia);

module.exports = router;