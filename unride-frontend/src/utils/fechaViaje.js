
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

export function formatearHoraViaje(fecha, horaSeparada) {
  const valorHora = typeof horaSeparada === "string" ? horaSeparada.trim() : "";
  const valorFecha = typeof fecha === "string" ? fecha.trim() : "";
  const coincidencia =
    /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(valorHora) ||
    /(?:T|\s)(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/.exec(valorFecha);

  if (!coincidencia) {
    return "Hora no disponible";
  }

  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);
  if (horas > 23 || minutos > 59) {
    return "Hora no disponible";
  }

  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
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

  const hora = formatearHoraViaje(valor);
  return hora !== "Hora no disponible"
    ? `${formatearFechaViaje(valor)} ${hora}`
    : formatearFechaViaje(valor);
}
