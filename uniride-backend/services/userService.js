const userModel = require('../models/userModel');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const userService = {
  DEFAULT_LIMIT,
  MAX_LIMIT,

  /**
   * Lista los usuarios registrados con búsqueda, filtro por rol y paginación.
   * Los parámetros ya llegan validados por validateMiddleware.validateListUsers.
   * @param {object} params
   * @param {string} [params.q] - Búsqueda por nombre o correo
   * @param {string} [params.rol] - Nombre del rol a filtrar (ej. 'Conductor')
   * @param {number|string} [params.page] - Página (1 en adelante)
   * @param {number|string} [params.limit] - Registros por página (máx. 50)
   * @returns {Promise<{ usuarios: object[], paginacion: object }>}
   */
  async listUsers({ q, rol, page, limit } = {}) {
    const pagina = Number(page) || 1;
    const limite = Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const search = (q || '').trim();

    let roleId = null;
    const rolName = (rol || '').trim();
    if (rolName) {
      roleId = await userModel.findRoleIdByName(rolName);
      if (!roleId) {
        const error = new Error(`El rol "${rolName}" no existe.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const { users, total } = await userModel.findAll({
      search,
      roleId,
      limit: limite,
      offset: (pagina - 1) * limite
    });

    return {
      usuarios: users,
      paginacion: {
        pagina,
        limite,
        total,
        total_paginas: Math.ceil(total / limite)
      }
    };
  }
};

module.exports = userService;
