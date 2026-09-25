const { sql, poolPromise } = require("../config/db");

const tripModel = {
  /**
   * Consulta los viajes disponibles que tengan cupo mayor a 0,
   * estado activo/programado y fecha_salida futura.
   * @param {object} filters
   * @param {string} [filters.origen]
   * @param {string} [filters.destino]
   * @param {string} [filters.fecha] - Formato YYYY-MM-DD
   * @returns {Promise<Array>}
   */
  async findAvailable({ origen, destino, fecha }) {
    const pool = await poolPromise;
    const request = pool.request()
      .input("origen", sql.VarChar(255), origen ? `%${origen}%` : null)
      .input("destino", sql.VarChar(255), destino ? `%${destino}%` : null)
      .input("fecha", sql.Date, fecha || null);

    const result = await request.query(`
      SELECT TOP (10) v.id, v.origen, v.destino, v.fecha_salida,
             v.cupo_disponible,
             v.cupo_disponible AS asientos_disponibles,
             v.costo_por_pasajero, v.estado,
             CONCAT(u.nombre, ' ', u.apellido) AS conductor,
             u.id AS conductor_id,
             u.telefono AS conductor_telefono,
             ve.marca, ve.modelo, ve.color, ve.placa
      FROM Viajes v
      INNER JOIN Usuarios u ON u.id = v.conductor_id
      INNER JOIN Vehiculos ve ON ve.id = v.vehiculo_id
      WHERE v.estado IN ('activo', 'programado')
        AND v.cupo_disponible > 0
        AND v.fecha_salida >= GETDATE()
        AND (@origen IS NULL OR v.origen LIKE @origen)
        AND (@destino IS NULL OR v.destino LIKE @destino)
        AND (@fecha IS NULL OR CAST(v.fecha_salida AS DATE) = @fecha)
      ORDER BY v.fecha_salida ASC
    `);
    return result.recordset;
  },

  /**
   * Busca un viaje específico por su ID con datos del conductor y vehículo.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT v.id, v.conductor_id, v.vehiculo_id, v.origen, v.destino,
               v.fecha_salida, v.cupo_disponible,
               v.cupo_disponible AS asientos_disponibles,
               v.costo_por_pasajero, v.estado,
               CONCAT(u.nombre, ' ', u.apellido) AS conductor,
               u.telefono AS conductor_telefono,
               ve.marca, ve.modelo, ve.color, ve.placa
        FROM Viajes v
        INNER JOIN Usuarios u ON u.id = v.conductor_id
        INNER JOIN Vehiculos ve ON ve.id = v.vehiculo_id
        WHERE v.id = @id
      `);

    return result.recordset[0] || null;
  },

  async create({
    conductor_id,
    vehiculo_id,
    origen,
    destino,
    fecha_salida,
    cupo_disponible,
    costo_por_pasajero,
  }) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("conductor_id", sql.Int, conductor_id)
      .input("vehiculo_id", sql.Int, vehiculo_id)
      .input("origen", sql.VarChar(255), origen)
      .input("destino", sql.VarChar(255), destino)
      .input("fecha_salida", sql.DateTime, fecha_salida)
      .input("cupo_disponible", sql.Int, cupo_disponible)
      .input("costo_por_pasajero", sql.Decimal(10, 2), costo_por_pasajero)
      .query(`
        INSERT INTO Viajes (
          conductor_id,
          vehiculo_id,
          origen,
          destino,
          fecha_salida,
          cupo_disponible,
          costo_por_pasajero,
          estado
        )
        OUTPUT INSERTED.id
        VALUES (
          @conductor_id,
          @vehiculo_id,
          @origen,
          @destino,
          @fecha_salida,
          @cupo_disponible,
          @costo_por_pasajero,
          'programado'
        )
      `);

    return this.findById(result.recordset[0].id);
  },

  async findByDriver(conductorId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("conductor_id", sql.Int, conductorId)
      .query(`
        SELECT v.id, v.conductor_id, v.vehiculo_id, v.origen, v.destino,
               v.fecha_salida, v.cupo_disponible,
               v.cupo_disponible AS asientos_disponibles,
               v.costo_por_pasajero, v.estado,
               COALESCE((
                 SELECT COUNT(*)
                 FROM SolicitudesViaje sv
                 WHERE sv.viaje_id = v.id
                   AND sv.estado IN ('pendiente', 'aceptada')
               ), 0) AS usuarios_separaron_asiento,
               ve.marca AS vehiculo_marca,
               ve.modelo AS vehiculo_modelo,
               ve.anio AS vehiculo_anio,
               ve.color AS vehiculo_color,
               ve.placa AS vehiculo_placa,
               ve.asientos_disponibles AS vehiculo_asientos_disponibles,
               ve.activo AS vehiculo_activo
        FROM Viajes v
        INNER JOIN Vehiculos ve ON ve.id = v.vehiculo_id
        WHERE v.conductor_id = @conductor_id
        ORDER BY v.fecha_salida ASC
      `);

    return result.recordset;
  },

  /**
   * Reserva un lugar en un viaje disponible para el pasajero autenticado.
   * Descuenta atómicamente el cupo y registra la solicitud en la tabla SolicitudesViaje.
   * @param {number} tripId
   * @param {number} passengerId
   * @returns {Promise<object>}
   */
  async book(tripId, passengerId) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Verificar existencia y estado del viaje
      const tripCheck = await transaction.request()
        .input("tripId", sql.Int, tripId)
        .query(`
          SELECT id, conductor_id, fecha_salida, cupo_disponible, estado
          FROM Viajes
          WHERE id = @tripId
        `);

      const trip = tripCheck.recordset[0];
      if (!trip) {
        const error = new Error("El viaje solicitado no existe.");
        error.statusCode = 404;
        throw error;
      }

      if (!['activo', 'programado'].includes(trip.estado?.toLowerCase())) {
        const error = new Error("El viaje no está disponible para reservaciones.");
        error.statusCode = 400;
        throw error;
      }

      if (new Date(trip.fecha_salida) < new Date()) {
        const error = new Error("No es posible reservar un viaje cuya fecha u hora ya ha transcurrido.");
        error.statusCode = 400;
        throw error;
      }

      if (trip.conductor_id === passengerId) {
        const error = new Error("No puedes reservar tu propio viaje como conductor.");
        error.statusCode = 400;
        throw error;
      }

      if (trip.cupo_disponible <= 0) {
        const error = new Error("El cupo para este viaje se encuentra agotado.");
        error.statusCode = 409;
        throw error;
      }

      // 2. Verificar que el pasajero no tenga ya una reserva activa en este viaje
      const existing = await transaction.request()
        .input("tripId", sql.Int, tripId)
        .input("passengerId", sql.Int, passengerId)
        .query(`
          SELECT id FROM SolicitudesViaje
          WHERE viaje_id = @tripId AND pasajero_id = @passengerId
            AND estado IN ('pendiente', 'aceptada')
        `);

      if (existing.recordset.length) {
        const error = new Error("Ya tienes una reservación activa para este viaje.");
        error.statusCode = 409;
        throw error;
      }

      // 3. Descontar cupo disponible atómicamente
      const updated = await transaction.request()
        .input("tripId", sql.Int, tripId)
        .query(`
          UPDATE Viajes
          SET cupo_disponible = cupo_disponible - 1
          WHERE id = @tripId AND estado IN ('activo', 'programado') AND cupo_disponible > 0
        `);

      if (!updated.rowsAffected[0]) {
        const error = new Error("El cupo para este viaje se encuentra agotado.");
        error.statusCode = 409;
        throw error;
      }

      // 4. Registrar la reserva en SolicitudesViaje
      const result = await transaction.request()
        .input("tripId", sql.Int, tripId)
        .input("passengerId", sql.Int, passengerId)
        .query(`
          INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
          OUTPUT INSERTED.id, INSERTED.viaje_id, INSERTED.pasajero_id, INSERTED.estado, INSERTED.fecha_solicitud
          VALUES (@tripId, @passengerId, 'pendiente')
        `);

      await transaction.commit();
      return {
        ...result.recordset[0],
        asientos_restantes: trip.cupo_disponible - 1
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

module.exports = tripModel;