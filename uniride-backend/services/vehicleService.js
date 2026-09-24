const vehicleModel = require("../models/vehicleModel");
const userModel = require("../models/userModel");
const authService = require("./authService");

/**
 * Si el usuario aún no es Conductor, le agrega el rol y genera
 * una sesión nueva (token con los roles actualizados).
 * Devuelve null si ya era Conductor o si no se pudo asignar el rol.
 * @param {number} usuario_id
 * @returns {Promise<{token: string, user: object}|null>}
 */
const asegurarRolConductor = async (usuario_id) => {
  const user = await userModel.findById(usuario_id);
  const roles = (user?.roles || []).map((r) => String(r).trim().toLowerCase());

  if (roles.includes("conductor")) {
    return null;
  }

  const conductorRolId = await userModel.findRoleIdByName("Conductor");
  if (!conductorRolId) {
    console.warn('No existe el rol "Conductor" en la tabla Roles; no se asignó.');
    return null;
  }

  const updatedUser = await userModel.addRole(usuario_id, conductorRolId);
  return authService.createSession(updatedUser);
};

const vehicleService = {

  // crear un nuevo vehículo
  async create(
    usuario_id,
    { marca, modelo, anio, color, placa, asientos_disponibles },
  ) {
    const existing = await vehicleModel.findByPlaca(placa);
    if (existing) {
      const error = new Error("La placa ya está registrada");
      error.statusCode = 409;
      throw error;
    }

    const vehicle = await vehicleModel.create({
      usuario_id,
      marca,
      modelo,
      anio,
      color,
      placa,
      asientos_disponibles,
    });

    // Registrar un vehículo convierte al usuario en Conductor
    // (conserva sus otros roles, ej. Pasajero)
    let session = null;
    try {
      session = await asegurarRolConductor(usuario_id);
    } catch (err) {
      // El vehículo ya quedó guardado; no se revierte por esto
      console.warn("No se pudo asignar el rol Conductor:", err.message);
    }

    return { vehicle, session };
  },
  // obtener los vehículos del usuario autenticado
  async listMine(usuario_id) {
    return vehicleModel.findByUserId(usuario_id);
  },
  // obtener un vehículo por su ID
  async getById(id) {
    const vehicle = await vehicleModel.findById(id);
    if (!vehicle) {
      const error = new Error("Vehículo no encontrado");
      error.statusCode = 404;
      throw error;
    }
    return vehicle;
  },
  // actualizar un vehículo propio
  async update(id, usuario_id, data) {
    const vehicle = await vehicleModel.findById(id);
    if (!vehicle) {
      const error = new Error("Vehículo no encontrado");
      error.statusCode = 404;
      throw error;
    }
    if (vehicle.usuario_id !== usuario_id) {
      const error = new Error("No tienes permiso para modificar este vehículo");
      error.statusCode = 403;
      throw error;
    }

    if (data.placa && data.placa !== vehicle.placa) {
      const existing = await vehicleModel.findByPlaca(data.placa);
      if (existing) {
        const error = new Error("La placa ya está registrada");
        error.statusCode = 409;
        throw error;
      }
    }
    // Actualizar solo los campos proporcionados
    return vehicleModel.update(id, {
      marca: data.marca ?? vehicle.marca,
      modelo: data.modelo ?? vehicle.modelo,
      anio: data.anio ?? vehicle.anio,
      color: data.color ?? vehicle.color,
      placa: data.placa ?? vehicle.placa,
      asientos_disponibles:
        data.asientos_disponibles ?? vehicle.asientos_disponibles,
    });
  },

  // cambiar el estado activo/inactivo de un vehículo propio
  async changeStatus(id, usuario_id, activo) {
    const vehicle = await vehicleModel.findById(id);
    if (!vehicle) {
      const error = new Error("Vehículo no encontrado");
      error.statusCode = 404;
      throw error;
    }
    if (vehicle.usuario_id !== usuario_id) {
      const error = new Error("No tienes permiso para modificar este vehículo");
      error.statusCode = 403;
      throw error;
    }

    return vehicleModel.updateStatus(id, activo);
  },
  // eliminar un vehículo propio
  async remove(id, usuario_id) {
    const vehicle = await vehicleModel.findById(id);
    if (!vehicle) {
      const error = new Error("Vehículo no encontrado");
      error.statusCode = 404;
      throw error;
    }
    if (vehicle.usuario_id !== usuario_id) {
      const error = new Error("No tienes permiso para eliminar este vehículo");
      error.statusCode = 403;
      throw error;
    }

    await vehicleModel.remove(id);
  },
};

module.exports = vehicleService;
