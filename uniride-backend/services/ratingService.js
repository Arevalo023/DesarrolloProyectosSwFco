const ratingModel = require("../models/ratingModel");
const tripModel = require("../models/tripModel");

const ESTADOS_FINALIZADOS = ["finalizado", "completado"];

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/** Convierte a entero positivo o lanza 400 con el mensaje indicado. */
const parsePositiveId = (value, message) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw httpError(message, 400);
  return id;
};

const parseScore = (puntuacion) => {
  const score = Number(puntuacion);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw httpError("La puntuación debe ser un número entero entre 1 y 5.", 400);
  }
  return score;
};

const parseComment = (comentario) => {
  if (comentario === undefined || comentario === null) return null;
  if (typeof comentario !== "string") {
    throw httpError("El comentario debe ser una cadena de texto.", 400);
  }
  const clean = comentario.trim();
  if (clean.length > 500) {
    throw httpError("El comentario no puede exceder los 500 caracteres.", 400);
  }
  return clean.length === 0 ? null : clean;
};

const ratingService = {
  /**
   * Permite que un pasajero con reservación aceptada califique al conductor de un viaje finalizado.
   * @param {object} params
   * @param {number} params.viajeId
   * @param {number} params.calificadorId
   * @param {number} params.puntuacion
   * @param {string} [params.comentario]
   * @returns {Promise<object>}
   */
  async rateDriver({ viajeId, calificadorId, puntuacion, comentario }) {
    const vId = Number(viajeId);
    if (!vId || Number.isNaN(vId) || vId <= 0) {
      const error = new Error("El ID del viaje es inválido o requerido.");
      error.statusCode = 400;
      throw error;
    }

    const cId = Number(calificadorId);
    if (!cId || Number.isNaN(cId) || cId <= 0) {
      const error = new Error("El ID del calificador es inválido o requerido.");
      error.statusCode = 400;
      throw error;
    }

    const score = Number(puntuacion);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      const error = new Error("La puntuación debe ser un número entero entre 1 y 5.");
      error.statusCode = 400;
      throw error;
    }

    let cleanComentario = null;
    if (comentario !== undefined && comentario !== null) {
      if (typeof comentario !== "string") {
        const error = new Error("El comentario debe ser una cadena de texto.");
        error.statusCode = 400;
        throw error;
      }
      cleanComentario = comentario.trim();
      if (cleanComentario.length > 500) {
        const error = new Error("El comentario no puede exceder los 500 caracteres.");
        error.statusCode = 400;
        throw error;
      }
      if (cleanComentario.length === 0) {
        cleanComentario = null;
      }
    }

    // 1. Obtener viaje
    const trip = await tripModel.findById(vId);
    if (!trip) {
      const error = new Error("Viaje no encontrado.");
      error.statusCode = 404;
      throw error;
    }

    // 2. Validar que el viaje esté finalizado
    const estadoViaje = String(trip.estado || "").toLowerCase().trim();
    if (!["finalizado", "completado"].includes(estadoViaje)) {
      const error = new Error("Solo se puede calificar al conductor cuando el viaje ha finalizado.");
      error.statusCode = 400;
      throw error;
    }

    // 3. Validar que el calificador no sea el mismo conductor
    if (Number(trip.conductor_id) === cId) {
      const error = new Error("No puedes calificarte a ti mismo como conductor de tu propio viaje.");
      error.statusCode = 400;
      throw error;
    }

    // 4. Validar que el usuario sea un pasajero con reservación aceptada
    const hasReservation = await ratingModel.hasAcceptedReservation({
      viajeId: vId,
      pasajeroId: cId,
    });

    if (!hasReservation) {
      const error = new Error("Solo los pasajeros con reservación confirmada en este viaje pueden calificar al conductor.");
      error.statusCode = 403;
      throw error;
    }

    // 5. Validar que no exista calificación previa de este pasajero al conductor en este viaje
    const existingRating = await ratingModel.findByTripAndParticipants({
      viajeId: vId,
      calificadorId: cId,
      calificadoId: trip.conductor_id,
    });

    if (existingRating) {
      const error = new Error("Ya has calificado al conductor de este viaje.");
      error.statusCode = 409;
      throw error;
    }

    // 6. Insertar calificación
    const rating = await ratingModel.create({
      viajeId: vId,
      calificadorId: cId,
      calificadoId: trip.conductor_id,
      puntuacion: score,
      comentario: cleanComentario,
    });

    return {
      message: "Calificación al conductor registrada exitosamente.",
      rating,
    };
  },

  /**
   * Permite que el conductor propietario de un viaje finalizado califique a un pasajero
   * con reservación aceptada en ese viaje (Issue #115).
   * @param {object} params
   * @param {number} params.viajeId
   * @param {number} params.calificadorId  conductor autenticado
   * @param {number} params.pasajeroId     pasajero a calificar
   * @param {number} params.puntuacion
   * @param {string} [params.comentario]
   * @returns {Promise<object>}
   */
  async ratePassenger({ viajeId, calificadorId, pasajeroId, puntuacion, comentario }) {
    const vId = parsePositiveId(viajeId, "El ID del viaje es inválido o requerido.");
    const cId = parsePositiveId(calificadorId, "El ID del calificador es inválido o requerido.");
    const pId = parsePositiveId(pasajeroId, "El ID del pasajero es inválido o requerido.");
    const score = parseScore(puntuacion);
    const cleanComentario = parseComment(comentario);

    // 1. Obtener viaje
    const trip = await tripModel.findById(vId);
    if (!trip) throw httpError("Viaje no encontrado.", 404);

    // 2. Validar que el viaje esté finalizado
    const estadoViaje = String(trip.estado || "").toLowerCase().trim();
    if (!ESTADOS_FINALIZADOS.includes(estadoViaje)) {
      throw httpError("Solo se puede calificar a un pasajero cuando el viaje ha finalizado.", 400);
    }

    // 3. Solo el conductor propietario del viaje puede calificar a sus pasajeros
    if (Number(trip.conductor_id) !== cId) {
      throw httpError("Solo el conductor de este viaje puede calificar a sus pasajeros.", 403);
    }

    // 4. El conductor no puede calificarse a sí mismo
    if (pId === cId) {
      throw httpError("No puedes calificarte a ti mismo.", 400);
    }

    // 5. El calificado debe ser un pasajero con reservación aceptada en el viaje
    const hasReservation = await ratingModel.hasAcceptedReservation({
      viajeId: vId,
      pasajeroId: pId,
    });
    if (!hasReservation) {
      throw httpError("Solo se puede calificar a pasajeros con reservación confirmada en este viaje.", 403);
    }

    // 6. Una sola calificación del conductor a cada pasajero por viaje
    const existingRating = await ratingModel.findByTripAndParticipants({
      viajeId: vId,
      calificadorId: cId,
      calificadoId: pId,
    });
    if (existingRating) {
      throw httpError("Ya has calificado a este pasajero en este viaje.", 409);
    }

    // 7. Insertar calificación
    const rating = await ratingModel.create({
      viajeId: vId,
      calificadorId: cId,
      calificadoId: pId,
      puntuacion: score,
      comentario: cleanComentario,
    });

    return {
      message: "Calificación al pasajero registrada exitosamente.",
      rating,
    };
  },

  /**
   * Obtiene las calificaciones recibidas por un usuario y su promedio.
   * @param {number} usuarioId
   * @returns {Promise<object>}
   */
  async getUserRatings(usuarioId) {
    const uId = Number(usuarioId);
    if (!uId || Number.isNaN(uId) || uId <= 0) {
      const error = new Error("ID de usuario inválido.");
      error.statusCode = 400;
      throw error;
    }

    const [ratings, stats] = await Promise.all([
      ratingModel.findByUser(uId),
      ratingModel.getAverageScore(uId),
    ]);

    return {
      usuario_id: uId,
      promedio: stats.promedio,
      total_calificaciones: stats.total_calificaciones,
      calificaciones: ratings || [],
    };
  },
};

module.exports = ratingService;
