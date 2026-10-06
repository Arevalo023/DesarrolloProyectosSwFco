const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const notificationController = require("../controllers/notificationController");

// GET /api/notifications[?noLeidas=true]  (notificaciones del usuario autenticado)
router.get("/", authMiddleware.verifyToken, notificationController.list);

module.exports = router;
