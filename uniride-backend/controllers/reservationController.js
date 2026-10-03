const reservationService = require("../services/reservationService");

const reservationController = {
  async respond(req, res) {
    try {
      const reservationId = parseInt(req.params.id, 10);
      if (isNaN(reservationId) || reservationId <= 0) {
        return res.status(400).json({
          message: "El ID de la solicitud debe ser un número entero positivo.",
        });
      }

      const reservation = await reservationService.respond(
        reservationId,
        req.user.id,
        req.body?.estado
      );

      return res.status(200).json({
        message: `Solicitud ${reservation.estado} correctamente.`,
        reservation,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudo actualizar la solicitud.",
      });
    }
  },
};

module.exports = reservationController;
