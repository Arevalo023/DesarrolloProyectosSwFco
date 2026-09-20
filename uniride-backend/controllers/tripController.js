const tripService = require("../services/tripService");

const tripController = {
  async listAvailable(req, res) {
    try {
      const trips = await tripService.listAvailable({
        origen: req.query.origen?.trim(),
        destino: req.query.destino?.trim(),
        fecha: req.query.fecha || null,
      });
      return res.status(200).json({ trips });
    } catch (error) {
      return res.status(500).json({ message: "No se pudieron obtener los viajes." });
    }
  },

  async book(req, res) {
    try {
      const booking = await tripService.book(req.params.id, req.user.id);
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