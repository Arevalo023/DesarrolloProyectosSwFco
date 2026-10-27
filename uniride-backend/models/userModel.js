const { sql, poolPromise } = require('../config/db');

/**
 * Normaliza y agrupa los registros devueltos por la consulta SQL
 * cuando un usuario tiene múltiples roles asignados en UsuariosRoles.
 * @param {Array<object>} rows
 * @returns {object|null}
 */
const formatUserFromRows = (rows) => {
  if (!rows || rows.length === 0) return null;

  const firstRow = rows[0];
  const rolesSet = new Set();
  const rolesDetalle = [];

  for (const row of rows) {
    const rolNombre = row.rol_nombre || row.legacy_rol_nombre;
    const rolId = row.rol_id || row.legacy_rol_id;
    if (rolNombre && !rolesSet.has(rolNombre)) {
      rolesSet.add(rolNombre);
      rolesDetalle.push({ id: Number(rolId), nombre: rolNombre });
    }
  }

  const roles = Array.from(rolesSet);
  if (roles.length === 0) {
    roles.push('Pasajero');
    rolesDetalle.push({ id: 1, nombre: 'Pasajero' });
  }

  return {
    id: firstRow.id,
    campus_id: firstRow.campus_id,
    nombre: firstRow.nombre,
    apellido: firstRow.apellido,
    correo: firstRow.correo,
    password_hash: firstRow.password_hash,
    telefono: firstRow.telefono,
    fecha_registro: firstRow.fecha_registro,
    campus_nombre: firstRow.campus_nombre,
    universidad_nombre: firstRow.universidad_nombre,
    roles, // Array de strings: ['Pasajero', 'Conductor']
    roles_detalle: rolesDetalle, // Array de objetos: [{ id: 1, nombre: 'Pasajero' }]
    rol_id: rolesDetalle[0]?.id || firstRow.legacy_rol_id || 1, // Retrocompatibilidad
    rol_nombre: roles[0] // Retrocompatibilidad
  };
};

/**
 * Escapa los comodines de LIKE en SQL Server (%, _ y [) para que el texto
 * de búsqueda se trate de forma literal. Se usa junto con ESCAPE '\'.
 * @param {string} text
 * @returns {string}
 */
