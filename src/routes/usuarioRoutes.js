// Rotas de Usuários
// Define os "endereços" (endpoints) e liga cada um ao controller

const express = require('express');
const router = express.Router();
const { cadastrarUsuario, listarUsuarios, login } = require('../controllers/usuarioController');

router.post('/', cadastrarUsuario);
// POST /api/usuarios/login -> faz login e devolve o token (UC-002)
router.post('/login', login);

// GET /api/usuarios   -> lista os usuários (auxiliar, pra testar)
router.get('/', listarUsuarios);

module.exports = router;