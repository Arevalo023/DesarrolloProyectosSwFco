const tripModel = require("../models/tripModel");
const vehicleModel = require("../models/vehicleModel");
const notificationService = require("./notificationService");
const auditService = require("./auditService");

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

  classifyTripsByStatus(trips = []) {
    const safeTrips = Array.isArray(trips) ? trips : [];
    const activos = [];
    const cancelados = [];
    const completados = [];

    for (const trip of safeTrips) {
      const estado = String(trip?.estado || "").trim().toLowerCase();
      if (["programado", "en_curso", "activo", "en curso"].includes(estado)) {
        activos.push(trip);
      } else if (["cancelado", "cancelada"].includes(estado)) {
        cancelados.push(trip);
      } else if (["finalizado", "completado"].includes(estado)) {
        completados.push(trip);
      } else {
        activos.push(trip);
      }
    }

    return {
      activos,
      cancelados,
      completados,
    };
  },

  async listByDriver(conductorId, options = {}) {
    const trips = await tripModel.findByDriver(conductorId, options);
    const enriched = trips.map(addVehicleData);

    if (options.classified) {
      return this.classifyTripsByStatus(enriched);
    }

    return enriched;
  },

  async cancel(tripId, conductorId, motivoCancelacion) {
    const result = await tripModel.cancel(tripId, conductorId, motivoCancelacion);
    if (!result) return null;

    for (const reservation of result.cancelledReservations) {
      try {
        await notificationService.notifyTripCancelled(reservation, result.trip);
      } catch (err) {
        console.error("[notifications] No se pudo notificar la cancelación del viaje:", err);
      }
    }

    return result.trip;
  },

  async start(tripId, conductorId) {
    const result = await tripModel.start(tripId, conductorId);

    if (typeof notificationService.notifyTripStarted === "function") {
      try {
        await notificationService.notifyTripStarted(result.trip);
      } catch (err) {
        console.error("[notifications] No se pudo notificar el inicio del viaje:", err);
      }
    }

    return result;
  },

  async finish(tripId, conductorId) {
    const result = await tripModel.finish(tripId, conductorId);

    if (typeof notificationService.notifyTripFinished === "function") {
      try {
        await notificationService.notifyTripFinished(result.trip);
      } catch (err) {
        console.error("[notifications] No se pudo notificar la finalización del viaje:", err);
      }
    }

    return result;
  },

  listAvailable(filters) {
    return tripModel.findAvailable(filters);
  },

  async book(tripId, passengerId) {
    const reservation = await tripModel.book(tripId, passengerId);

    // La solicitud ya está guardada en BD; un fallo al notificar no debe romperla
    try {
      const trip = await tripModel.findById(reservation.viaje_id);
      if (trip) {
        await notificationService.notifyNewReservationRequest(reservation, trip);
      }
    } catch (err) {
      console.error("[notifications] No se pudo notificar la nueva solicitud:", err);
    }

    return reservation;
  },

  /**
   * Lista todos los viajes registrados para administración con filtros y paginación.
   * @param {object} params
   * @param {string} [params.estado]
   * @param {string} [params.fecha]
   * @param {string} [params.conductor]
   * @param {number|string} [params.page]
   * @param {number|string} [params.limit]
   * @returns {Promise<{ viajes: object[], trips: object[], paginacion: object }>}
   */
  async listTripsAdmin({ estado, fecha, conductor, page, limit } = {}) {
    const pagina = Number(page) || 1;
    const limite = Math.min(Number(limit) || 20, 50);

    const { trips, total } = await tripModel.findAllAdmin({
      estado: (estado || '').trim(),
      fecha: (fecha || '').trim(),
      conductor: (conductor || '').trim(),
      limit: limite,
      offset: (pagina - 1) * limite,
    });

    return {
      viajes: trips,
      trips,
      paginacion: {
        pagina,
        limite,
        total,
        total_paginas: Math.ceil(total / limite),
      },
    };
  },

  /**
   * Obtiene el detalle de un viaje con sus reservaciones para administración.
   * @param {number} tripId
   * @returns {Promise<object>}
   */
  async getTripDetailAdmin(tripId) {
    const trip = await tripModel.findDetailWithReservations(tripId);
    if (!trip) {
      const error = new Error('El viaje no existe.');
      error.statusCode = 404;
      throw error;
    }
    return trip;
  },

  /**
   * Cancela un viaje programado por solicitud de un administrador.
   * Reglas:
   * 1. Solo permite cancelar viajes programados (manejado por el modelo).
   * 2. Notifica exclusivamente a los pasajeros con reservación aceptada.
   * 3. Registra la acción sensible en el log del servidor mediante auditService.
   * @param {number} tripId - ID del viaje
   * @param {number} adminId - ID del administrador
   * @param {string} motivo - Motivo obligatorio
   * @returns {Promise<object>} El viaje cancelado
   */
  async cancelAdmin(tripId, adminId, motivo) {
    const result = await tripModel.cancelAdmin(tripId, motivo.trim());

    // Notificar solo a los pasajeros con reservación aceptada
    if (Array.isArray(result?.acceptedReservations)) {
      for (const reservation of result.acceptedReservations) {
        try {
          await notificationService.notifyTripCancelledByAdmin(
            reservation,
            result.trip,
            motivo.trim()
          );
        } catch (err) {
          console.error(
            "[notifications] Error al notificar cancelación admin a pasajero",
            reservation.pasajero_id,
            err
          );
        }
      }
    }

    // Registrar en el log del servidor la acción sensible
    auditService.logAction({
      adminId,
      entidad: "Viajes",
      entidadId: tripId,
      accion: "CANCELAR_VIAJE",
      motivo: motivo.trim(),
    });

    return result.trip;
  },
};

module.exports = tripService;