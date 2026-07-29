require("dotenv").config();
const sql = require("mssql");

const config = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_HOST,
  database: process.env.MSSQL_DB,
  options: {
    encrypt: false, // true nếu Azure
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// let poolPromise;

// async function getPool() {
//   if (poolPromise) {
//     return poolPromise;
//   }

//   poolPromise = await sql.connect(config);

//   return poolPromise;
// }

let pool;

async function getPool() {
  if (pool?.connected) {
    return pool;
  }

  pool = await new sql.ConnectionPool(config).connect();

  pool.on("error", err => {
    console.error("MSSQL Pool Error:", err);
    pool = null;
  });

  return pool;
}

module.exports = {
  sql,
  getPool,
};
