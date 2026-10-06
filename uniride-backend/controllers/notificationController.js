const notificationService = require("../services/notificationService");

const notificationController = {
  /** GET /api/notifications[?noLeidas=true]  -> notificaciones del usuario autenticado */
  async list(req, res) {
    try {
      const soloNoLeidas = String(req.query.noLeidas || "").toLowerCase() === "true";
      const notifications = await notificationService.getUserNotifications(req.user.id, {
        soloNoLeidas,
      });
      return res.status(200).json({ notifications });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudieron obtener las notificaciones.",
      });
    }
  },
};

module.exports = notificationController;
