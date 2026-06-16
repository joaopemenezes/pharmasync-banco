// Rotas de Notas Fiscais

const express = require('express');
const router = express.Router();
const { gerarNota, consultarNota } = require('../controllers/notaFiscalController');

// POST /api/notas -> gera a nota de um pedido (UC-011)
router.post('/', gerarNota);

// GET /api/notas/:pedido_id -> consulta a nota de um pedido
router.get('/:pedido_id', consultarNota);

module.exports = router;