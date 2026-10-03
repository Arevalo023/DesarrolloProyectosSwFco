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
};

module.exports = reservationService;
