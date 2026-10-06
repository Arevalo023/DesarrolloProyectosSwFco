/**
 * Inicializa / sincroniza la base de datos de UniRide.
 *
 *   npm run db:init    -> esquema + catálogos + sincronización de roles
 *   npm run db:seed    -> lo anterior + datos demo (database/seeds.sql)
 *
 * 1. Valida las variables de entorno (.env)
 * 2. Conecta a "master" y crea la base DB_NAME si no existe
 * 3. Ejecuta database/uniride.sql (idempotente)
 * 4. Con --seed, ejecuta database/seeds.sql (idempotente)
 * 5. Verifica tablas, relaciones, roles y sincronización de Conductor
 *
 * Los .sql viven en la carpeta database/ de la raíz del repositorio.
 * Termina con código 1 si algo falla, para que se note en consola/CI.
 */
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const { getDbSettings, getMissingEnv, describeDbError } = require('../config/dbConfig');

// <raíz del repo>/database
const DATABASE_DIR = path.join(__dirname, '..', '..', 'database');
const SCHEMA_PATH = path.join(DATABASE_DIR, 'uniride.sql');
const SEEDS_PATH = path.join(DATABASE_DIR, 'seeds.sql');

const WITH_SEED = process.argv.includes('--seed');

const EXPECTED_TABLES = [
  'Roles',
  'Universidades',
  'Campus',
  'Usuarios',
  'UsuariosRoles',
  'Vehiculos',
  'Viajes',
  'SolicitudesViaje',
  'Calificaciones',
  'Notificaciones',
];

// [tabla hija, tabla referenciada]
const EXPECTED_RELATIONS = [
  ['Campus', 'Universidades'],
  ['Usuarios', 'Roles'],
  ['Usuarios', 'Campus'],
  ['UsuariosRoles', 'Usuarios'],
  ['UsuariosRoles', 'Roles'],
  ['Vehiculos', 'Usuarios'],
  ['Viajes', 'Usuarios'],
  ['Viajes', 'Vehiculos'],
  ['SolicitudesViaje', 'Viajes'],
  ['SolicitudesViaje', 'Usuarios'],
  ['Calificaciones', 'Viajes'],
  ['Calificaciones', 'Usuarios'],
  ['Notificaciones', 'Usuarios'],
  ['Notificaciones', 'SolicitudesViaje'],
  ['Notificaciones', 'Viajes'],
];

const EXPECTED_ROLES = ['Pasajero', 'Conductor', 'Administrador', 'Moderador'];

// Separa el archivo en bloques por las líneas "GO" (como SSMS / sqlcmd)
const splitBatches = (text) =>
  text
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);

async function ensureDatabase(dbName) {
  const pool = await new sql.ConnectionPool(getDbSettings('master')).connect();
  try {
    const result = await pool.request()
      .input('name', sql.NVarChar(128), dbName)
      .query(`
        IF DB_ID(@name) IS NULL
        BEGIN
          DECLARE @stmt NVARCHAR(300) = N'CREATE DATABASE ' + QUOTENAME(@name);
          EXEC (@stmt);
          SELECT CAST(1 AS BIT) AS created;
        END
        ELSE
          SELECT CAST(0 AS BIT) AS created;
      `);
    return result.recordset[0].created;
  } finally {
    await pool.close();
  }
}

async function runSqlFile(pool, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró ${filePath}`);
  }
  const batches = splitBatches(fs.readFileSync(filePath, 'utf8'));
  for (const [index, batch] of batches.entries()) {
    try {
      await pool.request().batch(batch);
    } catch (err) {
      const preview = batch.split('\n').find((line) => line.trim() && !line.trim().startsWith('--')) || '';
      err.message = `${path.basename(filePath)}, bloque ${index + 1}/${batches.length} (${preview.trim()}): ${err.message}`;
      throw err;
    }
  }
  return batches.length;
}

async function verify(pool) {
  let ok = true;

  const tables = (await pool.request().query(
    "SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo')"
  )).recordset.map((row) => row.name.toLowerCase());

  console.log('\nTablas:');
  for (const table of EXPECTED_TABLES) {
    const exists = tables.includes(table.toLowerCase());
    ok = ok && exists;
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  }

  const relations = (await pool.request().query(`
    SELECT OBJECT_NAME(parent_object_id) AS hija,
           OBJECT_NAME(referenced_object_id) AS padre
    FROM sys.foreign_keys
  `)).recordset.map((row) => `${row.hija}->${row.padre}`.toLowerCase());

  console.log('\nRelaciones (llaves foráneas):');
  for (const [child, parent] of EXPECTED_RELATIONS) {
    const exists = relations.includes(`${child}->${parent}`.toLowerCase());
    ok = ok && exists;
    console.log(`  ${exists ? '✅' : '❌'} ${child} → ${parent}`);
  }

  const roles = (await pool.request().query('SELECT nombre FROM dbo.Roles'))
    .recordset.map((row) => row.nombre.toLowerCase());

  console.log('\nRoles:');
  for (const role of EXPECTED_ROLES) {
    const exists = roles.includes(role.toLowerCase());
    ok = ok && exists;
    console.log(`  ${exists ? '✅' : '❌'} ${role}`);
  }

  // Sincronización de roles en vehículos: dueños de vehículo sin rol Conductor
  const sinConductor = (await pool.request().query(`
    SELECT COUNT(DISTINCT v.usuario_id) AS total
    FROM dbo.Vehiculos v
    WHERE NOT EXISTS (
      SELECT 1
      FROM dbo.UsuariosRoles ur
      INNER JOIN dbo.Roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = v.usuario_id AND LOWER(r.nombre) = 'conductor'
    )
  `)).recordset[0].total;

  console.log('\nSincronización de roles:');
  console.log(`  ${sinConductor === 0 ? '✅' : '❌'} Dueños de vehículo sin rol Conductor: ${sinConductor}`);
  ok = ok && sinConductor === 0;

  return ok;
}

async function main() {
  // 1. Variables de entorno
  const missing = getMissingEnv();
  if (missing.length) {
    console.error(`❌ Faltan variables en .env: ${missing.join(', ')}`);
    process.exit(1);
  }

  const settings = getDbSettings();
  console.log(`🔌 SQL Server: ${settings.server}:${settings.port}  |  Base: ${settings.database}  |  Usuario: ${settings.user}`);

  // 2. Base de datos
  const created = await ensureDatabase(settings.database);
  console.log(created
    ? `🆕 Base de datos "${settings.database}" creada.`
    : `✅ Base de datos "${settings.database}" ya existía.`);

  // 3. Esquema
  const pool = await new sql.ConnectionPool(settings).connect();
  try {
    const total = await runSqlFile(pool, SCHEMA_PATH);
    console.log(`✅ uniride.sql aplicado (${total} bloques sin errores).`);

    if (WITH_SEED) {
      const totalSeed = await runSqlFile(pool, SEEDS_PATH);
      console.log(`✅ seeds.sql aplicado (${totalSeed} bloques sin errores). Contraseña demo: Demo1234!`);
    }

    // 4. Verificación
    const ok = await verify(pool);
    if (!ok) {
      console.error('\n❌ La verificación encontró elementos faltantes (ver ❌ arriba).');
      process.exitCode = 1;
      return;
    }
    console.log('\n🎉 Base de datos sincronizada correctamente.');
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error(`\n❌ ${describeDbError(err)}`);
  if (err?.message && describeDbError(err) !== err.message) {
    console.error(`   Detalle: ${err.message}`);
  }
  process.exit(1);
});
