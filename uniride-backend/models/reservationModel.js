const { sql, poolPromise } = require("../config/db");

const RESERVA = "LOWER(COALESCE(sv.estado, ''))";
const VIAJE = "LOWER(COALESCE(v.estado, ''))";
const ES_ACTIVA =
  `(${RESERVA} IN ('pendiente', 'aceptada') AND ${VIAJE} IN ('programado', 'en_curso', 'activo'))`;

/**
 * Categorías para filtrar las reservaciones del pasajero con ?estado=. Combinan el estado de
 * la reservación (sv.estado) con el del viaje (v.estado):
 *  - activos: reservación pendiente/aceptada en un viaje programado/en_curso/activo.
 *  - cancelados: reservación cancelada o viaje cancelado (las rechazadas no cuentan).
 *  - completados: reservación aceptada en un viaje finalizado.
 *  - historial: todo lo que no es activo (complemento exacto de "activos").
 * Las condiciones son constantes: ningún valor del cliente se concatena en el SQL.
 */
const CONDICIONES_ESTADO_PASAJERO = Object.freeze({
  activos: ES_ACTIVA,
  cancelados:
    `(${RESERVA} <> 'rechazada' AND (${RESERVA} = 'cancelada' OR ${VIAJE} = 'cancelado'))`,
  completados: `(${RESERVA} = 'aceptada' AND ${VIAJE} = 'finalizado')`,
  historial: `(NOT ${ES_ACTIVA})`,
});

const ALIAS_ESTADO_PASAJERO = Object.freeze({
  activo: "activos",
  cancelado: "cancelados",
  completado: "completados",
  finalizado: "completados",
  finalizados: "completados",
});

/** Devuelve la categoría canónica de ?estado= o undefined si no es válida. */
const categoriaEstadoPasajero = (estado) => {
  const normalizado = String(estado ?? "").trim().toLowerCase();
  const categoria = ALIAS_ESTADO_PASAJERO[normalizado] || normalizado;
  return Object.prototype.hasOwnProperty.call(CONDICIONES_ESTADO_PASAJERO, categoria)
    ? categoria
    : undefined;
};