const escapeLike = (text) => String(text).replace(/[\\%_[]/g, (ch) => `\\${ch}`);

const userModel = {
  /**
   * Busca un usuario por correo electrónico incluyendo sus roles (soporte M:N) y campus.
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const pool = await poolPromise;
    try {
      const result = await pool.request()
        .input('correo', sql.VarChar(150), email)
        .query(`
          SELECT 
            u.id,
            u.rol_id AS legacy_rol_id,
            u.campus_id,
            u.nombre,
            u.apellido,
            u.correo,
            u.password_hash,
            u.telefono,
            u.fecha_registro,
            c.nombre AS campus_nombre,
            univ.nombre AS universidad_nombre,
            r.id AS rol_id,
            r.nombre AS rol_nombre,
            rLegacy.nombre AS legacy_rol_nombre
          FROM Usuarios u
          INNER JOIN Campus c ON u.campus_id = c.id
          LEFT JOIN Universidades univ ON c.universidad_id = univ.id
          LEFT JOIN UsuariosRoles ur ON u.id = ur.usuario_id
          LEFT JOIN Roles r ON ur.rol_id = r.id
          LEFT JOIN Roles rLegacy ON u.rol_id = rLegacy.id
          WHERE u.correo = @correo
        `);

      return formatUserFromRows(result.recordset);
    } catch (err) {
      // Fallback por si la tabla UsuariosRoles aún no está migrada
      const result = await pool.request()
        .input('correo', sql.VarChar(150), email)
        .query(`
          SELECT 
            u.id,
            u.rol_id,
            u.campus_id,
            u.nombre,
            u.apellido,
            u.correo,
            u.password_hash,
            u.telefono,
            u.fecha_registro,
            r.nombre AS rol_nombre,
            c.nombre AS campus_nombre,
            univ.nombre AS universidad_nombre
          FROM Usuarios u
          INNER JOIN Roles r ON u.rol_id = r.id
          INNER JOIN Campus c ON u.campus_id = c.id
          LEFT JOIN Universidades univ ON c.universidad_id = univ.id
          WHERE u.correo = @correo
        `);

      const raw = result.recordset[0];
      if (!raw) return null;
      return {
        ...raw,
        roles: [raw.rol_nombre || 'Pasajero'],
        roles_detalle: [{ id: raw.rol_id, nombre: raw.rol_nombre || 'Pasajero' }]
      };
    }
  },

  /**
   * Busca un usuario por su ID incluyendo todos sus roles asignados (soporte M:N).
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const pool = await poolPromise;
    try {
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT 
            u.id,
            u.rol_id AS legacy_rol_id,
            u.campus_id,
            u.nombre,
            u.apellido,
            u.correo,
            u.password_hash,
            u.telefono,
            u.fecha_registro,
            c.nombre AS campus_nombre,
            univ.nombre AS universidad_nombre,
            r.id AS rol_id,
            r.nombre AS rol_nombre,
            rLegacy.nombre AS legacy_rol_nombre
          FROM Usuarios u
          INNER JOIN Campus c ON u.campus_id = c.id
          LEFT JOIN Universidades univ ON c.universidad_id = univ.id
          LEFT JOIN UsuariosRoles ur ON u.id = ur.usuario_id
          LEFT JOIN Roles r ON ur.rol_id = r.id
          LEFT JOIN Roles rLegacy ON u.rol_id = rLegacy.id
          WHERE u.id = @id
        `);

      return formatUserFromRows(result.recordset);
    } catch (err) {
      // Fallback por si la tabla UsuariosRoles aún no está migrada
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT 
            u.id,
            u.rol_id,
            u.campus_id,
            u.nombre,
            u.apellido,
            u.correo,
            u.password_hash,
            u.telefono,
            u.fecha_registro,
            r.nombre AS rol_nombre,
            c.nombre AS campus_nombre,
            univ.nombre AS universidad_nombre
          FROM Usuarios u
          INNER JOIN Roles r ON u.rol_id = r.id
          INNER JOIN Campus c ON u.campus_id = c.id
          LEFT JOIN Universidades univ ON c.universidad_id = univ.id
          WHERE u.id = @id
        `);

      const raw = result.recordset[0];
      if (!raw) return null;
      return {
        ...raw,
        roles: [raw.rol_nombre || 'Pasajero'],
        roles_detalle: [{ id: raw.rol_id, nombre: raw.rol_nombre || 'Pasajero' }]
      };
    }
  },

  /**
   * Inserta un nuevo usuario en la base de datos y asigna su rol inicial en UsuariosRoles.
   * @param {object} userData
   * @returns {Promise<object>}
   */
  async create({ rol_id, campus_id, nombre, apellido, correo, password_hash, telefono = null }) {
    const pool = await poolPromise;
    const initialRolId = Number(rol_id) || 1;

    const result = await pool.request()
      .input('rol_id', sql.Int, initialRolId)
      .input('campus_id', sql.Int, campus_id)
      .input('nombre', sql.VarChar(100), nombre)
      .input('apellido', sql.VarChar(100), apellido)
      .input('correo', sql.VarChar(150), correo)
      .input('password_hash', sql.VarChar(255), password_hash)
      .input('telefono', sql.VarChar(20), telefono)
      .query(`
        INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
        OUTPUT 
          INSERTED.id,
          INSERTED.rol_id,
          INSERTED.campus_id,
          INSERTED.nombre,
          INSERTED.apellido,
          INSERTED.correo,
          INSERTED.telefono,
          INSERTED.fecha_registro
        VALUES (@rol_id, @campus_id, @nombre, @apellido, @correo, @password_hash, @telefono);
      `);

    const newUser = result.recordset[0];

    // Asignar rol inicial en la tabla M:N UsuariosRoles si existe
    try {
      await pool.request()
        .input('usuario_id', sql.Int, newUser.id)
        .input('rol_id', sql.Int, initialRolId)
        .query(`
          IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UsuariosRoles')
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM UsuariosRoles WHERE usuario_id = @usuario_id AND rol_id = @rol_id)
            BEGIN
              INSERT INTO UsuariosRoles (usuario_id, rol_id) VALUES (@usuario_id, @rol_id);
            END
          END
        `);
    } catch (e) {
      console.warn('Advertencia al insertar rol inicial en UsuariosRoles:', e.message);
    }

    return newUser;
  },

  /**
   * Obtiene el id de un rol por su nombre (sin distinguir mayúsculas).
   * @param {string} nombre - Ej. 'Conductor'
   * @returns {Promise<number|null>}
   */
  async findRoleIdByName(nombre) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nombre', sql.VarChar(50), nombre)
      .query('SELECT TOP 1 id FROM Roles WHERE LOWER(nombre) = LOWER(@nombre)');

    return result.recordset[0]?.id ?? null;
  },

  /**
   * Asigna un nuevo rol a un usuario en la tabla intermedia UsuariosRoles.
   * @param {number} userId
   * @param {number} rolId
   * @returns {Promise<object|null>}
   */
  async addRole(userId, rolId) {
    const pool = await poolPromise;
    await pool.request()
      .input('usuario_id', sql.Int, userId)
      .input('rol_id', sql.Int, rolId)
      .query(`
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UsuariosRoles')
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM UsuariosRoles WHERE usuario_id = @usuario_id AND rol_id = @rol_id)
          BEGIN
            INSERT INTO UsuariosRoles (usuario_id, rol_id) VALUES (@usuario_id, @rol_id);
          END
        END
      `);

    return this.findById(userId);
  },

  /**
   * Elimina un rol específico de un usuario en UsuariosRoles.
   * @param {number} userId
   * @param {number} rolId
   * @returns {Promise<object|null>}
   */
  async removeRole(userId, rolId) {
    const pool = await poolPromise;
    await pool.request()
      .input('usuario_id', sql.Int, userId)
      .input('rol_id', sql.Int, rolId)
      .query(`
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UsuariosRoles')
        BEGIN
          DELETE FROM UsuariosRoles WHERE usuario_id = @usuario_id AND rol_id = @rol_id;

          UPDATE Usuarios
          SET rol_id = COALESCE((
            SELECT TOP 1 ur.rol_id
            FROM UsuariosRoles ur
            INNER JOIN Roles r ON r.id = ur.rol_id
            WHERE ur.usuario_id = @usuario_id
            ORDER BY CASE WHEN LOWER(r.nombre) = 'pasajero' THEN 0 ELSE 1 END,
                     ur.rol_id
          ), 1)
          WHERE id = @usuario_id AND rol_id = @rol_id;
        END
      `);

    return this.findById(userId);
  },

  /**
   * Actualiza los datos editables del usuario autenticado.
   * @param {number} id
   * @param {{nombre: string, apellido: string, telefono: string|null, campus_id: number}} userData
   * @returns {Promise<object|null>}
   */
  async updateProfile(id, { nombre, apellido, telefono = null, campus_id }) {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.VarChar(100), nombre)
      .input('apellido', sql.VarChar(100), apellido)
      .input('telefono', sql.VarChar(20), telefono)
      .input('campus_id', sql.Int, campus_id)
      .query(`
        UPDATE Usuarios
        SET nombre = @nombre,
            apellido = @apellido,
            telefono = @telefono,
            campus_id = @campus_id
        WHERE id = @id
      `);

    return this.findById(id);
  },

  /**
   * Lista usuarios con búsqueda, filtro por rol y paginación (vista de Administrador).
   * Nunca selecciona password_hash ni el teléfono.
   * @param {object} params
   * @param {string} [params.search] - Texto a buscar en nombre, apellido o correo
   * @param {number} [params.roleId] - Filtra usuarios que tengan este rol
   * @param {number} params.limit - Registros por página
   * @param {number} params.offset - Registros a omitir
   * @returns {Promise<{ users: object[], total: number }>}
   */
  async findAll({ search = '', roleId = null, limit, offset }) {
    const pool = await poolPromise;
    const term = String(search || '').trim();
    const conditions = [];

    if (term) {
      conditions.push(`(
        u.nombre LIKE @search ESCAPE '\\'
        OR u.apellido LIKE @search ESCAPE '\\'
        OR (u.nombre + ' ' + u.apellido) LIKE @search ESCAPE '\\'
        OR u.correo LIKE @search ESCAPE '\\'
      )`);
    }

    if (roleId) {
      // Un usuario tiene el rol si está en UsuariosRoles; si no tiene filas ahí
      // (datos antiguos), se toma el rol principal de Usuarios.rol_id.
      conditions.push(`(
        EXISTS (SELECT 1 FROM UsuariosRoles ur WHERE ur.usuario_id = u.id AND ur.rol_id = @rol_id)
        OR (u.rol_id = @rol_id AND NOT EXISTS (SELECT 1 FROM UsuariosRoles ur2 WHERE ur2.usuario_id = u.id))
      )`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const bindFilters = (request) => {
      if (term) request.input('search', sql.VarChar(255), `%${escapeLike(term)}%`);
      if (roleId) request.input('rol_id', sql.Int, roleId);
      return request;
    };

    const countResult = await bindFilters(pool.request())
      .query(`SELECT COUNT(*) AS total FROM Usuarios u ${where}`);
    const total = Number(countResult.recordset[0]?.total) || 0;

    if (total === 0) return { users: [], total: 0 };

    const pageResult = await bindFilters(pool.request())
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT
          u.id,
          u.nombre,
          u.apellido,
          u.correo,
          u.fecha_registro,
          u.campus_id,
          c.nombre AS campus_nombre,
          univ.nombre AS universidad_nombre,
          u.rol_id AS legacy_rol_id,
          rLegacy.nombre AS legacy_rol_nombre
        FROM Usuarios u
        LEFT JOIN Campus c ON u.campus_id = c.id
        LEFT JOIN Universidades univ ON c.universidad_id = univ.id
        LEFT JOIN Roles rLegacy ON u.rol_id = rLegacy.id
        ${where}
        ORDER BY u.id
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    const rows = pageResult.recordset;
    if (rows.length === 0) return { users: [], total };

    // Roles M:N de los usuarios de esta página (una sola consulta)
    const rolesByUser = new Map();
    const rolesRequest = pool.request();
    const idParams = rows.map((row, index) => {
      rolesRequest.input(`id${index}`, sql.Int, row.id);
      return `@id${index}`;
    });
    const rolesResult = await rolesRequest.query(`
      SELECT ur.usuario_id, r.id, r.nombre
      FROM UsuariosRoles ur
      INNER JOIN Roles r ON ur.rol_id = r.id
      WHERE ur.usuario_id IN (${idParams.join(', ')})
      ORDER BY ur.usuario_id, r.id
    `);

    for (const role of rolesResult.recordset) {
      if (!rolesByUser.has(role.usuario_id)) rolesByUser.set(role.usuario_id, []);
      rolesByUser.get(role.usuario_id).push({ id: Number(role.id), nombre: role.nombre });
    }

    const users = rows.map((row) => {
      let roles = rolesByUser.get(row.id) || [];
      if (roles.length === 0 && row.legacy_rol_nombre) {
        roles = [{ id: Number(row.legacy_rol_id), nombre: row.legacy_rol_nombre }];
      }
      return {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        correo: row.correo,
        fecha_registro: row.fecha_registro,
        campus_id: row.campus_id,
        campus: row.campus_nombre || null,
        universidad: row.universidad_nombre || null,
        roles: roles.map((role) => role.nombre),
        roles_detalle: roles
      };
    });

    return { users, total };
  },

  async findCampuses() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        c.id,
        c.nombre AS campus,
        u.nombre AS universidad
      FROM Campus c
      INNER JOIN Universidades u ON c.universidad_id = u.id
      ORDER BY u.nombre, c.nombre
    `);

    return result.recordset;
  }
};

module.exports = userModel;
