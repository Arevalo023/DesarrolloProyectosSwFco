const { sql, poolPromise } = require("../config/db");

const ratingModel = {
  /**
   * Registra una nueva calificación en la base de datos.
   * @param {object} params
   * @param {number} params.viajeId
   * @param {number} params.calificadorId
   * @param {number} params.calificadoId
   * @param {number} params.puntuacion (1-5)
   * @param {string|null} [params.comentario]
   * @returns {Promise<object>} Registro insertado
   */
  async create({ viajeId, calificadorId, calificadoId, puntuacion, comentario = null }) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("viaje_id", sql.Int, viajeId)
      .input("calificador_id", sql.Int, calificadorId)
      .input("calificado_id", sql.Int, calificadoId)
      .input("puntuacion", sql.Int, puntuacion)
      .input("comentario", sql.VarChar(500), comentario || null)
      .query(`
        INSERT INTO Calificaciones (viaje_id, calificador_id, calificado_id, puntuacion, comentario)
        OUTPUT inserted.id, inserted.viaje_id, inserted.calificador_id, inserted.calificado_id,
               inserted.puntuacion, inserted.comentario, inserted.fecha_creacion
        VALUES (@viaje_id, @calificador_id, @calificado_id, @puntuacion, @comentario)
      `);

    return result.recordset[0];
  },

  /**
   * Busca si ya existe una calificación entre un calificador y un calificado en un viaje dado.
   * @param {object} params
   * @param {number} params.viajeId
   * @param {number} params.calificadorId
   * @param {number} params.calificadoId
   * @returns {Promise<object|null>}
   */
  async findByTripAndParticipants({ viajeId, calificadorId, calificadoId }) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("viaje_id", sql.Int, viajeId)
      .input("calificador_id", sql.Int, calificadorId)
      .input("calificado_id", sql.Int, calificadoId)
      .query(`
        SELECT TOP 1 id, viaje_id, calificador_id, calificado_id, puntuacion, comentario, fecha_creacion
        FROM Calificaciones
        WHERE viaje_id = @viaje_id
          AND calificador_id = @calificador_id
          AND calificado_id = @calificado_id
      `);

    return result.recordset[0] || null;
  },

  /**
   * Verifica si un pasajero tiene una reservación en estado 'aceptada' en un viaje específico.
   * @param {object} params
   * @param {number} params.viajeId
   * @param {number} params.pasajeroId
   * @returns {Promise<boolean>}
   */
  async hasAcceptedReservation({ viajeId, pasajeroId }) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("viaje_id", sql.Int, viajeId)
      .input("pasajero_id", sql.Int, pasajeroId)
      .query(`
        SELECT TOP 1 id
        FROM SolicitudesViaje
        WHERE viaje_id = @viaje_id
          AND pasajero_id = @pasajero_id
          AND LOWER(estado) = 'aceptada'
      `);

    return (result.recordset && result.recordset.length > 0) || false;
  },

  /**
   * Obtiene las calificaciones recibidas por un usuario con datos del calificador y viaje.
   * @param {number} usuarioId
   * @returns {Promise<Array>}
   */
  async findByUser(usuarioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("usuario_id", sql.Int, usuarioId)
      .query(`
        SELECT c.id, c.viaje_id, c.calificador_id, c.calificado_id,
               c.puntuacion, c.comentario, c.fecha_creacion,
               CONCAT(u.nombre, ' ', u.apellido) AS calificador_nombre,
               v.origen, v.destino, v.fecha_salida
        FROM Calificaciones c
        INNER JOIN Usuarios u ON u.id = c.calificador_id
        INNER JOIN Viajes v ON v.id = c.viaje_id
        WHERE c.calificado_id = @usuario_id
        ORDER BY c.fecha_creacion DESC
      `);

    return result.recordset;
  },

  /**
   * Calcula el promedio de calificación y el total de evaluaciones recibidas por un usuario.
   * @param {number} usuarioId
   * @returns {Promise<{ promedio: number, total_calificaciones: number }>}
   */
  async getAverageScore(usuarioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("usuario_id", sql.Int, usuarioId)
      .query(`
        SELECT
          COALESCE(ROUND(AVG(CAST(puntuacion AS FLOAT)), 1), 0.0) AS promedio,
          COUNT(id) AS total_calificaciones
        FROM Calificaciones
        WHERE calificado_id = @usuario_id
      `);

    const row = result.recordset[0] || { promedio: 0.0, total_calificaciones: 0 };
    return {
      promedio: Number(row.promedio) || 0.0,
      total_calificaciones: Number(row.total_calificaciones) || 0,
    };
  },

  /**
   * Busca una calificación por su ID primario.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT id, viaje_id, calificador_id, calificado_id, puntuacion, comentario, fecha_creacion
        FROM Calificaciones
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  },
};

module.exports = ratingModel;
