const sql = require('mssql');

const dbSettings = {
  user: 'sa',
  password: 'Un1r1d3_S4_P4ssw0rd!',
  server: 'localhost',
  database: 'uniride',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
};

// Crear un pool de conexiones global
const poolPromise = new sql.ConnectionPool(dbSettings)
  .connect()
  .then(pool => {
    console.log('✅ Conexión a la base de datos SQL Server (uniride) establecida con éxito.');
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
