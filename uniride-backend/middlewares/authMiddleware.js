const jwt = require('jsonwebtoken');
const { expandRoleAliases } = require('./roleMiddleware');

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
      if (!Array.isArray(decoded.roles)) {
        decoded.roles = decoded.rol ? [decoded.rol] : ['Pasajero'];
      }
      req.user = decoded;
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

    /**
     * Rol activo:
     * - Sin header X-Active-Role -> rol principal del token
     * - Con header -> debe ser uno de los roles del usuario (si no, 403)
     */
    const requestedRole = req.headers['x-active-role'];

    if (!requestedRole || !String(requestedRole).trim()) {
      req.activeRole = req.user.rol || req.user.roles[0];
      return next();
    }

    const requested = expandRoleAliases(requestedRole);
    const matchedRole = req.user.roles.find((role) =>
      expandRoleAliases(role).some((alias) => requested.includes(alias))
    );

    if (!matchedRole) {
      return res.status(403).json({
        message: 'El rol activo no corresponde a tu cuenta.',
        code: 'INVALID_ACTIVE_ROLE'
      });
    }

    req.activeRole = matchedRole;
    next();
  }
};

module.exports = authMiddleware;
