require('dotenv').config();

/**
 * Configuración de conexión a SQL Server compartida por:
 * - config/db.js        (pool de la aplicación)
 * - scripts/db-init.js  (creación/sincronización del esquema)
 *
 * No abre conexiones: solo arma la configuración y valida el .env.
 */

const REQUIRED_ENV = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_NAME', 'DB_PORT', 'JWT_SECRET'];

/**
 * Revisa que existan las variables obligatorias del .env.
 * @returns {string[]} nombres de variables faltantes (vacío si todo está bien)
 */
const getMissingEnv = () =>
  REQUIRED_ENV.filter((name) => !process.env[name] || !String(process.env[name]).trim());

/**
 * @param {string} [database] - Base a la que conectarse (por defecto DB_NAME)
 */
const getDbSettings = (database = process.env.DB_NAME || 'uniride') => ({
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 15000,
});

/**
 * Traduce errores comunes de conexión a un mensaje con la causa probable.
 * @param {Error & {code?: string}} err
 * @returns {string}
 */
const describeDbError = (err) => {
  const { server, port, database } = getDbSettings();
  const message = String(err?.message || '');

  if (/Cannot open database/i.test(message)) {
    return `La base de datos "${database}" no existe. Ejecuta: npm run db:init`;
  }
  if (err?.code === 'ELOGIN') {
    return 'Usuario o contraseña incorrectos. Revisa DB_USER y DB_PASSWORD en .env (con Docker, DB_PASSWORD = SA_PASSWORD de docker-compose.yml).';
  }
  if (err?.code === 'ESOCKET' || err?.code === 'ETIMEOUT') {
    return `No se pudo llegar a SQL Server en ${server}:${port}. ¿Está corriendo el contenedor (docker compose up -d)? Con Docker el puerto es 11433.`;
  }
  return message || 'Error desconocido al conectar con la base de datos.';
};

module.exports = {
  getDbSettings,
  getMissingEnv,
  describeDbError,
};
