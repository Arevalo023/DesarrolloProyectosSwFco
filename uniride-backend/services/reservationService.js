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

  async listByPassenger(passengerId, { order = "asc" } = {}) {
    const sortOrder = String(order || "asc").trim().toLowerCase() === "desc" ? "desc" : "asc";
    return reservationModel.findByPassenger(passengerId, { order: sortOrder });
  },
};

module.exports = reservationService;
