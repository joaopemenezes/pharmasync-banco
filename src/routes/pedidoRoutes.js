// Rotas de Pedidos

const express = require('express');
const router = express.Router();
const { criarPedido } = require('../controllers/pedidoController');

// POST /api/pedidos -> cria um novo pedido (UC-009)
router.post('/', criarPedido);

module.exports = router;