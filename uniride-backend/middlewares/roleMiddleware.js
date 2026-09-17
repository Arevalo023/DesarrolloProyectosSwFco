/**
 * Normaliza un nombre de rol a minúsculas y expande alias conocidos.
 * Ej: 'admin' <-> 'administrador'
 * @param {string} role
 * @returns {string[]}
 */
const expandRoleAliases = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'admin') return ['admin', 'administrador'];
  if (normalized === 'administrador') return ['admin', 'administrador'];
  return [normalized];
};

/**
 * Middleware para control de acceso basado en roles (RBAC).
 * Restringe el acceso a endpoints según el rol o roles del usuario autenticado.
 * 
 * Uso:
 *   router.post('/trips', authMiddleware.verifyToken, roleMiddleware(['Conductor']), tripController.create);
 *   router.get('/admin', authMiddleware.verifyToken, roleMiddleware('Administrador'), adminController.dashboard);
 *   router.post('/vehicles', authMiddleware.verifyToken, roleMiddleware(['conductor', 'admin']), vehicleController.create);
 * 
 * @param {...(string|string[])} allowedRoles - Roles permitidos para acceder a la ruta.
 * @returns {Function} Express middleware function (req, res, next)
 */
const roleMiddleware = (...allowedRoles) => {
  // Aplanar y normalizar los roles permitidos a minúsculas
  const targetRoles = allowedRoles
    .flat(Infinity)
    .filter(Boolean)
    .flatMap(expandRoleAliases);

  return (req, res, next) => {
    // 1. Validar que exista usuario autenticado previamente por authMiddleware
    if (!req.user) {
      return res.status(401).json({
        message: 'Acceso no autorizado: No se encontró sesión de usuario.'
      });
    }

    // 2. Extraer roles del usuario autenticado (soporta array roles y fallback a rol escalar)
    const rawUserRoles = Array.isArray(req.user.roles)
      ? req.user.roles
      : (req.user.rol ? [req.user.rol] : []);

    const userRoles = rawUserRoles
      .filter(Boolean)
      .flatMap(expandRoleAliases);

    // 3. Verificar si el usuario cuenta con al menos uno de los roles permitidos
    const hasPermission = targetRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        message: 'Acceso denegado: No cuentas con los permisos necesarios para realizar esta acción.'
      });
    }

    // 4. Autorizado: continuar con la petición
    next();
  };
};

module.exports = roleMiddleware;
