const { sql, poolPromise } = require("../config/db");

const notificationModel = {
  /**
   * Inserta una notificación para un usuario.
   * solicitudId y viajeId son opcionales (evento que la originó).
   */
  async create({ usuarioId, solicitudId = null, viajeId = null, tipo, titulo, mensaje }) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("usuarioId", sql.Int, usuarioId)
      .input("solicitudId", sql.Int, solicitudId)
      .input("viajeId", sql.Int, viajeId)
      .input("tipo", sql.VarChar(50), tipo)
      .input("titulo", sql.VarChar(150), titulo)
      .input("mensaje", sql.VarChar(500), mensaje)
      .query(`
        INSERT INTO Notificaciones (usuario_id, solicitud_id, viaje_id, tipo, titulo, mensaje)
        OUTPUT INSERTED.id, INSERTED.usuario_id, INSERTED.solicitud_id, INSERTED.viaje_id,
               INSERTED.tipo, INSERTED.titulo, INSERTED.mensaje, INSERTED.leida,
               INSERTED.fecha_creacion
        VALUES (@usuarioId, @solicitudId, @viajeId, @tipo, @titulo, @mensaje)
      `);
    return result.recordset[0];
  },

  /**
   * Notificaciones de un usuario, de la más reciente a la más antigua.
   */
  async findByUser(usuarioId, { soloNoLeidas = false, limit = 50 } = {}) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("usuarioId", sql.Int, usuarioId)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
               id, usuario_id, solicitud_id, viaje_id, tipo, titulo, mensaje,
               leida, fecha_creacion
        FROM Notificaciones
        WHERE usuario_id = @usuarioId
          ${soloNoLeidas ? "AND leida = 0" : ""}
        ORDER BY fecha_creacion DESC, id DESC
      `);
    return result.recordset;
  },

  async markRead(id, usuarioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("usuarioId", sql.Int, usuarioId)
      .query(`
        UPDATE Notificaciones
        SET leida = 1
        OUTPUT INSERTED.id, INSERTED.usuario_id, INSERTED.solicitud_id,
               INSERTED.viaje_id, INSERTED.tipo, INSERTED.titulo,
               INSERTED.mensaje, INSERTED.leida, INSERTED.fecha_creacion
        WHERE id = @id AND usuario_id = @usuarioId
      `);
    return result.recordset[0] || null;
  },

  async markAllRead(usuarioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("usuarioId", sql.Int, usuarioId)
      .query(`
        UPDATE Notificaciones
        SET leida = 1
        WHERE usuario_id = @usuarioId AND leida = 0
      `);
    return result.rowsAffected[0] || 0;
  },
};

module.exports = notificationModel;
