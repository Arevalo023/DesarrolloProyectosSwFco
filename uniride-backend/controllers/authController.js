const authService = require('../services/authService');

const authController = {
  /**
   * Controlador para registro de nuevo usuario.
   * POST /users/register
   */
  async register(req, res) {
    try {
      const {
        nombre,
        apellido,
        correo,
        email,
        password,
        telefono,
        rol_id,
        campus_id,
        name,
      } = req.body;

      const user = await authService.register({
        nombre,
        apellido,
        correo: correo || email,
        email: email || correo,
        name: name || nombre,
        password,
        telefono,
        rol_id,
        campus_id
      });

      return res.status(201).json({
        message: 'Usuario registrado exitosamente.',
        user
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        message: error.message || 'Error interno del servidor al registrar el usuario.'
      });
    }
  },

  /**
   * Controlador para inicio de sesión de usuario.
   * POST /users/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      return res.status(200).json({
        message: 'Inicio de sesión exitoso.',
        token: result.token,
        user: result.user
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        message: error.message || 'Error interno del servidor al iniciar sesión.'
      });
    }
  },

  /**
   * Controlador para obtener los datos del usuario autenticado.
   * GET /users/me
   */
  async me(req, res) {
    try {
      const userId = req.user.id;
      const user = await authService.getProfile(userId);

      return res.status(200).json({
        user
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        message: error.message || 'Error al obtener los datos del usuario.'
      });
    }
  }
};

module.exports = authController;