const reservationModel = {
  categoriaEstadoPasajero,
  CATEGORIAS_ESTADO_PASAJERO: Object.keys(CONDICIONES_ESTADO_PASAJERO),

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

  /**
   * Cancela una reservación por el pasajero o por el conductor dueño del viaje.
   * Si la reservación estaba 'aceptada', restituye 1 cupo al viaje.
   * Si estaba 'pendiente', cambia a 'cancelada' sin modificar cupo.
   * @param {number} reservationId
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async cancel(reservationId, userId) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Leer solicitud + viaje con bloqueo para evitar carreras de cancelación/aceptación
      const found = await transaction.request()
        .input("id", sql.Int, reservationId)
        .query(`
          SELECT s.id, s.viaje_id, s.pasajero_id, s.estado, s.fecha_solicitud,
                 v.conductor_id, v.cupo_disponible,
                 v.estado AS viaje_estado, v.fecha_salida
          FROM SolicitudesViaje s WITH (UPDLOCK, ROWLOCK)
          INNER JOIN Viajes v WITH (UPDLOCK, ROWLOCK) ON v.id = s.viaje_id
          WHERE s.id = @id
        `);

      const row = found.recordset[0];
      if (!row) {
        const e = new Error("La reservación no existe.");
        e.statusCode = 404;
        throw e;
      }

      // 2. Solo el pasajero que solicitó o el conductor dueño del viaje
      const isPassenger = row.pasajero_id === userId;
      const isDriver = row.conductor_id === userId;
      if (!isPassenger && !isDriver) {
        const e = new Error("No tienes permisos para cancelar esta reservación.");
        e.statusCode = 403;
        throw e;
      }

      // 3. Validar estado actual de la reservación
      const estadoActual = String(row.estado || "").toLowerCase();
      if (estadoActual === "cancelada") {
        const e = new Error("La reservación ya se encuentra cancelada.");
        e.statusCode = 409;
        throw e;
      }

      if (estadoActual === "rechazada") {
        const e = new Error("No se puede cancelar una reservación rechazada.");
        e.statusCode = 409;
        throw e;
      }

      // 4. Validar tiempo límite / estado del viaje
      if (["cancelado", "finalizado"].includes(String(row.viaje_estado || "").toLowerCase())) {
        const e = new Error("El viaje ya no está disponible para cancelaciones.");
        e.statusCode = 400;
        throw e;
      }

      if (new Date(row.fecha_salida) <= new Date()) {
        const e = new Error("El tiempo límite para cancelar la reservación ha expirado o el viaje ya inició.");
        e.statusCode = 400;
        throw e;
      }

      // 5. Si la reservación estaba 'aceptada', restituir el cupo al viaje
      let nuevoCupo = row.cupo_disponible;
      if (estadoActual === "aceptada") {
        await transaction.request()
          .input("viajeId", sql.Int, row.viaje_id)
          .query(`
            UPDATE Viajes
            SET cupo_disponible = cupo_disponible + 1
            WHERE id = @viajeId
          `);
        nuevoCupo += 1;
      }

      // 6. Actualizar estado a 'cancelada'
      const result = await transaction.request()
        .input("id", sql.Int, reservationId)
        .query(`
          UPDATE SolicitudesViaje
          SET estado = 'cancelada'
          OUTPUT INSERTED.id, INSERTED.viaje_id, INSERTED.pasajero_id, INSERTED.estado, INSERTED.fecha_solicitud
          WHERE id = @id
        `);

      await transaction.commit();

      return {
        ...result.recordset[0],
        cancelado_por: isPassenger ? "pasajero" : "conductor",
        asientos_restantes: nuevoCupo,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Obtiene las reservaciones realizadas por el pasajero autenticado.
   * Incluye datos completos del viaje, vehículo y conductor.
   * @param {number} passengerId
   * @param {object} [options]
   * @param {string} [options.order='asc'] - 'asc' | 'desc' ordenado por fecha_salida
   * @param {string} [options.estado] - activos | cancelados | completados | historial
   *   (con los alias activo, cancelado, completado, finalizado). Sin valor: todas.
   * @returns {Promise<Array>}
   */
  async findByPassenger(passengerId, { order = "asc", estado } = {}) {
    let filtroEstado = "";
    if (estado !== undefined && estado !== null && String(estado).trim() !== "") {
      const categoria = categoriaEstadoPasajero(estado);
      if (!categoria) {
        const error = new Error(
          `El estado debe ser uno de: ${Object.keys(CONDICIONES_ESTADO_PASAJERO).join(", ")}.`
        );
        error.statusCode = 400;
        throw error;
      }
      filtroEstado = `AND ${CONDICIONES_ESTADO_PASAJERO[categoria]}`;
    }

    const pool = await poolPromise;
    const sortDirection = String(order).toLowerCase() === "desc" ? "DESC" : "ASC";

    const result = await pool.request()
      .input("passengerId", sql.Int, passengerId)
      .query(`
        SELECT sv.id, sv.viaje_id, sv.pasajero_id, sv.estado, sv.fecha_solicitud,
               v.origen, v.destino, v.fecha_salida, v.cupo_disponible,
               v.cupo_disponible AS asientos_disponibles,
               v.costo_por_pasajero, v.estado AS viaje_estado,
               u.id AS conductor_id,
               CONCAT(u.nombre, ' ', u.apellido) AS conductor_nombre,
               u.telefono AS conductor_telefono,
               ve.id AS vehiculo_id, ve.marca AS vehiculo_marca,
               ve.modelo AS vehiculo_modelo, ve.color AS vehiculo_color,
               ve.placa AS vehiculo_placa
        FROM SolicitudesViaje sv
        INNER JOIN Viajes v ON v.id = sv.viaje_id
        INNER JOIN Usuarios u ON u.id = v.conductor_id
        LEFT JOIN Vehiculos ve ON ve.id = v.vehiculo_id
        WHERE sv.pasajero_id = @passengerId
          ${filtroEstado}
        ORDER BY v.fecha_salida ${sortDirection}
      `);

    return result.recordset;
  },

  async findReceivedByDriver(driverId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("driverId", sql.Int, driverId)
      .query(`
        SELECT sv.id, sv.viaje_id, sv.pasajero_id, sv.estado, sv.fecha_solicitud,
               CONCAT(p.nombre, ' ', p.apellido) AS pasajero_nombre,
               v.origen, v.destino, v.fecha_salida, v.estado AS viaje_estado
        FROM SolicitudesViaje sv
        INNER JOIN Viajes v ON v.id = sv.viaje_id
        INNER JOIN Usuarios p ON p.id = sv.pasajero_id
        WHERE v.conductor_id = @driverId
        ORDER BY v.fecha_salida ASC, sv.fecha_solicitud ASC
      `);

    return result.recordset;
  },
};

module.exports = reservationModel;
