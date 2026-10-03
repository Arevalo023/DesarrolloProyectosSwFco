const sql = require('mssql');
const { getDbSettings, getMissingEnv, describeDbError } = require('./dbConfig');

// 1. Validar variables de entorno antes de intentar conectar
const missingEnv = getMissingEnv();
if (missingEnv.length) {
  console.error(`❌ Faltan variables en .env: ${missingEnv.join(', ')}. Copia .env.example a .env y complétalo.`);
  process.exit(1);
}

const dbSettings = getDbSettings();

// 2. Crear un pool de conexiones global
const poolPromise = new sql.ConnectionPool(dbSettings)
  .connect()
  .then(pool => {
    console.log(`✅ Conexión a la base de datos SQL Server (${dbSettings.database}) establecida con éxito.`);
    return pool;
  })
  .catch(err => {
    console.error(`❌ Error al conectar con la base de datos: ${describeDbError(err)}`);
    console.error(err);
    process.exit(1);
  });

module.exports = {
  sql,
  poolPromise
};
