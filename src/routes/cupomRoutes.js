// Rotas de Cupons

const express = require('express');
const router = express.Router();
const { criarCupom, listarCupons, validarCupom } = require('../controllers/cupomController');

// POST /api/cupons -> cria um cupom (UC-016, admin)
router.post('/', criarCupom);

// GET /api/cupons -> lista cupons ativos
router.get('/', listarCupons);

// POST /api/cupons/validar -> valida e calcula o desconto (UC-016)
router.post('/validar', validarCupom);

module.exports = router;
