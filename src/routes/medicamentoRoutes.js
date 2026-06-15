// Rotas de Medicamentos

const express = require('express');
const router = express.Router();
const { cadastrarMedicamento, listarMedicamentos, buscarMedicamentos } = require('../controllers/medicamentoController');
// POST /api/medicamentos -> cadastra um medicamento (UC-005)
router.post('/', cadastrarMedicamento);


// GET /api/medicamentos/buscar?termo=dipirona -> busca e compara preços (UC-006)
router.get('/buscar', buscarMedicamentos);

// GET /api/medicamentos -> lista o catálogo (aceita ?farmacia_id=1)
router.get('/', listarMedicamentos);
module.exports = router;