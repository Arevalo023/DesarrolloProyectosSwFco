const ratingService = require("../services/ratingService");

const ratingController = {
  /**
   * Endpoint para que un pasajero califique al conductor de un viaje finalizado.
   * Admite:
   *  - POST /api/trips/:id/rate-driver
   *  - POST /api/ratings/driver (con viaje_id en el body)
   */
  async rateDriver(req, res) {
    try {
      const viajeId = req.params.id || req.body.viaje_id;
      const { puntuacion, comentario } = req.body;
      const calificadorId = req.user?.id;

      const result = await ratingService.rateDriver({
        viajeId,
        calificadorId,
        puntuacion,
        comentario,
      });

      return res.status(201).json(result);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "Error al registrar la calificación.",
      });
    }
  },

  /**
   * Endpoint para obtener las calificaciones y promedio de un usuario.
   * Admite:
   *  - GET /api/ratings/user/:id
   */
  async getUserRatings(req, res) {
    try {
      const targetUserId = req.params.id || req.user?.id;
      const result = await ratingService.getUserRatings(targetUserId);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "Error al obtener calificaciones.",
      });
    }
  },
};

module.exports = ratingController;
