import { useEffect, useState } from "react";
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
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import { apiRequest } from "@/services/api";

function MisViajes({ onBackHome }) {
  const [viajes, setViajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");

  const [procesandoSolicitud, setProcesandoSolicitud] = useState(null);
  const [cancelandoViaje, setCancelandoViaje] = useState(false);

  useEffect(() => {
    cargarViajes();
  }, []);

  const cargarViajes = async () => {
    setCargando(true);
    setError("");

    try {
      const respuesta = await apiRequest("/api/trips/driver");

      const datos = Array.isArray(respuesta)
        ? respuesta
        : respuesta?.trips || respuesta?.viajes || [];

      setViajes(datos);
    } catch (err) {
      console.error("Error al cargar mis viajes:", err);

      setError(
        err?.message ||
          "No fue posible cargar tus viajes publicados."
      );
    } finally {
      setCargando(false);
    }
  };

  const mapEstado = (estado) => {
    switch (String(estado || "").toLowerCase()) {
      case "programado":
        return {
          texto: "Programado",
          clase: "bg-blue-50 text-blue-700",
        };

      case "en curso":
      case "encurso":
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

  const obtenerIdViaje = (viaje) => {
    return viaje?.id ?? viaje?.trip_id ?? viaje?.viaje_id;
  };

  const obtenerSolicitudes = (viaje) => {
    return (
      viaje?.reservations ||
      viaje?.reservaciones ||
      viaje?.solicitudes ||
      viaje?.requests ||
      []
    );
  };

  const esViajeCancelado = (viaje) => {
    const estado = String(
      viaje?.estado || viaje?.status || ""
    ).toLowerCase();

    return estado === "cancelado" || estado === "cancelada";
  };

  const esViajeFinalizado = (viaje) => {
    const estado = String(
      viaje?.estado || viaje?.status || ""
    ).toLowerCase();

    return estado === "finalizado";
  };

  const puedeCancelarViaje = (viaje) => {
    return (
      !esViajeCancelado(viaje) &&
      !esViajeFinalizado(viaje)
    );
  };

  const abrirModalCancelacion = (viaje) => {
    setViajeSeleccionado(viaje);
    setMotivoCancelacion("");
  };

  const cerrarModalCancelacion = () => {
    setViajeSeleccionado(null);
    setMotivoCancelacion("");
  };

  const cancelarViaje = async () => {
    if (!viajeSeleccionado) return;

    const idViaje = obtenerIdViaje(viajeSeleccionado);

    setCancelandoViaje(true);
    setError("");

    try {
      const respuesta = await apiRequest(`/api/trips/${idViaje}/cancel`, {
        method: "PATCH",
        body: {
          motivo_cancelacion: motivoCancelacion.trim() || null,
        },
      });

      setViajes((viajesActuales) =>
        viajesActuales.map((viaje) =>
          obtenerIdViaje(viaje) === idViaje
            ? {
                ...viaje,
                ...respuesta.trip,
                estado: "cancelado",
                motivo_cancelacion: respuesta.trip?.motivo_cancelacion || null,
              }
            : viaje
        )
      );
      cerrarModalCancelacion();
    } catch (requestError) {
      setError(requestError.message || "No se pudo cancelar el viaje.");
    } finally {
      setCancelandoViaje(false);
    }
  };

  const responderSolicitud = async (
    solicitud,
    nuevoEstado
  ) => {
    if (!solicitud?.id) return;

    setProcesandoSolicitud(solicitud.id);

    try {
      await apiRequest(
        `/api/reservations/${solicitud.id}`,
        {
          method: "PATCH",
          body: {
            estado: nuevoEstado,
          },
        }
      );

      setViajes((viajesActuales) =>
        viajesActuales.map((viaje) => {
          const solicitudes = obtenerSolicitudes(viaje);

          const tieneSolicitud = solicitudes.some(
            (item) => item.id === solicitud.id
          );

          if (!tieneSolicitud) {
            return viaje;
          }

          const solicitudesActualizadas = solicitudes.map(
            (item) =>
              item.id === solicitud.id
                ? {
                    ...item,
                    estado: nuevoEstado,
                  }
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
      console.error(
        "Error al actualizar solicitud:",
        err
      );

      setError(
        err?.message ||
          "No fue posible actualizar la solicitud."
      );
    } finally {
      setProcesandoSolicitud(null);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "Fecha no disponible";

    const partes = String(fecha).split("-");

    if (partes.length !== 3) {
      return fecha;
    }

    const [year, month, day] = partes;

    const fechaLocal = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return fechaLocal.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const obtenerNombrePasajero = (solicitud) => {
    return (
      solicitud?.pasajero_nombre ||
      solicitud?.usuario_nombre ||
      solicitud?.nombre_pasajero ||
      solicitud?.nombre ||
      "Pasajero"
    );
  };

  const obtenerEstadoSolicitud = (estado) => {
    switch (
      String(estado || "").toLowerCase()
    ) {
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

            <span className="hidden sm:inline">
              Regresar
            </span>
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

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Ocurrió un problema
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* CARGANDO */}
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

          /* ESTADO VACÍO */
          <Card className="border-dashed bg-white">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">

              <div className="mb-4 rounded-full bg-slate-100 p-4">
                <Car
                  size={32}
                  className="text-slate-400"
                />
              </div>

              <h2 className="text-lg font-semibold text-slate-800">
                No tienes viajes publicados
              </h2>

              <p className="mt-2 max-w-md text-sm text-slate-500">
                Cuando publiques un viaje, aparecerá
                aquí para que puedas administrarlo.
              </p>

            </CardContent>
          </Card>

        ) : (

          /* LISTA DE VIAJES */
          <div className="grid gap-6 lg:grid-cols-2">

            {viajes.map((viaje) => {
              const idViaje = obtenerIdViaje(viaje);
              const estado = mapEstado(
                viaje?.estado || viaje?.status
              );

              const cancelado =
                esViajeCancelado(viaje);

              const solicitudes =
                obtenerSolicitudes(viaje);

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

              return (
                <Card
                  key={idViaje}
                  className={`overflow-hidden border-slate-200 bg-white shadow-sm ${
                    cancelado ? "opacity-90" : ""
                  }`}
                >
                  <CardContent className="p-0">

                    {/* ENCABEZADO DE VIAJE */}
                    <div
                      className={`flex items-start justify-between gap-4 border-b px-5 py-5 ${
                        cancelado
                          ? "bg-red-50/50"
                          : "bg-white"
                      }`}
                    >

                      <div className="flex items-center gap-3">

                        <div
                          className={`rounded-xl p-3 ${
                            cancelado
                              ? "bg-red-100"
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
                              className="text-indigo-600"
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

                            <p className="font-semibold">
                              {origen}
                            </p>
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

                            <p className="font-semibold">
                              {destino}
                            </p>
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

                              {viaje?.motivo_cancelacion && (
                                <p className="mt-1 text-sm text-red-700">
                                  Motivo:{" "}
                                  {viaje.motivo_cancelacion}
                                </p>
                              )}

                              {!viaje?.motivo_cancelacion && (
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
                      {!cancelado && (
                        <div className="mt-6 border-t pt-5">

                          <div className="mb-4 flex items-center justify-between">

                            <div>
                              <h3 className="font-semibold text-slate-900">
                                Solicitudes recibidas
                              </h3>

                              <p className="text-sm text-slate-500">
                                {solicitudes.length} solicitud
                                {solicitudes.length !== 1
                                  ? "es"
                                  : ""}
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

                              {solicitudes.map(
                                (solicitud) => {
                                  const estadoSolicitud =
                                    obtenerEstadoSolicitud(
                                      solicitud?.estado
                                    );

                                  const solicitudResuelta =
                                    ["aceptada", "rechazada", "cancelada"].includes(
                                      String(
                                        solicitud?.estado || ""
                                      ).toLowerCase()
                                    );

                                  return (
                                    <div
                                      key={
                                        solicitud.id
                                      }
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
                                              className={`inline-flex mt-1 rounded-full px-2.5 py-1 text-xs font-semibold ${estadoSolicitud.clase}`}
                                            >
                                              {
                                                estadoSolicitud.texto
                                              }
                                            </span>
                                          </div>

                                        </div>

                                        {/* ACCIONES DE SOLICITUD */}
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
                                              <X
                                                size={16}
                                              />
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
                                              <Check
                                                size={16}
                                              />
                                              Aceptar
                                            </Button>

                                          </div>
                                        )}

                                      </div>

                                    </div>
                                  );
                                }
                              )}

                            </div>
                          )}

                        </div>
                      )}

                      {/* ACCIONES DEL VIAJE */}
                      <div className="mt-6 flex flex-col gap-3 border-t pt-5">

                        {puedeCancelarViaje(viaje) ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              abrirModalCancelacion(
                                viaje
                              )
                            }
                            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <XCircle size={17} />
                            Cancelar viaje
                          </Button>
                        ) : cancelado ? (
                          <div className="rounded-xl bg-slate-50 p-3 text-center text-sm font-medium text-slate-500">
                            Este viaje está cancelado y ya no tiene
                            acciones disponibles.
                          </div>
                        ) : (
                          <div className="rounded-xl bg-slate-50 p-3 text-center text-sm font-medium text-slate-500">
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
                  ¿Estás segura de que deseas cancelar este
                  viaje? Esta acción cambiará su estado a
                  Cancelado.
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
                  setMotivoCancelacion(
                    event.target.value
                  )
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
                {cancelandoViaje ? "Cancelando..." : "Sí, cancelar viaje"}
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default MisViajes;