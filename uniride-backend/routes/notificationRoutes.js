const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const notificationController = require("../controllers/notificationController");

// GET /api/notifications[?noLeidas=true]  (notificaciones del usuario autenticado)
router.get("/", authMiddleware.verifyToken, notificationController.list);
router.patch("/read-all", authMiddleware.verifyToken, notificationController.markAllRead);
router.patch("/:id/read", authMiddleware.verifyToken, notificationController.markRead);

module.exports = router;
