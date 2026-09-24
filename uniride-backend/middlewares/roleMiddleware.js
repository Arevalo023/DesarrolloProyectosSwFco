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
 * Valida contra el ROL ACTIVO del usuario (req.activeRole), que
 * authMiddleware obtiene del header X-Active-Role o, si no viene,
 * del rol principal del token.
 *
 * Uso:
 *   router.post('/trips', authMiddleware.verifyToken, roleMiddleware(['Conductor']), tripController.create);
 *   router.get('/admin', authMiddleware.verifyToken, roleMiddleware('Administrador'), adminController.dashboard);
 *
 * @param {...(string|string[])} allowedRoles - Roles permitidos para acceder a la ruta.
 * @returns {Function} Express middleware function (req, res, next)
 */
const roleMiddleware = (...allowedRoles) => {
  const allowedList = allowedRoles.flat(Infinity).filter(Boolean);

  // Aplanar y normalizar los roles permitidos a minúsculas
  const targetRoles = allowedList.flatMap(expandRoleAliases);

  return (req, res, next) => {
    // 1. Validar que exista usuario autenticado previamente por authMiddleware
    if (!req.user) {
      return res.status(401).json({
        message: 'Acceso no autorizado: No se encontró sesión de usuario.'
      });
    }

    // 2. Rol activo (authMiddleware siempre lo define)
    const activeRoles = expandRoleAliases(req.activeRole);

    if (targetRoles.some((role) => activeRoles.includes(role))) {
      return next();
    }

    // 3. Si el usuario SÍ tiene un rol permitido pero no está activo,
    //    indicarle que cambie de modo en lugar de un mensaje genérico
    const rawUserRoles = Array.isArray(req.user.roles)
      ? req.user.roles
      : (req.user.rol ? [req.user.rol] : []);

    const ownedAllowed = allowedList.find((allowed) =>
      rawUserRoles
        .flatMap(expandRoleAliases)
        .some((role) => expandRoleAliases(allowed).includes(role))
    );

    if (ownedAllowed) {
      return res.status(403).json({
        message: `Cambia a modo ${ownedAllowed} para realizar esta acción.`,
        code: 'ROLE_NOT_ACTIVE',
        requiredRole: ownedAllowed
      });
    }

    return res.status(403).json({
      message: 'Acceso denegado: No cuentas con los permisos necesarios para realizar esta acción.'
    });
  };
};

roleMiddleware.expandRoleAliases = expandRoleAliases;

module.exports = roleMiddleware;
