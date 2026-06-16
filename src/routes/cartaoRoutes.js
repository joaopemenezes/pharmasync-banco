// Rotas de Cartões Salvos

const express = require('express');
const router = express.Router();
const { salvarCartao, listarCartoes, removerCartao } = require('../controllers/cartaoController');

// POST /api/cartoes -> salva um cartão (UC-010)
router.post('/', salvarCartao);

// GET /api/cartoes?usuario_id=4 -> lista cartões do usuário
router.get('/', listarCartoes);

// DELETE /api/cartoes/:id -> remove cartão (soft delete)
router.delete('/:id', removerCartao);

module.exports = router;