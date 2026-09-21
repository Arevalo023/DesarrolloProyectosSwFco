const tripService = require("../services/tripService");

const tripController = {
  async listAvailable(req, res) {
    try {
      const { origen, destino, fecha } = req.query;

      if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha.trim())) {
        return res.status(400).json({
          message: "El formato de fecha debe ser YYYY-MM-DD.",
        });
      }

      const trips = await tripService.listAvailable({
        origen: origen?.trim() || null,
        destino: destino?.trim() || null,
        fecha: fecha?.trim() || null,
      });

      return res.status(200).json({ trips });
    } catch (error) {
      return res.status(500).json({ message: "No se pudieron obtener los viajes." });
    }
  },

  async book(req, res) {
    try {
      const tripId = parseInt(req.params.id, 10);
      if (isNaN(tripId) || tripId <= 0) {
        return res.status(400).json({
          message: "El ID del viaje debe ser un número entero positivo.",
        });
      }

      const booking = await tripService.book(tripId, req.user.id);
      return res.status(201).json({
        message: "Reserva realizada correctamente.",
        booking,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudo realizar la reserva.",
      });
    }
  },
};

module.exports = tripController;