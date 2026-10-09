const tripService = require("../services/tripService");
const reservationService = require("../services/reservationService");

const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const tripController = {
  async create(req, res) {
    try {
      const {
        vehiculo_id,
        vehicle_id,
        origen,
        destino,
        fecha_salida,
        fecha,
        hora,
        cupo_disponible,
        asientos,
        costo_por_pasajero,
        tarifa,
      } = req.body;

      const trip = await tripService.create({
        conductorId: req.user.id,
        vehiculoId: Number(vehiculo_id ?? vehicle_id),
        origen,
        destino,
        fechaSalida: fecha_salida || (fecha && hora ? `${fecha}T${hora}` : fecha),
        cupoDisponible: Number(cupo_disponible ?? asientos),
        costoPorPasajero: Number(costo_por_pasajero ?? tarifa),
      });

      return res.status(201).json({
        message: "Viaje publicado correctamente.",
        trip,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudo publicar el viaje.",
      });
    }
  },

  async listByDriver(req, res) {
    try {
      const trips = await tripService.listByDriver(req.user.id);
      return res.status(200).json({ trips });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudieron obtener tus viajes.",
      });
    }
  },

  async cancel(req, res) {
    try {
      const tripId = parseInt(req.params.id, 10);
      if (isNaN(tripId) || tripId <= 0) {
        return res.status(400).json({
          message: "El ID del viaje debe ser un número entero positivo.",
        });
      }

      const motivoCancelacion = req.body?.motivo_cancelacion;
      if (
        motivoCancelacion !== undefined &&
        (typeof motivoCancelacion !== "string" || motivoCancelacion.length > 250)
      ) {
        return res.status(400).json({
          message: "El motivo de cancelación debe tener como máximo 250 caracteres.",
        });
      }

      const trip = await tripService.cancel(
        tripId,
        req.user.id,
        motivoCancelacion?.trim() || null
      );

      if (!trip) {
        return res.status(404).json({
          message: "El viaje no existe o no puede cancelarse.",
        });
      }

      return res.status(200).json({
        message: "Viaje cancelado correctamente.",
        trip,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudo cancelar el viaje.",
      });
    }
  },

  async listReceivedRequests(req, res) {
    try {
      const requests = await reservationService.listReceivedByDriver(req.user.id);
      return res.status(200).json({ requests });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudieron obtener las solicitudes recibidas.",
      });
    }
  },

  async listAvailable(req, res) {
    try {
      const {
        origen,
        destino,
        fecha,
        fecha_inicio,
        fecha_fin,
        hora_desde,
        hora_hasta,
        cupo_minimo,
      } = req.query;
      const filtros = [
        origen,
        destino,
        fecha,
        fecha_inicio,
        fecha_fin,
        hora_desde,
        hora_hasta,
        cupo_minimo,
      ];

      if (filtros.some((value) => value !== undefined && typeof value !== "string")) {
        return res.status(400).json({
          message: "Los filtros deben enviarse como valores únicos de texto.",
        });
      }

      const fechaExacta = fecha?.trim() || null;
      const fechaInicio = fecha_inicio?.trim() || null;
      const fechaFin = fecha_fin?.trim() || null;
      const horaDesde = hora_desde?.trim() || null;
      const horaHasta = hora_hasta?.trim() || null;
      const cupoMinimo = cupo_minimo?.trim() || null;

      if ([fechaExacta, fechaInicio, fechaFin].some((value) => value && !isValidDate(value))) {
        return res.status(400).json({
          message: "El formato de fecha debe ser YYYY-MM-DD.",
        });
      }

      if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        return res.status(400).json({
          message: "La fecha de inicio no puede ser posterior a la fecha de fin.",
        });
      }

      const formatoHora = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
      if ([horaDesde, horaHasta].some((value) => value && !formatoHora.test(value))) {
        return res.status(400).json({
          message: "El formato de hora debe ser HH:MM.",
        });
      }

      if (horaDesde && horaHasta && horaDesde > horaHasta) {
        return res.status(400).json({
          message: "La hora de inicio no puede ser posterior a la hora de fin.",
        });
      }

      if (
        cupoMinimo &&
        (!/^\d+$/.test(cupoMinimo) || !Number.isSafeInteger(Number(cupoMinimo)) || Number(cupoMinimo) > 2147483647)
      ) {
        return res.status(400).json({
          message: "El cupo mínimo debe ser un número entero mayor o igual a cero.",
        });
      }

      const trips = await tripService.listAvailable({
        origen: origen?.trim() || null,
        destino: destino?.trim() || null,
        fecha: fechaExacta,
        fechaInicio,
        fechaFin,
        horaDesde,
        horaHasta,
        cupoMinimo: cupoMinimo === null ? null : Number(cupoMinimo),
      });

      return res.status(200).json({ trips });
    } catch (error) {
      return res.status(500).json({ message: "No se pudieron obtener los viajes." });
    }
  },

  async book(req, res) {
    try {
      const tripId = parseInt(req.params.id, 10);
      if (isNaN(tripId) || tripId <= 0) {
        return res.status(400).json({
          message: "El ID del viaje debe ser un número entero positivo.",
        });
      }

      const booking = await tripService.book(tripId, req.user.id);
      return res.status(201).json({
        message: "Reserva realizada correctamente.",
        booking,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudo realizar la reserva.",
      });
    }
  },

  async listReservations(req, res) {
    try {
      const reservations = await reservationService.listByPassenger(req.user.id, {
        order: req.query.order,
      });
      return res.status(200).json({ reservations });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "No se pudieron obtener las reservaciones.",
      });
    }
  },
};

module.exports = tripController;