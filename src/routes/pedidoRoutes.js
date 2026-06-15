const express = require('express');
const router = express.Router();
const { criarPedido, listarPedidos, detalharPedido, atualizarStatus } = require('../controllers/pedidoController');

// POST /api/pedidos -> cria pedido (UC-009)
router.post('/', criarPedido);

// GET /api/pedidos?consumidor_id=4 -> lista pedidos do usuário (UC-013)
router.get('/', listarPedidos);

// GET /api/pedidos/:id -> detalha um pedido com itens
router.get('/:id', detalharPedido);

// PATCH /api/pedidos/:id/status -> atualiza status (UC-013)
router.patch('/:id/status', atualizarStatus);

module.exports = router;