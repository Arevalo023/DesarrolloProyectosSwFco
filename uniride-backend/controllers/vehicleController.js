const vehicleService = require("../services/vehicleService");

const vehicleController = {

  // crear un nuevo vehículo
  async create(req, res) {
    try {
      const { marca, modelo, anio, color, placa, asientos_disponibles } =
        req.body;
      const vehicle = await vehicleService.create(req.user.id, req.user.rol, {
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

  // obtener los vehículos del usuario autenticado
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
  // obtener un vehículo por su ID
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
  // actualizar un vehículo propio
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
  // cambiar el estado activo/inactivo de un vehículo propio
  async changeStatus(req, res) {
    try {
      const { activo } = req.body;
      const vehicle = await vehicleService.changeStatus(
        req.params.id,
        req.user.id,
        activo,
      );
      return res
        .status(200)
        .json({
          message: "Estado del vehículo actualizado correctamente.",
          vehicle,
        });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({
          message:
            error.message || "Error al actualizar el estado del vehículo.",
        });
    }
  },
  // eliminar un vehículo propio
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
