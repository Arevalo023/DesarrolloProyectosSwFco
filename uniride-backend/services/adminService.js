const { poolPromise } = require('../config/db');

const adminService = {
  async getSummary() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Usuarios) AS usuarios,
        (SELECT COUNT(*) FROM Viajes) AS viajes,
        (SELECT COUNT(*) FROM SolicitudesViaje) AS reservaciones
    `);

    const row = result.recordset[0] || {};
    return {
      usuarios: Number(row.usuarios || 0),
      viajes: Number(row.viajes || 0),
      reservaciones: Number(row.reservaciones || 0),
    };
  },
};

module.exports = adminService;
