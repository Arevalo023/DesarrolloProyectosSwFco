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

  async markRead(req, res) {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ message: "El ID de la notificación debe ser un entero positivo." });
    }
    try {
      const notification = await notificationService.markRead(id, req.user.id);
      if (!notification) {
        return res.status(404).json({ message: "Notificación no encontrada." });
      }
      return res.status(200).json({ notification });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudo actualizar la notificación.",
      });
    }
  },

  async markAllRead(req, res) {
    try {
      const updated = await notificationService.markAllRead(req.user.id);
      return res.status(200).json({ updated });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudieron actualizar las notificaciones.",
      });
    }
  },
};

module.exports = notificationController;
