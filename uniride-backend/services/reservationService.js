const reservationModel = require("../models/reservationModel");

const ESTADOS_VALIDOS = ["aceptada", "rechazada"];

const reservationService = {
  async respond(reservationId, driverId, estado) {
    const nuevoEstado = String(estado || "").trim().toLowerCase();

    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
      const e = new Error("El estado debe ser 'aceptada' o 'rechazada'.");
      e.statusCode = 400;
      throw e;
    }

    return reservationModel.respond(reservationId, driverId, nuevoEstado);
  },

  async cancel(reservationId, userId) {
    return reservationModel.cancel(reservationId, userId);
  },

  async listByPassenger(passengerId, { order = "asc" } = {}) {
    const sortOrder = String(order || "asc").trim().toLowerCase() === "desc" ? "desc" : "asc";
    return reservationModel.findByPassenger(passengerId, { order: sortOrder });
  },
};

module.exports = reservationService;
