const reservationModel = require("../models/reservationModel");
const tripModel = require("../models/tripModel");
const notificationService = require("./notificationService");

const ESTADOS_VALIDOS = ["aceptada", "rechazada"];

const reservationService = {
  async respond(reservationId, driverId, estado) {
    const nuevoEstado = String(estado || "").trim().toLowerCase();

    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
      const e = new Error("El estado debe ser 'aceptada' o 'rechazada'.");
      e.statusCode = 400;
      throw e;
    }

    const reservation = await reservationModel.respond(reservationId, driverId, nuevoEstado);

    // El cambio ya está confirmado en BD; un fallo al notificar no debe romperlo
    try {
      await notificationService.notifyReservationStatusChange(reservation);
    } catch (err) {
      console.error("[notifications] No se pudo notificar el cambio de estado:", err);
    }

    return reservation;
  },

  async cancel(reservationId, userId) {
    const reservation = await reservationModel.cancel(reservationId, userId);

    try {
      const trip = await tripModel.findById(reservation.viaje_id);
      if (trip) {
        await notificationService.notifyReservationCancelled(reservation, trip);
      }
    } catch (err) {
      console.error("[notifications] No se pudo notificar la cancelación:", err);
    }

    return reservation;
  },

  /**
   * Clasifica las reservaciones del pasajero en buckets según su estado y el del viaje.
   * Los criterios son los mismos que los filtros ?estado= de reservationModel.findByPassenger:
   *  - activos: reservación pendiente/aceptada en un viaje vigente.
   *  - cancelados: reservación cancelada o viaje cancelado (salvo las rechazadas).
   *  - completados: reservación aceptada en un viaje finalizado.
   *  - no_aceptadas: el resto (rechazadas, o pendientes en un viaje ya finalizado), para que
   *    ninguna reservación se pierda al clasificar.
   */
  classifyReservationsByStatus(reservations = []) {
    const safeReservations = Array.isArray(reservations) ? reservations : [];
    const buckets = { activos: [], cancelados: [], completados: [], no_aceptadas: [] };
    const normalize = (value) => String(value || "").trim().toLowerCase();

    for (const reservation of safeReservations) {
      const reserva = normalize(reservation?.estado);
      const viaje = normalize(reservation?.viaje_estado);

      if (
        ["pendiente", "aceptada"].includes(reserva) &&
        ["programado", "en_curso", "activo"].includes(viaje)
      ) {
        buckets.activos.push(reservation);
      } else if (reserva !== "rechazada" && (reserva === "cancelada" || viaje === "cancelado")) {
        buckets.cancelados.push(reservation);
      } else if (reserva === "aceptada" && viaje === "finalizado") {
        buckets.completados.push(reservation);
      } else {
        buckets.no_aceptadas.push(reservation);
      }
    }

    return buckets;
  },

  async listByPassenger(passengerId, { order = "asc", estado, classified = false } = {}) {
    if (estado !== undefined && typeof estado !== "string") {
      const e = new Error("El estado debe enviarse como un único valor de texto.");
      e.statusCode = 400;
      throw e;
    }

    const sortOrder = String(order || "asc").trim().toLowerCase() === "desc" ? "desc" : "asc";
    const reservations = await reservationModel.findByPassenger(passengerId, {
      order: sortOrder,
      estado: estado?.trim() || undefined,
    });

    return classified ? this.classifyReservationsByStatus(reservations) : reservations;
  },

  listReceivedByDriver(driverId) {
    return reservationModel.findReceivedByDriver(driverId);
  },
};

module.exports = reservationService;
