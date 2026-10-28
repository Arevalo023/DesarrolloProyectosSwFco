const userModel = require('../models/userModel');
const tripModel = require('../models/tripModel');
const reservationModel = require('../models/reservationModel');
const ratingService = require('./ratingService');

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
  },

  /**
   * Obtiene el detalle de un usuario para administración: datos básicos
   * (sin contraseña ni teléfono), reputación, viajes publicados y reservaciones.
   * El id ya llega validado por validateMiddleware.validateUserIdParam.
   * @param {number|string} userId
   * @returns {Promise<{ usuario: object, reputacion: object, viajes: object[], reservaciones: object[] }>}
   */
  async getUserDetail(userId) {
    const id = Number(userId);
    const user = await userModel.findById(id);

    if (!user) {
      const error = new Error('El usuario no existe.');
      error.statusCode = 404;
      throw error;
    }

    const [ratings, viajes, reservaciones] = await Promise.all([
      ratingService.getUserRatings(id),
      tripModel.findByDriver(id),
      reservationModel.findByPassenger(id, { order: 'desc' })
    ]);

    // Lista blanca de campos: nunca se expone password_hash ni el teléfono.
    const roles = Array.isArray(user.roles_detalle) ? user.roles_detalle : [];

    return {
      usuario: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        correo: user.correo,
        fecha_registro: user.fecha_registro,
        campus_id: user.campus_id,
        campus: user.campus_nombre || null,
        universidad: user.universidad_nombre || null,
        roles: roles.map((role) => role.nombre),
        roles_detalle: roles
      },
      reputacion: {
        promedio: ratings.promedio,
        total_calificaciones: ratings.total_calificaciones,
        calificaciones: ratings.calificaciones
      },
      viajes: viajes || [],
      reservaciones: reservaciones || []
    };
  }
};

module.exports = userService;
