const validateMiddleware = {
  /**
   * Valida los datos recibidos para el registro de usuario.
   */
  validateRegister(req, res, next) {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        message: 'El nombre completo es requerido (mínimo 2 caracteres).'
      });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        message: 'El correo electrónico es requerido.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        message: 'El formato del correo electrónico no es válido.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres.'
      });
    }

    const { telefono } = req.body;
    if (telefono !== undefined && telefono !== null && String(telefono).trim() !== '') {
      const phoneRegex = /^[0-9+ -]{7,20}$/;
      if (!phoneRegex.test(String(telefono).trim())) {
        return res.status(400).json({
          message: 'El teléfono debe ser un formato válido (entre 7 y 20 dígitos numéricos).'
        });
      }
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
