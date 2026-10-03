const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const reservationController = require("../controllers/reservationController");

// PATCH /api/reservations/:id   body: { "estado": "aceptada" | "rechazada" }
router.patch("/:id", authMiddleware.verifyToken, reservationController.respond);

module.exports = router;
