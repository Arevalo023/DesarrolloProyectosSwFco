import { useEffect, useState } from "react";
import { formatearFechaViaje } from "@/utils/fechaViaje";
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Check,
  Clock3,
  MapPin,
  UserRound,
  X,
  XCircle,
  AlertTriangle,
  Play,
  Flag,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import { apiRequest } from "@/services/api";

function MisViajes({
  onBackHome,
  onViajesCancelados,
  onViajesCompletados,
}) {
  const [viajes, setViajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");

  const [procesandoSolicitud, setProcesandoSolicitud] = useState(null);
  const [cancelandoViaje, setCancelandoViaje] = useState(false);
  const [procesandoViaje, setProcesandoViaje] = useState(null);

  // Normaliza los estados para comparar distintas representaciones.
  const normalizarEstado = (estado) =>
    String(estado || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

  const obtenerEstadoViaje = (viaje) =>
    normalizarEstado(viaje?.estado || viaje?.status);

  useEffect(() => {
    let cancelado = false;

    const cargarViajes = async () => {
      try {
        setError("");

        const [respuesta, respuestaSolicitudes] = await Promise.all([
          apiRequest("/api/trips/driver"),
          apiRequest("/api/trips/driver/requests"),
        ]);

        const datos = Array.isArray(respuesta)
          ? respuesta
          : respuesta?.trips || respuesta?.viajes || [];

        const solicitudes = Array.isArray(respuestaSolicitudes?.requests)
          ? respuestaSolicitudes.requests
          : [];

        const solicitudesPorViaje = new Map();

        solicitudes.forEach((solicitud) => {
          const idViaje = solicitud.viaje_id ?? solicitud.trip_id;
          const solicitudesDelViaje =
            solicitudesPorViaje.get(idViaje) || [];

          solicitudesDelViaje.push(solicitud);
          solicitudesPorViaje.set(idViaje, solicitudesDelViaje);
        });

        if (!cancelado) {
          setViajes(
            datos.map((viaje) => ({
              ...viaje,
              reservations:
                solicitudesPorViaje.get(obtenerIdViaje(viaje)) || [],
            }))
          );
        }
      } catch (err) {
        console.error("Error al cargar mis viajes:", err);

        if (!cancelado) {
          setError(
            err?.message ||
              "No fue posible cargar tus viajes publicados."
          );
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    };

    void cargarViajes();

    return () => {
      cancelado = true;
    };
  }, []);

  const mapEstado = (estado) => {
    switch (normalizarEstado(estado)) {
      case "programado":
        return {
          texto: "Programado",
          clase: "bg-blue-50 text-blue-700",
        };

      case "en curso":
        return {
          texto: "En curso",
          clase: "bg-yellow-50 text-yellow-700",
        };

      case "finalizado":
        return {
          texto: "Finalizado",
          clase: "bg-green-50 text-green-700",
        };

      case "cancelado":
      case "cancelada":
        return {
          texto: "Cancelado",
          clase: "bg-red-50 text-red-700",
        };

      default:
        return {
          texto: estado || "Programado",
          clase: "bg-slate-100 text-slate-600",
        };
    }
  };

  const obtenerIdViaje = (viaje) =>
    viaje?.id ?? viaje?.trip_id ?? viaje?.viaje_id;

  const obtenerSolicitudes = (viaje) =>
    viaje?.reservations ||
    viaje?.reservaciones ||
    viaje?.solicitudes ||
    viaje?.requests ||
    [];

  const esViajeCancelado = (viaje) => {
    const estado = obtenerEstadoViaje(viaje);
    return estado === "cancelado" || estado === "cancelada";
  };

  const esViajeFinalizado = (viaje) =>
    obtenerEstadoViaje(viaje) === "finalizado";

  const esViajeProgramado = (viaje) =>
    obtenerEstadoViaje(viaje) === "programado";

  const esViajeEnCurso = (viaje) =>
    obtenerEstadoViaje(viaje) === "en curso";

  const puedeCancelarViaje = (viaje) =>
    !esViajeCancelado(viaje) && !esViajeFinalizado(viaje);

  const abrirModalCancelacion = (viaje) => {
    setViajeSeleccionado(viaje);
    setMotivoCancelacion("");
  };

  const cerrarModalCancelacion = () => {
    setViajeSeleccionado(null);
    setMotivoCancelacion("");
  };

  // Iniciar y finalizar viaje mediante los endpoints reales del backend.
  const cambiarEstadoViaje = async (viaje, accion) => {
    const idViaje = obtenerIdViaje(viaje);

    if (!idViaje) {
      setError("No se pudo identificar el viaje seleccionado.");
      return;
    }

    const estadoActual = obtenerEstadoViaje(viaje);

    // Evita enviar acciones que no corresponden al estado actual.
    if (
      (accion === "start" && estadoActual !== "programado") ||
      (accion === "finish" && estadoActual !== "en curso")
    ) {
      setError(
        accion === "start"
          ? "Solo puedes iniciar un viaje programado."
          : "Solo puedes finalizar un viaje que esté en curso."
      );
      return;
    }

    setProcesandoViaje({
      id: idViaje,
      accion,
    });
    setError("");

    try {
      const respuesta = await apiRequest(
        `/api/trips/${idViaje}/${accion}`,
        {
          method: "PATCH",
        }
      );

      const estadoEsperado =
        accion === "start" ? "en curso" : "finalizado";

      const viajeActualizado = respuesta?.trip || {};

      setViajes((viajesActuales) =>
        viajesActuales.map((item) => {
          if (obtenerIdViaje(item) !== idViaje) {
            return item;
          }

          return {
            ...item,
            ...viajeActualizado,
            // Conserva el estado enviado por el servidor.
            // Usa el esperado únicamente si no viene en la respuesta.
            estado:
              viajeActualizado.estado ??
              viajeActualizado.status ??
              estadoEsperado,
          };
        })
      );
    } catch (err) {
      console.error(
        `Error al ${accion === "start" ? "iniciar" : "finalizar"} el viaje:`,
        err
      );

      setError(
        err?.message ||
          (accion === "start"
            ? "No se pudo iniciar el viaje. Inténtalo nuevamente."
            : "No se pudo finalizar el viaje. Inténtalo nuevamente.")
      );
    } finally {
      setProcesandoViaje(null);
    }
  };

  const cancelarViaje = async () => {
    if (!viajeSeleccionado) return;

    const idViaje = obtenerIdViaje(viajeSeleccionado);

    setCancelandoViaje(true);
    setError("");

    try {
      const respuesta = await apiRequest(
        `/api/trips/${idViaje}/cancel`,
        {
          method: "PATCH",
          body: {
            motivo_cancelacion: motivoCancelacion.trim() || null,
          },
        }
      );

      setViajes((viajesActuales) =>
        viajesActuales.map((viaje) =>
          obtenerIdViaje(viaje) === idViaje
            ? {
                ...viaje,
                ...respuesta?.trip,
                estado: "cancelado",
                motivo_cancelacion:
                  respuesta?.trip?.motivo_cancelacion ||
                  motivoCancelacion.trim() ||
                  null,
              }
            : viaje
        )
      );

      cerrarModalCancelacion();
    } catch (requestError) {
      console.error("Error al cancelar viaje:", requestError);

      setError(
        requestError?.message || "No se pudo cancelar el viaje."
      );
    } finally {
      setCancelandoViaje(false);
    }
  };

  const responderSolicitud = async (solicitud, nuevoEstado) => {
    if (!solicitud?.id) return;

    setProcesandoSolicitud(solicitud.id);
    setError("");

    try {
      await apiRequest(`/api/reservations/${solicitud.id}`, {
        method: "PATCH",
        body: {
          estado: nuevoEstado,
        },
      });

      setViajes((viajesActuales) =>
        viajesActuales.map((viaje) => {
          const solicitudes = obtenerSolicitudes(viaje);

          const tieneSolicitud = solicitudes.some(
            (item) => item.id === solicitud.id
          );

          if (!tieneSolicitud) return viaje;

          const solicitudesActualizadas = solicitudes.map((item) =>
            item.id === solicitud.id
              ? { ...item, estado: nuevoEstado }
              : item
          );

          return {
            ...viaje,
            reservations: solicitudesActualizadas,
            reservaciones: solicitudesActualizadas,
            solicitudes: solicitudesActualizadas,
          };
        })
      );
    } catch (err) {
      console.error("Error al actualizar solicitud:", err);

      setError(
        err?.message ||
          "No fue posible actualizar la solicitud."
      );
    } finally {
      setProcesandoSolicitud(null);
    }
  };

  const formatearFecha = formatearFechaViaje;

  const obtenerNombrePasajero = (solicitud) =>
    solicitud?.pasajero_nombre ||
    solicitud?.usuario_nombre ||
    solicitud?.nombre_pasajero ||
    solicitud?.nombre ||
    "Pasajero";

  const obtenerEstadoSolicitud = (estado) => {
    switch (normalizarEstado(estado)) {
      case "aceptada":
        return {
          texto: "Aceptada",
          clase: "bg-green-50 text-green-700",
        };

      case "rechazada":
        return {
          texto: "Rechazada",
          clase: "bg-red-50 text-red-700",
        };

      case "cancelada":
        return {
          texto: "Cancelada",
          clase: "bg-slate-100 text-slate-600",
        };

      default:
        return {
          texto: "Pendiente",
          clase: "bg-yellow-50 text-yellow-700",
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button
            type="button"
            onClick={onBackHome}
            className="flex items-center gap-2 text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Regresar</span>
          </button>

          <Logo />

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Car size={18} />
            <span className="hidden sm:inline">
              Mis viajes publicados
            </span>
          </div>
        </div>
      </nav>

      {/* CONTENIDO */}
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* ENCABEZADO */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">
            UniRide
          </p>

          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Mis Viajes Publicados
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Consulta tus viajes publicados y administra
            las solicitudes de los pasajeros.
          </p>
        </div>

        {/* NAVEGACIÓN AL HISTORIAL */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={onViajesCancelados}
            className="h-auto justify-between rounded-xl border-red-200 bg-white px-5 py-4 text-red-700 hover:bg-red-50"
          >
            <span className="flex items-center gap-3">
              <XCircle size={22} />
              Viajes cancelados
            </span>
            <span aria-hidden="true">→</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onViajesCompletados}
            className="h-auto justify-between rounded-xl border-green-200 bg-white px-5 py-4 text-green-700 hover:bg-green-50"
          >
            <span className="flex items-center gap-3">
              <Check size={22} />
              Viajes completados
            </span>
            <span aria-hidden="true">→</span>
          </Button>
        </div>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Ocurrió un problema
              </p>
              <p className="mt-1 text-sm">{error}</p>
            </div>

            <button
              type="button"
              aria-label="Cerrar mensaje de error"
              onClick={() => setError("")}
              className="ml-auto rounded p-1 hover:bg-red-100"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* CARGANDO / VACÍO / LISTA */}
        {cargando ? (
          <Card className="border-slate-200 bg-white">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
              <h2 className="font-semibold text-slate-800">
                Cargando tus viajes...
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Estamos consultando tus viajes publicados.
              </p>
            </CardContent>
          </Card>
        ) : viajes.length === 0 ? (
          <Card className="border-dashed bg-white">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4">
                <Car size={32} className="text-slate-400" />
              </div>

              <h2 className="text-lg font-semibold text-slate-800">
                No tienes viajes publicados
              </h2>

              <p className="mt-2 max-w-md text-sm text-slate-500">
                Cuando publiques un viaje, aparecerá aquí para
                que puedas administrarlo.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {viajes.map((viaje) => {
              const idViaje = obtenerIdViaje(viaje);
              const estado = mapEstado(
                viaje?.estado || viaje?.status
              );

              const cancelado = esViajeCancelado(viaje);
              const programado = esViajeProgramado(viaje);
              const enCurso = esViajeEnCurso(viaje);
              const finalizado = esViajeFinalizado(viaje);

              const solicitudes = obtenerSolicitudes(viaje);

              const origen =
                viaje?.origen ||
                viaje?.origin ||
                "Origen no disponible";

              const destino =
                viaje?.destino ||
                viaje?.destination ||
                "Destino no disponible";

              const fecha =
                viaje?.fecha_salida ||
                viaje?.fecha ||
                viaje?.departure_date;

              const hora =
                viaje?.hora_salida ||
                viaje?.hora ||
                viaje?.departure_time ||
                "";

              const cupoDisponible =
                viaje?.cupo_disponible ??
                viaje?.cupos_disponibles ??
                viaje?.available_seats ??
                viaje?.cupo ??
                0;

              const accionEnProceso =
                procesandoViaje?.id === idViaje
                  ? procesandoViaje.accion
                  : null;

              return (
                <Card
                  key={idViaje}
                  className={`overflow-hidden border-slate-200 bg-white shadow-sm ${
                    cancelado ? "opacity-90" : ""
                  }`}
                >
                  <CardContent className="p-0">
                    {/* ENCABEZADO */}
                    <div
                      className={`flex items-start justify-between gap-4 border-b px-5 py-5 ${
                        cancelado ? "bg-red-50/50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-xl p-3 ${
                            cancelado
                              ? "bg-red-100"
                              : enCurso
                                ? "bg-yellow-50"
                                : "bg-indigo-50"
                          }`}
                        >
                          {cancelado ? (
                            <XCircle
                              size={22}
                              className="text-red-600"
                            />
                          ) : (
                            <Car
                              size={22}
                              className={
                                enCurso
                                  ? "text-yellow-700"
                                  : "text-indigo-600"
                              }
                            />
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Viaje #{idViaje}
                          </p>

                          <h2 className="font-semibold text-slate-900">
                            {origen} → {destino}
                          </h2>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${estado.clase}`}
                      >
                        {estado.texto}
                      </span>
                    </div>

                    {/* INFORMACIÓN DEL VIAJE */}
                    <div className="px-5 py-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex gap-3">
                          <MapPin
                            size={20}
                            className="mt-0.5 shrink-0 text-emerald-600"
                          />
                          <div>
                            <p className="text-xs text-slate-400">
                              Origen
                            </p>
                            <p className="font-semibold">{origen}</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <MapPin
                            size={20}
                            className="mt-0.5 shrink-0 text-rose-500"
                          />
                          <div>
                            <p className="text-xs text-slate-400">
                              Destino
                            </p>
                            <p className="font-semibold">{destino}</p>
                          </div>
                        </div>
                      </div>

                      {/* FECHA / HORA / CUPO */}
                      <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                        <div className="flex items-center gap-3">
                          <CalendarDays
                            size={19}
                            className="text-indigo-500"
                          />
                          <div>
                            <p className="text-xs text-slate-400">
                              Fecha
                            </p>
                            <p className="text-sm font-medium capitalize">
                              {formatearFecha(fecha)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Clock3
                            size={19}
                            className="text-indigo-500"
                          />
                          <div>
                            <p className="text-xs text-slate-400">
                              Hora
                            </p>
                            <p className="text-sm font-medium">
                              {hora || "No disponible"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <UserRound
                            size={19}
                            className="text-indigo-500"
                          />
                          <div>
                            <p className="text-xs text-slate-400">
                              Cupos disponibles
                            </p>
                            <p className="text-sm font-medium">
                              {cupoDisponible}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* VIAJE CANCELADO */}
                      {cancelado && (
                        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                          <div className="flex gap-3">
                            <XCircle
                              size={20}
                              className="mt-0.5 shrink-0 text-red-600"
                            />
                            <div>
                              <p className="font-semibold text-red-800">
                                Viaje cancelado
                              </p>

                              {viaje?.motivo_cancelacion ? (
                                <p className="mt-1 text-sm text-red-700">
                                  Motivo: {viaje.motivo_cancelacion}
                                </p>
                              ) : (
                                <p className="mt-1 text-sm text-red-700">
                                  Este viaje ya no está disponible
                                  para nuevas solicitudes.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SOLICITUDES */}
                      {!cancelado && !finalizado && (
                        <div className="mt-6 border-t pt-5">
                          <div className="mb-4 flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                Solicitudes recibidas
                              </h3>
                              <p className="text-sm text-slate-500">
                                {solicitudes.length} solicitud
                                {solicitudes.length !== 1 ? "es" : ""}
                              </p>
                            </div>
                          </div>

                          {solicitudes.length === 0 ? (
                            <div className="rounded-xl bg-slate-50 p-5 text-center">
                              <UserRound
                                size={25}
                                className="mx-auto mb-2 text-slate-400"
                              />
                              <p className="text-sm font-medium text-slate-600">
                                No hay solicitudes todavía
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {solicitudes.map((solicitud) => {
                                const estadoSolicitud =
                                  obtenerEstadoSolicitud(
                                    solicitud?.estado
                                  );

                                const solicitudResuelta = [
                                  "aceptada",
                                  "rechazada",
                                  "cancelada",
                                ].includes(
                                  normalizarEstado(solicitud?.estado)
                                );

                                return (
                                  <div
                                    key={solicitud.id}
                                    className="rounded-xl border border-slate-200 p-4"
                                  >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="rounded-full bg-slate-100 p-2">
                                          <UserRound
                                            size={19}
                                            className="text-slate-600"
                                          />
                                        </div>

                                        <div>
                                          <p className="font-semibold text-slate-800">
                                            {obtenerNombrePasajero(
                                              solicitud
                                            )}
                                          </p>

                                          <span
                                            className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${estadoSolicitud.clase}`}
                                          >
                                            {estadoSolicitud.texto}
                                          </span>
                                        </div>
                                      </div>

                                      {!solicitudResuelta && (
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            disabled={
                                              procesandoSolicitud ===
                                              solicitud.id
                                            }
                                            onClick={() =>
                                              responderSolicitud(
                                                solicitud,
                                                "rechazada"
                                              )
                                            }
                                            variant="outline"
                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                          >
                                            <X size={16} />
                                            Rechazar
                                          </Button>

                                          <Button
                                            type="button"
                                            size="sm"
                                            disabled={
                                              procesandoSolicitud ===
                                              solicitud.id
                                            }
                                            onClick={() =>
                                              responderSolicitud(
                                                solicitud,
                                                "aceptada"
                                              )
                                            }
                                            className="bg-green-600 text-white hover:bg-green-700"
                                          >
                                            <Check size={16} />
                                            Aceptar
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ACCIONES DEL VIAJE */}
                      <div className="mt-6 flex flex-col gap-3 border-t pt-5">
                        {/* INICIAR: solo cuando está programado */}
                        {programado && (
                          <Button
                            type="button"
                            disabled={Boolean(procesandoViaje)}
                            onClick={() =>
                              cambiarEstadoViaje(viaje, "start")
                            }
                            className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            <Play size={17} />
                            {accionEnProceso === "start"
                              ? "Iniciando viaje..."
                              : "Iniciar viaje"}
                          </Button>
                        )}

                        {/* FINALIZAR: solo cuando está en curso */}
                        {enCurso && (
                          <Button
                            type="button"
                            disabled={Boolean(procesandoViaje)}
                            onClick={() =>
                              cambiarEstadoViaje(viaje, "finish")
                            }
                            className="w-full bg-green-600 text-white hover:bg-green-700"
                          >
                            <Flag size={17} />
                            {accionEnProceso === "finish"
                              ? "Finalizando viaje..."
                              : "Finalizar viaje"}
                          </Button>
                        )}

                        {/* CANCELAR: se conserva la funcionalidad existente */}
                        {puedeCancelarViaje(viaje) && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={Boolean(procesandoViaje) || cancelandoViaje}
                            onClick={() =>
                              abrirModalCancelacion(viaje)
                            }
                            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <XCircle size={17} />
                            Cancelar viaje
                          </Button>
                        )}

                        {cancelado && (
                          <div className="rounded-xl bg-slate-50 p-3 text-center text-sm font-medium text-slate-500">
                            Este viaje está cancelado y ya no tiene
                            acciones disponibles.
                          </div>
                        )}

                        {finalizado && (
                          <div className="rounded-xl bg-green-50 p-3 text-center text-sm font-medium text-green-700">
                            <Check
                              size={17}
                              className="mr-1 inline"
                            />
                            Este viaje ya finalizó.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      {/* MODAL CANCELAR VIAJE */}
      {viajeSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {/* ENCABEZADO */}
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex rounded-full bg-red-50 p-3">
                  <AlertTriangle
                    size={24}
                    className="text-red-600"
                  />
                </div>

                <h2 className="text-xl font-bold text-slate-900">
                  Cancelar viaje
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  ¿Estás segura de que deseas cancelar este viaje?
                  Esta acción cambiará su estado a Cancelado.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModalCancelacion}
                disabled={cancelandoViaje}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* RESUMEN DEL VIAJE */}
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-800">
                {viajeSeleccionado?.origen ||
                  viajeSeleccionado?.origin ||
                  "Origen"}{" "}
                →{" "}
                {viajeSeleccionado?.destino ||
                  viajeSeleccionado?.destination ||
                  "Destino"}
              </p>

              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={15} />
                  {formatearFecha(
                    viajeSeleccionado?.fecha_salida ||
                      viajeSeleccionado?.fecha ||
                      viajeSeleccionado?.departure_date
                  )}
                </span>

                <span className="flex items-center gap-1.5">
                  <Clock3 size={15} />
                  {viajeSeleccionado?.hora_salida ||
                    viajeSeleccionado?.hora ||
                    viajeSeleccionado?.departure_time ||
                    "Hora no disponible"}
                </span>
              </div>
            </div>

            {/* MOTIVO */}
            <div className="mt-5">
              <label
                htmlFor="motivo-cancelacion"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Motivo de cancelación
                <span className="ml-1 font-normal text-slate-400">
                  (opcional)
                </span>
              </label>

              <textarea
                id="motivo-cancelacion"
                value={motivoCancelacion}
                onChange={(event) =>
                  setMotivoCancelacion(event.target.value)
                }
                placeholder="Escribe el motivo de la cancelación..."
                rows={4}
                maxLength={250}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {motivoCancelacion.length}/250
              </p>
            </div>

            {/* BOTONES */}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={cerrarModalCancelacion}
                disabled={cancelandoViaje}
              >
                Mantener viaje
              </Button>

              <Button
                type="button"
                onClick={cancelarViaje}
                disabled={cancelandoViaje}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <XCircle size={17} />
                {cancelandoViaje
                  ? "Cancelando..."
                  : "Sí, cancelar viaje"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MisViajes;