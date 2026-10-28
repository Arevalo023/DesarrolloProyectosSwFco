const userService = require('../services/userService');

const userController = {
  /**
   * Lista los usuarios registrados (solo Administrador).
   * GET /users?q=&rol=&page=&limit=
   */
  async list(req, res) {
    try {
      const { q, rol, page, limit } = req.query;
      const result = await userService.listUsers({ q, rol, page, limit });
      return res.status(200).json(result);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        message: statusCode === 500
          ? 'Error interno del servidor al consultar los usuarios.'
          : error.message
      });
    }
  },

  /**
   * Detalle de un usuario con reputación, viajes y reservaciones (solo Administrador).
   * GET /users/:id
   */
  async getDetail(req, res) {
    try {
      const result = await userService.getUserDetail(req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        message: statusCode === 500
          ? 'Error interno del servidor al consultar el detalle del usuario.'
          : error.message
      });
    }
  }
};

module.exports = userController;
