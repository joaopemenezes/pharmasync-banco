// Servidor Principal - PharmaSync API
// Ponto de entrada da aplicação

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// importa a conexão (já testa o banco ao iniciar)
require('./config/database');

// importa as rotas
const usuarioRoutes = require('./routes/usuarioRoutes');
const medicamentoRoutes = require('./routes/medicamentoRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const farmaciaRoutes = require('./routes/farmaciaRoutes');
const enderecoRoutes = require('./routes/enderecoRoutes');
const avaliacaoRoutes = require('./routes/avaliacaoRoutes');
const cupomRoutes = require('./routes/cupomRoutes');
const receitaRoutes = require('./routes/receitaRoutes');
const notaFiscalRoutes = require('./routes/notaFiscalRoutes');
const cartaoRoutes = require('./routes/cartaoRoutes');
const app = express();

// Middlewares (configurações que rodam em toda requisição)
app.use(cors());              // permite o app mobile acessar a API
app.use(express.json());      // entende dados em formato JSON

// Rota de teste (pra ver se a API está no ar)
app.get('/', (req, res) => {
  res.json({ mensagem: 'API do PharmaSync rodando!' });
});

// Registra as rotas de usuários
// tudo que começar com /api/usuarios vai pro usuarioRoutes
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/medicamentos', medicamentoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/farmacias', farmaciaRoutes);
app.use('/api/enderecos', enderecoRoutes);
app.use('/api/avaliacoes', avaliacaoRoutes);
app.use('/api/cupons', cupomRoutes);
app.use('/api/receitas', receitaRoutes);
app.use('/api/notas', notaFiscalRoutes);
app.use('/api/cartoes', cartaoRoutes);
// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});