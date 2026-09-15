const vehicleModel = require("../models/vehicleModel");

const vehicleService = {

    //Crear un vehiculo
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

    return vehicleModel.create({
      usuario_id,
      marca,
      modelo,
      anio,
      color,
      placa,
      asientos_disponibles,
    });
  },//fin de create


  //Listar los vehiculos del usuario
  async listMine(usuario_id) {
    return vehicleModel.findByUserId(usuario_id);
  },//fin de listMine


  //Obtener un vehiculo por su id
  async getById(id) {
    const vehicle = await vehicleModel.findById(id);
    if (!vehicle) {
      const error = new Error("Vehículo no encontrado");
      error.statusCode = 404;
      throw error;
    }
    return vehicle;
  },//fin de getById

  //Actualizar un vehiculo
  async update(id, usuario_id, data) {
    const vehicle = await vehicleModel.findById(id);

    // Validaciones de existencia y permisos
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

    return vehicleModel.update(id, {
      marca: data.marca ?? vehicle.marca,
      modelo: data.modelo ?? vehicle.modelo,
      anio: data.anio ?? vehicle.anio,
      color: data.color ?? vehicle.color,
      placa: data.placa ?? vehicle.placa,
      asientos_disponibles:
        data.asientos_disponibles ?? vehicle.asientos_disponibles,
    });
  },//fin de update

  //Eliminar un vehiculo
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
  },//fin de remove
};

module.exports = vehicleService;
