const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const authService = {
  /**
   * Registra un nuevo usuario en el sistema.
   * @param {object} params
   * @param {string} params.name - Nombre completo del usuario
   * @param {string} params.email - Correo institucional
   * @param {string} params.password - Contraseña en texto plano
   * @param {string} [params.telefono] - Teléfono opcional
   * @param {number} [params.rol_id] - ID del rol (por defecto 1: Pasajero)
   * @param {number} [params.campus_id] - ID del campus (por defecto 1: Campus Arteaga)
   * @returns {Promise<object>}
   */
  async register({
    nombre,
    apellido,
    name,
    email,
    correo,
    password,
    telefono = null,
    rol_id = 1,
    campus_id = 1
  }) {
    const normalizedEmail = (correo || email || '').trim().toLowerCase();

    // 1. Verificar si el correo ya existe
    const existingUser = await userModel.findByEmail(normalizedEmail);
    if (existingUser) {
      const error = new Error('El correo institucional ya se encuentra registrado');
      error.statusCode = 409;
      throw error;
    }

    // 2. Separar nombre completo si llega en un solo campo
    const resolvedNombre = (nombre || name || '').trim();
    const resolvedApellido = (apellido || '').trim();

    let finalNombre = resolvedNombre;
    let finalApellido = resolvedApellido;

    if (!resolvedApellido && resolvedNombre) {
      const nameParts = resolvedNombre.split(/\s+/);
      finalNombre = nameParts[0];
      finalApellido = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ';
    }

    // 3. Hashear la contraseña con bcrypt
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 4. Guardar en base de datos
    const cleanTelefono = telefono ? String(telefono).trim() : null;
    const newUser = await userModel.create({
      rol_id,
      campus_id,
      nombre: finalNombre,
      apellido: finalApellido,
      correo: normalizedEmail,
      password_hash,
      telefono: cleanTelefono
    });

    return {
      id: newUser.id,
      nombre: newUser.nombre,
      apellido: newUser.apellido,
      correo: newUser.correo,
      telefono: newUser.telefono,
      rol_id: newUser.rol_id,
      campus_id: newUser.campus_id,
      fecha_registro: newUser.fecha_registro
    };
  },

  /**
   * Autentica a un usuario y genera su token JWT.
   * @param {object} params
   * @param {string} params.email
   * @param {string} params.password
   * @returns {Promise<object>}
   */
  async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Buscar el usuario por correo
    const user = await userModel.findByEmail(normalizedEmail);
    if (!user) {
      const error = new Error('Credenciales incorrectas');
      error.statusCode = 401;
      throw error;
    }

    // 2. Verificar contraseña con bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const error = new Error('Credenciales incorrectas');
      error.statusCode = 401;
      throw error;
    }

    // 3. Generar token JWT
    const payload = {
      id: user.id,
      correo: user.correo,
      rol_id: user.rol_id,
      rol: user.rol_nombre,
      campus_id: user.campus_id
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'uniride_default_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        correo: user.correo,
        telefono: user.telefono,
        rol: user.rol_nombre,
        campus: user.campus_nombre,
        universidad: user.universidad_nombre
      }
    };
  },

  /**
   * Obtiene la información del perfil del usuario autenticado.
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async getProfile(userId) {
    const user = await userModel.findById(userId);
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      telefono: user.telefono,
      rol: user.rol_nombre,
      campus: user.campus_nombre,
      universidad: user.universidad_nombre,
      fecha_registro: user.fecha_registro
    };
  }
};

module.exports = authService;
