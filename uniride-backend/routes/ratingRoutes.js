const express = require("express");
const ratingController = require("../controllers/ratingController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Permite calificar al conductor enviando { viaje_id, puntuacion, comentario }
router.post(
  "/driver",
  authMiddleware.verifyToken,
  ratingController.rateDriver
);

// Permite al conductor calificar a un pasajero enviando { viaje_id, pasajero_id, puntuacion, comentario }
router.post(
  "/passenger",
  authMiddleware.verifyToken,
  roleMiddleware(["Conductor"]),
  ratingController.ratePassenger
);

// Consulta calificaciones y promedio de un usuario
router.get(
  "/user/:id",
  authMiddleware.verifyToken,
  ratingController.getUserRatings
);

module.exports = router;
