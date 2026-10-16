const express = require("express");
const ratingController = require("../controllers/ratingController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Permite calificar al conductor enviando { viaje_id, puntuacion, comentario }
router.post(
  "/driver",
  authMiddleware.verifyToken,
  ratingController.rateDriver
);

// Consulta calificaciones y promedio de un usuario
router.get(
  "/user/:id",
  authMiddleware.verifyToken,
  ratingController.getUserRatings
);

module.exports = router;
