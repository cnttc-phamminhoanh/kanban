const sql = require("mssql");

const t8Config = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_HOST,
  database: process.env.MSSQL_DB,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const biConfig = {
  user: process.env.BI_MSSQL_USER,
  password: process.env.BI_MSSQL_PASSWORD,
  server: process.env.BI_MSSQL_HOST,
  database: process.env.BI_MSSQL_DB,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let t8Pool;
let biPool;

async function CONNECT_T8_DB() {
  t8Pool = await new sql.ConnectionPool(t8Config).connect();

  t8Pool.on("error", err => {
    console.error("T8 Pool Error:", err);
    t8Pool = null;
  });

  return t8Pool
}

async function CONNECT_BI_DB() {
  biPool = await new sql.ConnectionPool(biConfig).connect();

  biPool.on("error", err => {
    console.error("BI Pool Error:", err);
    biPool = null;
  });

  return biPool
}

async function getT8Pool() {
  if (!t8Pool?.connected) {
    throw new Error('Must connect to T8 Database first!')
  }

  return t8Pool;
}

async function getBIPool() {
  if (!biPool?.connected) {
    throw new Error('Must connect to BI Database first!')
  }

  return biPool;
}

module.exports = {
  sql,
  CONNECT_T8_DB,
  CONNECT_BI_DB,
  getT8Pool,
  getBIPool,
};
