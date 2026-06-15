// Rotas de Endereços

const express = require('express');
const router = express.Router();
const { cadastrarEndereco, listarEnderecos, excluirEndereco } = require('../controllers/enderecoController');

// POST /api/enderecos -> cadastra endereço (UC-007)
router.post('/', cadastrarEndereco);

// GET /api/enderecos?usuario_id=4 -> lista endereços do usuário
router.get('/', listarEnderecos);

// DELETE /api/enderecos/:id -> remove endereço (soft delete)
router.delete('/:id', excluirEndereco);

module.exports = router;