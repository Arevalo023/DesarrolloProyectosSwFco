/**
 * Servicio de auditoría y registro de acciones administrativas sensibles.
 * Issue #140 / Issue #149: Registra en el log del servidor sin modificar el esquema de base de datos.
 */

const auditService = {
  /**
   * Registra una acción administrativa en el log del servidor.
   * @param {object} params
   * @param {number} params.adminId - ID del administrador que realiza la acción
   * @param {string} params.entidad - Entidad afectada (ej. 'Viajes', 'Usuarios')
   * @param {number|string} params.entidadId - ID de la entidad afectada
   * @param {string} params.accion - Nombre de la acción (ej. 'CANCELAR_VIAJE')
   * @param {string} [params.motivo] - Motivo de la acción
   * @param {Date|string} [params.fecha] - Fecha del registro
   * @returns {object} Registro creado
   */
  logAction({ adminId, entidad, entidadId, accion, motivo, fecha = new Date() }) {
    const timestamp = fecha instanceof Date ? fecha.toISOString() : new Date(fecha).toISOString();
    const entry = {
      tipo: "ACCION_ADMINISTRATIVA",
      fecha: timestamp,
      administrador_id: Number(adminId),
      entidad: String(entidad),
      entidad_id: Number(entidadId),
      accion: String(accion),
      motivo: String(motivo || "").trim(),
    };

    console.log(`[AUDIT] ${JSON.stringify(entry)}`);
    return entry;
  },
};

module.exports = auditService;
