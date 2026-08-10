const mysql = require("mysql2/promise");

const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
};

let igPool;

async function CONNECT_IG_DB() {
  igPool = mysql.createPool(config);

  return igPool
}

async function getIgPool() {
  if (!igPool) {
    throw new Error('Must connect to Igarment Database first!')
  }

  return igPool;
}

module.exports = {
  CONNECT_IG_DB,
  getIgPool,
};
