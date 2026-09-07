const { sql, poolPromise } = require('../config/db');

const userModel = {
  /**
   * Busca un usuario por correo electrónico incluyendo información de su rol y campus.
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const pool = await poolPromise;
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

    return result.recordset[0] || null;
  },

  /**
   * Busca un usuario por su ID.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const pool = await poolPromise;
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

    return result.recordset[0] || null;
  },

  /**
   * Inserta un nuevo usuario en la base de datos.
   * @param {object} userData
   * @returns {Promise<object>}
   */
  async create({ rol_id, campus_id, nombre, apellido, correo, password_hash, telefono = null }) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('rol_id', sql.Int, rol_id)
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

    return result.recordset[0];
  }
};

module.exports = userModel;
