const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const reservationController = require("../controllers/reservationController");

// GET /api/reservations (mis reservaciones como pasajero)
router.get("/", authMiddleware.verifyToken, reservationController.listMyReservations);

// PATCH /api/reservations/:id/cancel (cancelar reservación por pasajero o conductor)
router.patch("/:id/cancel", authMiddleware.verifyToken, reservationController.cancel);

// PATCH /api/reservations/:id   body: { "estado": "aceptada" | "rechazada" }
router.patch("/:id", authMiddleware.verifyToken, reservationController.respond);

module.exports = router;
