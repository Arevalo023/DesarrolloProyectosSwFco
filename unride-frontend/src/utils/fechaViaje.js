
/**
 * Formatea la fecha calendario de un viaje sin convertirla
 * a la zona horaria del dispositivo.
 */
export function formatearFechaViaje(fecha) {
  if (typeof fecha !== "string") {
    return "Fecha no disponible";
  }

  const valor = fecha.trim();

  const coincidencia =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(valor);

  if (!coincidencia) {
    return "Fecha no disponible";
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  const fechaUTC = new Date(0);
  fechaUTC.setUTCFullYear(anio, mes - 1, dia);
  fechaUTC.setUTCHours(0, 0, 0, 0);

  if (
    fechaUTC.getUTCFullYear() !== anio ||
    fechaUTC.getUTCMonth() !== mes - 1 ||
    fechaUTC.getUTCDate() !== dia
  ) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(fechaUTC);
}

export function formatearFechaHora(fecha) {
  if (typeof fecha !== "string" || !fecha.trim()) {
    return "Fecha no disponible";
  }

  const valor = fecha.trim();
  const fechaParte = /^(\d{4}-\d{2}-\d{2})/.exec(valor)?.[1];
  if (!fechaParte || formatearFechaViaje(valor) === "Fecha no disponible") {
    return "Fecha no disponible";
  }

  const hora = /T(\d{2}:\d{2})/.exec(valor)?.[1];
  return hora
    ? `${formatearFechaViaje(valor)} ${hora}`
    : formatearFechaViaje(valor);
}
