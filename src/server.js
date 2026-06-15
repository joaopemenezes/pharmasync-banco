// Servidor Principal - PharmaSync API
// Ponto de entrada da aplicação

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// importa a conexão (já testa o banco ao iniciar)
require('./config/database');

// importa as rotas
const usuarioRoutes = require('./routes/usuarioRoutes');

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

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});