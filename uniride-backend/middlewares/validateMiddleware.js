const validateMiddleware = {
  /**
   * Valida los datos recibidos para el registro de usuario.
   */
  validateRegister(req, res, next) {
    const { nombre, apellido, correo, email, password, telefono, rol_id, campus_id, name } = req.body;
    const nameValue = (nombre || name || '').trim();
    const emailValue = (correo || email || '').trim();
    let apellidoValue = (apellido || '').trim();

    // Si no enviaron apellido por separado pero name/nombre contiene espacios (ej. "Juan Perez"),
    // se deduce el apellido para no romper peticiones con formato de nombre completo.
    if (!apellidoValue && nameValue.includes(' ')) {
      const parts = nameValue.split(/\s+/);
      apellidoValue = parts.slice(1).join(' ');
    }

    if (!nameValue || nameValue.length < 2) {
      return res.status(400).json({
        message: 'El nombre es requerido (mínimo 2 caracteres).'
      });
    }

    if (!apellidoValue || apellidoValue.length < 2) {
      return res.status(400).json({
        message: 'El apellido es requerido (mínimo 2 caracteres).'
      });
    }

    if (!emailValue || typeof emailValue !== 'string') {
      return res.status(400).json({
        message: 'El correo electrónico es requerido.'
      });
    }

    const educationalEmailRegex = /^[^\s@]+@[^\s@]+\.(edu\.mx|edu|mx)$/i;
    if (!educationalEmailRegex.test(emailValue)) {
      return res.status(400).json({
        message: 'El correo debe ser institucional con dominio educativo (.edu.mx, .edu o .mx).'
      });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!password || typeof password !== 'string' || !passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres, incluir al menos una mayúscula, un número y un carácter especial.'
      });
    }

    if (telefono !== undefined && telefono !== null && String(telefono).trim() !== '') {
      const digits = String(telefono).replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        return res.status(400).json({
          message: 'El teléfono debe contener entre 10 y 15 dígitos numéricos (ej: 8441234567 o 844-123-4567).'
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
   * Valida los datos recibidos para la actualización del perfil de usuario.
   */
  validateUpdateProfile(req, res, next) {
    const { nombre, apellido, telefono, campus_id } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res.status(400).json({
        message: 'El nombre es requerido (mínimo 2 caracteres).'
      });
    }

    if (!apellido || typeof apellido !== 'string' || apellido.trim().length < 2) {
      return res.status(400).json({
        message: 'El apellido es requerido (mínimo 2 caracteres).'
      });
    }

    if (campus_id === undefined || campus_id === null || Number.isNaN(Number(campus_id))) {
      return res.status(400).json({
        message: 'El campus es obligatorio.'
      });
    }

    if (telefono !== undefined && telefono !== null && String(telefono).trim() !== '') {
      const digits = String(telefono).replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        return res.status(400).json({
          message: 'El teléfono debe contener entre 10 y 15 dígitos numéricos (ej: 8441234567 o 844-123-4567).'
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
  },

  /**
   * Valida los datos recibidos para crear o actualizar un vehículo.
   */
  validateVehicle(req, res, next) {
    const { marca, modelo, anio, color, placa, asientos_disponibles } = req.body;

    if (!marca || typeof marca !== 'string' || marca.trim().length < 2) {
      return res.status(400).json({
        message: 'La marca es obligatoria y debe tener al menos 2 caracteres.'
      });
    }

    if (!modelo || typeof modelo !== 'string' || modelo.trim().length < 1) {
      return res.status(400).json({
        message: 'El modelo es obligatorio.'
      });
    }

    if (!anio || !Number.isInteger(Number(anio))) {
      return res.status(400).json({
        message: 'El año es obligatorio y debe ser un número entero.'
      });
    }

    if (!color || typeof color !== 'string' || color.trim().length < 2) {
      return res.status(400).json({
        message: 'El color es obligatorio.'
      });
    }

    if (!placa || typeof placa !== 'string' || placa.trim().length < 1) {
      return res.status(400).json({
        message: 'La placa es obligatoria.'
      });
    }

    if (!asientos_disponibles || !Number.isInteger(Number(asientos_disponibles))) {
      return res.status(400).json({
        message: 'Los asientos disponibles son obligatorios y deben ser un número entero.'
      });
    }

    next();
  },
  /*
}  * Valida los datos recibidos para cambiar el estado de un vehículo.
   */
    validateVehicleStatus(req, res, next) {
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        message: 'El campo activo es obligatorio y debe ser true o false.'
      });
    }

    next();
  }
};

module.exports = validateMiddleware;
