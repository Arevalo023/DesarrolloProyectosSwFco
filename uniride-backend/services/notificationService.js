const notificationModel = require("../models/notificationModel");

const MAX_MENSAJE = 500; // Notificaciones.mensaje es VARCHAR(500)

// Estado nuevo de la solicitud -> notificación para el pasajero
const PLANTILLAS_ESTADO = {
  aceptada: {
    tipo: "reserva_aceptada",
    titulo: "Solicitud aceptada",
    mensaje: "El conductor aceptó tu solicitud de viaje.",
  },
  rechazada: {
    tipo: "reserva_rechazada",
    titulo: "Solicitud rechazada",
    mensaje: "El conductor rechazó tu solicitud de viaje.",
  },
};

const send = ({ usuarioId, reservation, tipo, titulo, mensaje }) => {
  if (!usuarioId) {
    const e = new Error("No se pudo determinar el destinatario de la notificación.");
    e.statusCode = 500;
    throw e;
  }
  return notificationModel.create({
    usuarioId,
    solicitudId: reservation.id ?? null,
    viajeId: reservation.viaje_id ?? null,
    tipo,
    titulo,
    mensaje: String(mensaje).slice(0, MAX_MENSAJE),
  });
};

const notificationService = {
  /**
   * Cambio de estado (aceptada / rechazada) -> avisa al pasajero.
   * @param {{id:number, viaje_id:number, pasajero_id:number, estado:string}} reservation
   *        resultado de reservationModel.respond
   * @returns {Promise<object|null>} null si el estado no genera notificación
   */
  async notifyReservationStatusChange(reservation) {
    const plantilla = PLANTILLAS_ESTADO[String(reservation?.estado || "").toLowerCase()];
    if (!plantilla) return null;
    return send({ usuarioId: reservation.pasajero_id, reservation, ...plantilla });
  },

  /**
   * Pasajero solicita un lugar -> avisa al conductor.
   * @param {{id:number, viaje_id:number}} reservation  resultado de tripModel.book
   * @param {{conductor_id:number, origen:string, destino:string}} trip  resultado de tripModel.findById
   */
  async notifyNewReservationRequest(reservation, trip) {
    return send({
      usuarioId: trip.conductor_id,
      reservation,
      tipo: "reserva_solicitada",
      titulo: "Nueva solicitud de viaje",
      mensaje: `Un pasajero solicitó un lugar en tu viaje de ${trip.origen} a ${trip.destino}.`,
    });
  },

  /**
   * Reservación cancelada -> avisa a la otra parte.
   * @param {{id:number, viaje_id:number, pasajero_id:number, cancelado_por:'pasajero'|'conductor'}} reservation
   *        resultado de reservationModel.cancel
   * @param {{conductor_id:number, origen:string, destino:string}} trip
   */
  async notifyReservationCancelled(reservation, trip) {
    const porPasajero = reservation.cancelado_por === "pasajero";
    return send({
      usuarioId: porPasajero ? trip.conductor_id : reservation.pasajero_id,
      reservation,
      tipo: "reserva_cancelada",
      titulo: "Reservación cancelada",
      mensaje: porPasajero
        ? `Un pasajero canceló su lugar en tu viaje de ${trip.origen} a ${trip.destino}.`
        : `El conductor canceló tu reservación del viaje de ${trip.origen} a ${trip.destino}.`,
    });
  },

  /** Notificaciones del usuario (más recientes primero). */
  getUserNotifications(usuarioId, options) {
    return notificationModel.findByUser(usuarioId, options);
  },
};

module.exports = notificationService;
