const { sql, poolPromise } = require("../config/db");

const reservationModel = {
  /**
   * El conductor dueño del viaje acepta o rechaza una solicitud pendiente.
   * Solo al aceptar se descuenta cupo del viaje (transacción + bloqueo de filas).
   * @param {number} reservationId  SolicitudesViaje.id
   * @param {number} driverId       req.user.id
   * @param {'aceptada'|'rechazada'} nuevoEstado
   */
  async respond(reservationId, driverId, nuevoEstado) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Leer solicitud + viaje con bloqueo (evita doble aceptación concurrente)
      const found = await transaction.request()
        .input("id", sql.Int, reservationId)
        .query(`
          SELECT s.id, s.viaje_id, s.pasajero_id, s.estado,
                 v.conductor_id, v.cupo_disponible,
                 v.estado AS viaje_estado, v.fecha_salida
          FROM SolicitudesViaje s WITH (UPDLOCK, ROWLOCK)
          INNER JOIN Viajes v WITH (UPDLOCK, ROWLOCK) ON v.id = s.viaje_id
          WHERE s.id = @id
        `);

      const row = found.recordset[0];
      if (!row) {
        const e = new Error("La solicitud no existe.");
        e.statusCode = 404;
        throw e;
      }

      // 2. Solo el conductor dueño del viaje
      if (row.conductor_id !== driverId) {
        const e = new Error("Solo el conductor dueño del viaje puede gestionar esta solicitud.");
        e.statusCode = 403;
        throw e;
      }

      // 3. Solo desde 'pendiente'
      if (String(row.estado).toLowerCase() !== "pendiente") {
        const e = new Error(`La solicitud ya fue resuelta (estado actual: ${row.estado}).`);
        e.statusCode = 409;
        throw e;
      }

      // 4. Aceptar -> validar viaje y descontar cupo
      if (nuevoEstado === "aceptada") {
        if (!["activo", "programado"].includes(String(row.viaje_estado).toLowerCase())) {
          const e = new Error("El viaje ya no admite solicitudes.");
          e.statusCode = 400;
          throw e;
        }
        if (new Date(row.fecha_salida) < new Date()) {
          const e = new Error("El viaje ya salió; no se puede aceptar la solicitud.");
          e.statusCode = 400;
          throw e;
        }

        const updated = await transaction.request()
          .input("viajeId", sql.Int, row.viaje_id)
          .query(`
            UPDATE Viajes
            SET cupo_disponible = cupo_disponible - 1
            WHERE id = @viajeId AND cupo_disponible > 0
          `);

        if (!updated.rowsAffected[0]) {
          const e = new Error("No hay cupo disponible en este viaje.");
          e.statusCode = 409;
          throw e;
        }
      }

      // 5. Guardar nuevo estado (rechazada NO toca cupo)
      const result = await transaction.request()
        .input("id", sql.Int, reservationId)
        .input("estado", sql.VarChar(20), nuevoEstado)
        .query(`
          UPDATE SolicitudesViaje
          SET estado = @estado
          OUTPUT INSERTED.id, INSERTED.viaje_id, INSERTED.pasajero_id, INSERTED.estado
          WHERE id = @id
        `);

      await transaction.commit();

      return {
        ...result.recordset[0],
        asientos_restantes:
          nuevoEstado === "aceptada" ? row.cupo_disponible - 1 : row.cupo_disponible,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

module.exports = reservationModel;
