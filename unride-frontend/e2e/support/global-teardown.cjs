const sql = require("../../../uniride-backend/node_modules/mssql");
const { getDbSettings } = require("../../../uniride-backend/config/dbConfig");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function globalTeardown() {
  const file = path.join(os.tmpdir(), `uniride-frontend-e2e-${process.env.E2E_RUN_ID}.json`);
  let fixtures;
  try {
    fixtures = JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  const pool = await new sql.ConnectionPool(
    getDbSettings(process.env.DB_NAME_TEST || "uniride_admin_e2e_test")
  ).connect();
  try {
    const request = pool.request();
    const addIds = (prefix, ids) => {
      if (ids.length === 0) return "NULL";
      ids.forEach((id, index) => request.input(`${prefix}${index}`, sql.Int, id));
      return ids.map((_, index) => `@${prefix}${index}`).join(", ");
    };
    const users = addIds("user", fixtures.userIds || []);
    const vehicles = addIds("vehicle", fixtures.vehicleIds || []);
    const trips = addIds("trip", fixtures.tripIds || []);
    await request.query(`
      DELETE FROM Notificaciones
      WHERE usuario_id IN (${users}) OR viaje_id IN (${trips});
      DELETE FROM Calificaciones
      WHERE viaje_id IN (${trips})
         OR calificador_id IN (${users})
         OR calificado_id IN (${users});
      DELETE FROM SolicitudesViaje
      WHERE viaje_id IN (${trips}) OR pasajero_id IN (${users});
      DELETE FROM Viajes WHERE id IN (${trips});
      DELETE FROM Vehiculos WHERE id IN (${vehicles});
      DELETE FROM UsuariosRoles WHERE usuario_id IN (${users});
      DELETE FROM Usuarios WHERE id IN (${users});
    `);
  } finally {
    await pool.close();
    await fs.unlink(file);
  }
}

module.exports = globalTeardown;
