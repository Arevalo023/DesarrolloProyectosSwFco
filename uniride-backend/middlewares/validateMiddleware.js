const validateMiddleware = {
  /**
   * Valida los datos recibidos para el registro de usuario.
   */
  validateRegister(req, res, next) {
    const { nombre, apellido, correo, email, password, telefono, rol_id, campus_id } = req.body;
    const nameValue = nombre ?? name;
    const emailValue = correo ?? email;

    if (!nameValue || typeof nameValue !== 'string' || nameValue.trim().length < 2) {
      return res.status(400).json({
        message: 'El nombre es requerido (mínimo 2 caracteres).'
      });
    }

    if (!apellido || typeof apellido !== 'string' || apellido.trim().length < 2) {
      return res.status(400).json({
        message: 'El apellido es requerido (mínimo 2 caracteres).'
      });
    }

    if (!emailValue || typeof emailValue !== 'string') {
      return res.status(400).json({
        message: 'El correo electrónico es requerido.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue.trim())) {
      return res.status(400).json({
        message: 'El formato del correo electrónico no es válido.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres.'
      });
    }

    if (telefono !== undefined && telefono !== null && String(telefono).trim() !== '') {
      const phoneRegex = /^[0-9+ -]{7,20}$/;
      if (!phoneRegex.test(String(telefono).trim())) {
        return res.status(400).json({
          message: 'El teléfono debe ser un formato válido (entre 7 y 20 dígitos numéricos).'
        });
      }
    }

    if (rol_id !== undefined && rol_id !== null && Number.isNaN(Number(rol_id))) {
      return res.status(400).json({
        message: 'El rol es inválido.'
      });
    }

    if (campus_id !== undefined && campus_id !== null && Number.isNaN(Number(campus_id))) {
      return res.status(400).json({
        message: 'El campus es inválido.'
      });
    }

    next();
  },

  /**
   * Valida los datos recibidos para el inicio de sesión.
   */
  validateLogin(req, res, next) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'El correo electrónico y la contraseña son requeridos.'
      });
    }

    next();
  }
};

module.exports = validateMiddleware;
