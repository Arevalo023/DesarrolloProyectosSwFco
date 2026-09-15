const vehicleModel = require("../models/vehicleModel");

const vehicleService = {

  // crear un nuevo vehículo
  async create(
    usuario_id,
    rol,
    { marca, modelo, anio, color, placa, asientos_disponibles },
  ) {
    if (rol !== "Conductor") {
      const error = new Error(
        "Solo los usuarios con rol de conductor pueden registrar vehículos",
      );
      error.statusCode = 403;
      throw error;
    }

    const existing = await vehicleModel.findByPlaca(placa);
    if (existing) {
      const error = new Error("La placa ya está registrada");
      error.statusCode = 409;
      throw error;
    }

    return vehicleModel.create({
      usuario_id,
      marca,
      modelo,
      anio,
      color,
      placa,
      asientos_disponibles,
    });
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
