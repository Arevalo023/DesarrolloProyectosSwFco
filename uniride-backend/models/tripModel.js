const { sql, poolPromise } = require("../config/db");

const tripModel = {
  async findAvailable({ origen, destino, fecha }) {
    const pool = await poolPromise;
    const request = pool.request()
      .input("origen", sql.VarChar(255), origen ? `%${origen}%` : null)
      .input("destino", sql.VarChar(255), destino ? `%${destino}%` : null)
      .input("fecha", sql.Date, fecha || null);

    const result = await request.query(`
      SELECT v.id, v.origen, v.destino, v.fecha_salida, v.cupo_disponible,
             v.costo_por_pasajero, v.estado,
             CONCAT(u.nombre, ' ', u.apellido) AS conductor,
             ve.marca, ve.modelo
      FROM Viajes v
      INNER JOIN Usuarios u ON u.id = v.conductor_id
      INNER JOIN Vehiculos ve ON ve.id = v.vehiculo_id
      WHERE v.estado = 'activo'
        AND v.cupo_disponible > 0
        AND (@origen IS NULL OR v.origen LIKE @origen)
        AND (@destino IS NULL OR v.destino LIKE @destino)
        AND (@fecha IS NULL OR CAST(v.fecha_salida AS DATE) = @fecha)
      ORDER BY v.fecha_salida ASC
    `);
    return result.recordset;
  },

  async book(tripId, passengerId) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const existing = await transaction.request()
        .input("tripId", sql.Int, tripId)
        .input("passengerId", sql.Int, passengerId)
        .query(`
          SELECT id FROM SolicitudesViaje
          WHERE viaje_id = @tripId AND pasajero_id = @passengerId
            AND estado IN ('pendiente', 'aceptada')
        `);

      if (existing.recordset.length) {
        const error = new Error("Ya tienes una reserva para este viaje.");
        error.statusCode = 409;
        throw error;
      }

      const updated = await transaction.request()
        .input("tripId", sql.Int, tripId)
        .query(`
          UPDATE Viajes
          SET cupo_disponible = cupo_disponible - 1
          WHERE id = @tripId AND estado = 'activo' AND cupo_disponible > 0
        `);

      if (!updated.rowsAffected[0]) {
        const error = new Error("El viaje no existe o ya no tiene asientos disponibles.");
        error.statusCode = 409;
        throw error;
      }

      const result = await transaction.request()
        .input("tripId", sql.Int, tripId)
        .input("passengerId", sql.Int, passengerId)
        .query(`
          INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
          OUTPUT INSERTED.*
          VALUES (@tripId, @passengerId, 'pendiente')
        `);

      await transaction.commit();
      return result.recordset[0];
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

module.exports = tripModel;