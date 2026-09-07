const jwt = require('jsonwebtoken');

const authMiddleware = {
  /**
   * Middleware para proteger rutas mediante validación de token JWT.
   */
  verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Acceso no autorizado: Token no proporcionado.'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'uniride_default_secret_key'
      );
      req.user = decoded;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'La sesión ha expirado. Por favor inicia sesión nuevamente.'
        });
      }

      return res.status(401).json({
        message: 'Token de autenticación no válido.'
      });
    }
  }
};

module.exports = authMiddleware;
