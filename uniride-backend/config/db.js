require('dotenv').config();
const sql = require('mssql');

const dbSettings = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'uniride',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
};

// Crear un pool de conexiones global
const poolPromise = new sql.ConnectionPool(dbSettings)
  .connect()
  .then(pool => {
    console.log(`✅ Conexión a la base de datos SQL Server (${dbSettings.database}) establecida con éxito.`);
    return pool;
  })
  .catch(err => {
    console.error('❌ Error al conectar con la base de datos: ', err);
    process.exit(1);
  });

module.exports = {
  sql,
  poolPromise
};
