const vehicleService = require("../services/vehicleService");

const vehicleController = {

  // Crear un vehiculo
  async create(req, res) {
    try {
      const { marca, modelo, anio, color, placa, asientos_disponibles } =
        req.body;
      const vehicle = await vehicleService.create(req.user.id, {
        marca,
        modelo,
        anio,
        color,
        placa,
        asientos_disponibles,
      });
      return res
        .status(201)
        .json({ message: "Vehículo registrado exitosamente.", vehicle });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Error al registrar el vehículo." });
    }
  },
  // Listar los vehiculos del usuario
  async listMine(req, res) {
    try {
      const vehicles = await vehicleService.listMine(req.user.id);
      return res.status(200).json({ vehicles });
    } catch (error) {
      return res
        .status(500)
        .json({ message: error.message || "Error al obtener los vehículos." });
    }
  },
  // Obtener un vehiculo por su id
  async getById(req, res) {
    try {
      const vehicle = await vehicleService.getById(req.params.id);
      return res.status(200).json({ vehicle });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Error al obtener el vehículo." });
    }
  },
  // Actualizar un vehiculo
  async update(req, res) {
    try {
      const vehicle = await vehicleService.update(
        req.params.id,
        req.user.id,
        req.body,
      );
      return res
        .status(200)
        .json({ message: "Vehículo actualizado correctamente.", vehicle });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Error al actualizar el vehículo." });
    }
  },
  // Eliminar un vehiculo
  async remove(req, res) {
    try {
      await vehicleService.remove(req.params.id, req.user.id);
      return res
        .status(200)
        .json({ message: "Vehículo eliminado correctamente." });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Error al eliminar el vehículo." });
    }
  },
};

module.exports = vehicleController;
