const { poolPromise } = require('./config/db');
(async () => {
  const pool = await poolPromise;
  const result = await pool.request().query("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('Vehiculos','Viajes') ORDER BY TABLE_NAME, ORDINAL_POSITION");
  console.log(JSON.stringify(result.recordset, null, 2));
  await pool.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
