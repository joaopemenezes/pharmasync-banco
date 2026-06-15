// Rotas de Farmácias

const express = require('express');
const router = express.Router();
const { cadastrarFarmacia, listarFarmacias, aprovarFarmacia } = require('../controllers/farmaciaController');

// POST /api/farmacias -> cadastra farmácia (UC-004)
router.post('/', cadastrarFarmacia);

// GET /api/farmacias -> lista farmácias (aceita ?status=PENDENTE)
router.get('/', listarFarmacias);

// PATCH /api/farmacias/:id/aprovar -> aprova ou rejeita (UC-004, admin)
router.patch('/:id/aprovar', aprovarFarmacia);

module.exports = router;