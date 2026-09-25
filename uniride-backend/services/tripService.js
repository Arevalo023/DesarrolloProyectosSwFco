const tripModel = require("../models/tripModel");
const vehicleModel = require("../models/vehicleModel");

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const isVehicleActive = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "activo", "enabled", "yes"].includes(normalized)) return true;
    if (["0", "false", "inactivo", "disabled", "no"].includes(normalized)) return false;
    return true;
  }
  return Boolean(value);
};

const addVehicleData = (trip) => ({
  ...trip,
  vehiculo: {
    id: trip.vehiculo_id,
    marca: trip.vehiculo_marca || trip.marca,
    modelo: trip.vehiculo_modelo || trip.modelo,
    anio: trip.vehiculo_anio,
    color: trip.vehiculo_color || trip.color,
    placa: trip.vehiculo_placa || trip.placa,
    asientos_disponibles:
      trip.vehiculo_asientos_disponibles || trip.asientos_disponibles,
    activo: trip.vehiculo_activo,
  },
});

const tripService = {
  isVehicleActive,
  async create({ conductorId, vehiculoId, origen, destino, fechaSalida, cupoDisponible, costoPorPasajero }) {
    if (!Number.isInteger(vehiculoId) || vehiculoId <= 0) {
      throw validationError("El vehículo asignado debe ser válido.");
    }
    if (!origen || origen.trim().length < 2) {
      throw validationError("El origen es obligatorio y debe tener al menos 2 caracteres.");
    }
    if (!destino || destino.trim().length < 2) {
      throw validationError("El destino es obligatorio y debe tener al menos 2 caracteres.");
    }
    if (origen.trim().toLowerCase() === destino.trim().toLowerCase()) {
      throw validationError("El origen y el destino deben ser diferentes.");
    }

    const departure = new Date(fechaSalida);
    if (!fechaSalida || Number.isNaN(departure.getTime()) || departure <= new Date()) {
      throw validationError("La fecha y hora de salida deben ser válidas y futuras.");
    }

    if (!Number.isInteger(cupoDisponible) || cupoDisponible <= 0) {
      throw validationError("Los asientos disponibles deben ser un entero mayor que cero.");
    }
    if (!Number.isFinite(costoPorPasajero) || costoPorPasajero < 0) {
      throw validationError("La tarifa debe ser un número mayor o igual a cero.");
    }

    const vehicle = await vehicleModel.findById(vehiculoId);
    if (!vehicle) {
      const error = new Error("El vehículo no existe.");
      error.statusCode = 404;
      throw error;
    }
    if (vehicle.usuario_id !== conductorId) {
      const error = new Error("El vehículo no pertenece al conductor autenticado.");
      error.statusCode = 403;
      throw error;
    }
    if (!isVehicleActive(vehicle.activo)) {
      throw validationError("El vehículo seleccionado no está activo.");
    }
    if (cupoDisponible > vehicle.asientos_disponibles) {
      throw validationError("Los asientos disponibles no pueden superar la capacidad del vehículo.");
    }

    return addVehicleData(await tripModel.create({
      conductor_id: conductorId,
      vehiculo_id: vehiculoId,
      origen: origen.trim(),
      destino: destino.trim(),
      fecha_salida: departure,
      cupo_disponible: cupoDisponible,
      costo_por_pasajero: costoPorPasajero,
    }));
  },

  async listByDriver(conductorId) {
    const trips = await tripModel.findByDriver(conductorId);
    return trips.map(addVehicleData);
  },

  listAvailable(filters) {
    return tripModel.findAvailable(filters);
  },

  book(tripId, passengerId) {
    return tripModel.book(tripId, passengerId);
  },
};

module.exports = tripService;