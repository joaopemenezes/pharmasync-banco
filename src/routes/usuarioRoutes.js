// Rotas de Usuários
// Define os "endereços" (endpoints) e liga cada um ao controller

const express = require('express');
const router = express.Router();
const { cadastrarUsuario, listarUsuarios } = require('../controllers/usuarioController');

// POST /api/usuarios  -> cadastra um novo usuário (UC-001)
router.post('/', cadastrarUsuario);

// GET /api/usuarios   -> lista os usuários (auxiliar, pra testar)
router.get('/', listarUsuarios);

module.exports = router;