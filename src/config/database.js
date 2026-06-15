// Conexão com o banco MySQL 8.0
// Usa um "pool" de conexões: mantém várias prontas pra usar (mais rápido)

const mysql = require('mysql2');
require('dotenv').config();

// Cria o pool de conexões com os dados do arquivo .env
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z'
});

// Versão com Promise (permite usar async/await nas consultas)
const db = pool.promise();

// Testa a conexão ao iniciar, pra avisar se algo estiver errado
db.getConnection()
  .then(conn => {
    console.log('Conectado ao banco MySQL (pharmasync)');
    conn.release();
  })
  .catch(err => {
    console.error('Erro ao conectar no banco:', err.message);
  });

module.exports = db;