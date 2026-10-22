import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Clock3,
  MapPin,
  Phone,
  UserRound,
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Star,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import { apiRequest } from "@/services/api";
import { formatearFechaViaje, formatearHoraViaje } from "@/utils/fechaViaje";

function MisSolicitudes({
  onBack,
  user,
  vista = "principal",
  onVerRechazadas,
  onVerCanceladas,
}) {
  const [reservaciones, setReservaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [cancelandoId, setCancelandoId] = useState(null);

  const [reservacionSeleccionada, setReservacionSeleccionada] =
    useState(null);

  // Estados para calificar al conductor.
  const [calificacionAbiertaId, setCalificacionAbiertaId] = useState(null);
  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState("");
  const [calificandoId, setCalificandoId] = useState(null);
  const [calificacionesEnviadas, setCalificacionesEnviadas] = useState([]);
  const [estadoCalificaciones, setEstadoCalificaciones] = useState({});
  const [motivosCalificacionBloqueada, setMotivosCalificacionBloqueada] = useState({});
  const [mensajeCalificacion, setMensajeCalificacion] = useState("");
  const [errorCalificacion, setErrorCalificacion] = useState("");

  useEffect(() => {
    let cancelado = false;

    apiRequest("/api/trips/reservations")
      .then((data) => {
        if (!cancelado) {
          setReservaciones(data.reservations || []);
        }
      })
      .catch((requestError) => {
        if (!cancelado) {
          setError(
            requestError.message ||
              "No se pudieron cargar tus solicitudes."
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (vista !== "principal") return undefined;

    const reservacionesElegibles = reservaciones.filter((reservacion) =>
      String(reservacion.estado || "").trim().toLowerCase() === "aceptada" &&
      ["finalizado", "completado"].includes(
        String(reservacion.viaje_estado || "").trim().toLowerCase()
      )
    );
    if (reservacionesElegibles.length === 0) return undefined;

    let cancelado = false;
    const idsConductor = [...new Set(
      reservacionesElegibles
        .map((reservacion) => Number(reservacion.conductor_id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )];
    const sinConductor = reservacionesElegibles.filter(
      (reservacion) => !Number.isInteger(Number(reservacion.conductor_id)) ||
        Number(reservacion.conductor_id) <= 0
    );

    const verificarCalificaciones = async () => {
      const resultados = await Promise.allSettled(
        idsConductor.map(async (conductorId) => ({
          conductorId,
          respuesta: await apiRequest(`/api/ratings/user/${conductorId}`),
        }))
      );

      if (cancelado) return;

      const estadoPorConductor = new Map();
      resultados.forEach((resultado, indice) => {
        if (resultado.status === "fulfilled") {
          estadoPorConductor.set(
            resultado.value.conductorId,
            resultado.value.respuesta.calificaciones || []
          );
        } else {
          estadoPorConductor.set(idsConductor[indice], null);
        }
      });

      setEstadoCalificaciones((actuales) => {
        const siguiente = { ...actuales };
        reservacionesElegibles.forEach((reservacion) => {
          const conductorId = Number(reservacion.conductor_id);
          if (sinConductor.includes(reservacion)) {
            siguiente[reservacion.id] = "no_disponible";
            return;
          }
          const calificaciones = estadoPorConductor.get(conductorId);
          if (!Array.isArray(calificaciones) || !Number(user?.id)) {
            siguiente[reservacion.id] = "no_disponible";
            return;
          }

          const yaCalifico = calificaciones.some((calificacion) =>
            Number(calificacion.viaje_id) === Number(reservacion.viaje_id) &&
            Number(calificacion.calificador_id) === Number(user.id) &&
            Number(calificacion.calificado_id) === conductorId
          );
          siguiente[reservacion.id] = yaCalifico ? "calificada" : "disponible";
        });
        return siguiente;
      });
    };

    void verificarCalificaciones();
    return () => {
      cancelado = true;
    };
  }, [reservaciones, user?.id, vista]);

  const formatearFecha = formatearFechaViaje;

  const obtenerEstado = (estado) => {
    switch (estado) {
      case "aceptada":
        return {
          texto: "Aceptada",
          clase: "bg-green-50 text-green-700",
          icono: <CheckCircle2 size={17} />,
        };

      case "pendiente":
        return {
          texto: "Pendiente",
          clase: "bg-yellow-50 text-yellow-700",
          icono: <AlertCircle size={17} />,
        };

      case "rechazada":
        return {
          texto: "Rechazada",
          clase: "bg-red-50 text-red-700",
          icono: <XCircle size={17} />,
        };

      case "cancelada":
        return {
          texto: "Cancelada",
          clase: "bg-slate-100 text-slate-600",
          icono: <X size={17} />,
        };

      default:
        return {
          texto: "Desconocida",
          clase: "bg-slate-100 text-slate-600",
          icono: <AlertCircle size={17} />,
        };
    }
  };

  // Funciones para cancelar una reservación.
  const abrirModalCancelacion = (reservacion) => {
    setReservacionSeleccionada(reservacion);
  };

  const cerrarModal = () => {
    setReservacionSeleccionada(null);
  };

  const cancelarReservacion = async () => {
    if (!reservacionSeleccionada) return;

    const id = reservacionSeleccionada.id;

    setCancelandoId(id);
    setError("");

    try {
      await apiRequest(`/api/reservations/${id}/cancel`, {
        method: "PATCH",
      });

      setReservaciones((actuales) =>
        actuales.map((reservacion) =>
          reservacion.id === id
            ? { ...reservacion, estado: "cancelada" }
            : reservacion
        )
      );

      setReservacionSeleccionada(null);
    } catch (requestError) {
      setError(
        requestError.message ||
          "No se pudo cancelar la solicitud."
      );
    } finally {
      setCancelandoId(null);
    }
  };

  // Abrir el formulario de calificación.
  const abrirFormularioCalificacion = (reservacion) => {
    setCalificacionAbiertaId(reservacion.id);
    setPuntuacion(5);
    setComentario("");
    setMensajeCalificacion("");
    setErrorCalificacion("");
    setError("");
  };

  // Enviar la calificación al backend.
  const enviarCalificacion = async (reservacion) => {
    if (!reservacion?.viaje_id) {
      setErrorCalificacion(
        "No se encontró el identificador del viaje."
      );
      return;
    }

    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
      setErrorCalificacion(
        "Selecciona una calificación de 1 a 5 estrellas."
      );
      return;
    }

    if (comentario.length > 500) {
      setErrorCalificacion(
        "El comentario no puede superar los 500 caracteres."
      );
      return;
    }

    setCalificandoId(reservacion.id);
    setErrorCalificacion("");
    setMensajeCalificacion("");

    try {
      await apiRequest(
        `/api/trips/${reservacion.viaje_id}/rate-driver`,
        {
          method: "POST",
          body: {
            puntuacion,
            comentario: comentario.trim(),
          },
        }
      );

      setCalificacionesEnviadas((actuales) =>
        [...new Set([...actuales, reservacion.id])]
      );
      setEstadoCalificaciones((actuales) => ({
        ...actuales,
        [reservacion.id]: "calificada",
      }));
      setMotivosCalificacionBloqueada((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes[reservacion.id];
        return siguientes;
      });

      setCalificacionAbiertaId(null);
      setPuntuacion(5);
      setComentario("");

      setMensajeCalificacion(
        `Tu calificación para el conductor de la solicitud #${reservacion.id} se envió correctamente.`
      );
    } catch (requestError) {
      if (requestError.status === 409) {
        setEstadoCalificaciones((actuales) => ({
          ...actuales,
          [reservacion.id]: "calificada",
        }));
        setCalificacionAbiertaId(null);
        setErrorCalificacion("");
      } else {
        if ([400, 403].includes(requestError.status)) {
          setEstadoCalificaciones((actuales) => ({
            ...actuales,
            [reservacion.id]: "no_disponible",
          }));
          setMotivosCalificacionBloqueada((actuales) => ({
            ...actuales,
            [reservacion.id]:
              requestError.message || "No es posible calificar este viaje.",
          }));
          setCalificacionAbiertaId(null);
          setErrorCalificacion("");
        } else {
          setErrorCalificacion(
            requestError.message ||
              "No se pudo enviar la calificación."
          );
        }
      }
    } finally {
      setCalificandoId(null);
    }
  };

  const reservacionesVisibles = reservaciones.filter((reservacion) => {
    const estado = String(reservacion.estado || "").trim().toLowerCase();
    if (vista === "rechazadas") return estado === "rechazada";
    if (vista === "canceladas") return estado === "cancelada";
    return ["pendiente", "aceptada"].includes(estado);
  });
  const tituloPagina = vista === "rechazadas"
    ? "Solicitudes rechazadas"
    : vista === "canceladas"
      ? "Solicitudes canceladas"
      : "Mis Solicitudes";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Regresar</span>
          </button>

          <Logo />

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <UserRound size={18} />
            <span className="hidden sm:inline">
              {user?.nombre || "Pasajero"}
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
            {tituloPagina}
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Consulta tus solicitudes de viaje y revisa cuáles fueron confirmadas.
          </p>
        </div>

        {vista === "principal" && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={onVerRechazadas}
              className="h-auto justify-between rounded-xl border-red-200 bg-white px-5 py-4 text-red-700 hover:bg-red-50"
            >
              <span className="flex items-center gap-3">
                <XCircle size={20} />
                Solicitudes rechazadas
              </span>
              <span aria-hidden="true">→</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onVerCanceladas}
              className="h-auto justify-between rounded-xl border-slate-300 bg-white px-5 py-4 text-slate-700 hover:bg-slate-50"
            >
              <span className="flex items-center gap-3">
                <X size={20} />
                Solicitudes canceladas
              </span>
              <span aria-hidden="true">→</span>
            </Button>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {mensajeCalificacion && (
          <p
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            <CheckCircle2 size={17} className="mr-2 inline" />
            {mensajeCalificacion}
          </p>
        )}

        {/* RESERVACIONES */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              {vista === "principal" ? "Solicitudes activas" : tituloPagina}
            </h2>

            <p className="text-sm text-slate-500">
              {reservacionesVisibles.length} solicitud
              {reservacionesVisibles.length !== 1 ? "es" : ""}
            </p>
          </div>

          {/* ESTADO VACÍO */}
          {cargando ? (
            <p
              role="status"
              className="py-10 text-center text-sm text-slate-500"
            >
              Cargando tus solicitudes...
            </p>
          ) : reservacionesVisibles.length === 0 ? (
            <Card className="border-dashed bg-white">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-4">
                  <CalendarDays
                    size={32}
                    className="text-slate-400"
                  />
                </div>

                <h3 className="text-lg font-semibold text-slate-800">
                  {vista === "rechazadas"
                    ? "No tienes solicitudes rechazadas"
                    : vista === "canceladas"
                      ? "No tienes solicitudes canceladas"
                      : "No tienes solicitudes activas"}
                </h3>

                <p className="mt-2 max-w-md text-sm text-slate-500">
                  {vista === "principal"
                    ? "Cuando solicites un viaje, tus solicitudes pendientes o aceptadas aparecerán aquí."
                    : "Cuando existan solicitudes con este estado, aparecerán aquí."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {reservacionesVisibles.map((reservacion) => {
                const estado = obtenerEstado(reservacion.estado);
                const estadoViaje = String(
                  reservacion.viaje_estado || ""
                ).trim().toLowerCase();

                const viajeFinalizado =
                  String(reservacion.estado || "").trim().toLowerCase() === "aceptada" &&
                  ["finalizado", "completado"].includes(estadoViaje);

                const calificacionEnviada =
                  calificacionesEnviadas.includes(reservacion.id) ||
                  estadoCalificaciones[reservacion.id] === "calificada";

                return (
                  <Card
                    key={reservacion.id}
                    className="overflow-hidden border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <CardContent className="p-0">
                      {/* ENCABEZADO */}
                      <div className="flex items-center justify-between border-b px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-indigo-50 p-3">
                            <Car
                              size={21}
                              className="text-indigo-600"
                            />
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              Solicitud #{reservacion.id}
                            </p>

                            <p className="font-semibold text-slate-900">
                              Viaje compartido
                            </p>
                          </div>
                        </div>

                        <span
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${estado.clase}`}
                        >
                          {estado.icono}
                          {estado.texto}
                        </span>
                      </div>

                      {/* INFORMACIÓN */}
                      <div className="px-5 py-5">
                        {/* RUTA */}
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
                                {reservacion.origen}
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
                                {reservacion.destino}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* FECHA Y HORA */}
                        <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
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
                                {formatearFecha(reservacion.fecha_salida)}
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
                                {formatearHoraViaje(
                                  reservacion.fecha_salida,
                                  reservacion.hora_salida
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* CONDUCTOR */}
                        <div className="mt-5 border-t pt-5">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Información del conductor
                          </p>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-center gap-3">
                              <div className="rounded-full bg-slate-100 p-2">
                                <UserRound
                                  size={18}
                                  className="text-slate-600"
                                />
                              </div>

                              <div>
                                <p className="text-xs text-slate-400">
                                  Conductor
                                </p>

                                <p className="font-medium">
                                  {reservacion.conductor_nombre}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="rounded-full bg-slate-100 p-2">
                                <Phone
                                  size={18}
                                  className="text-slate-600"
                                />
                              </div>

                              <div>
                                <p className="text-xs text-slate-400">
                                  Teléfono
                                </p>

                                <p className="font-medium">
                                  {reservacion.conductor_telefono}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* VEHÍCULO */}
                        <div className="mt-5 border-t pt-5">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Vehículo
                          </p>

                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div>
                              <p className="text-xs text-slate-400">
                                Marca
                              </p>
                              <p className="text-sm font-medium">
                                {reservacion.vehiculo_marca}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">
                                Modelo
                              </p>
                              <p className="text-sm font-medium">
                                {reservacion.vehiculo_modelo}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">
                                Color
                              </p>
                              <p className="text-sm font-medium">
                                {reservacion.vehiculo_color}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">
                                Placas
                              </p>
                              <p className="text-sm font-medium">
                                {reservacion.vehiculo_placa}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* PRECIO Y CANCELAR */}
                        <div className="mt-5 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs text-slate-400">
                              Costo por pasajero
                            </p>

                            <p className="text-2xl font-bold text-indigo-600">
                              ${reservacion.costo_por_pasajero}
                            </p>
                          </div>

                          {reservacion.estado !== "rechazada" &&
                            reservacion.estado !== "cancelada" &&
                            !viajeFinalizado && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  abrirModalCancelacion(reservacion)
                                }
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <X size={17} />
                                Cancelar solicitud
                              </Button>
                            )}
                        </div>

                        {/* CALIFICAR CONDUCTOR */}
                        {String(reservacion.estado || "").trim().toLowerCase() === "aceptada" && (
                          <div className="mt-5 border-t pt-5">
                            <div className="flex items-center gap-2">
                              <Star
                                size={20}
                                className="text-amber-500"
                              />

                              <h3 className="font-semibold text-slate-900">
                                Calificar al conductor
                              </h3>
                            </div>

                            {calificacionEnviada ? (
                              <div className="mt-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled
                                  className="border-green-200 text-green-700"
                                >
                                  <CheckCircle2 size={17} className="mr-2" />
                                  Calificación completada
                                </Button>
                                <p role="status" className="mt-2 text-sm text-green-700">
                                  {calificacionesEnviadas.includes(reservacion.id)
                                    ? "¡Gracias! Tu calificación se envió correctamente."
                                    : "Este viaje ya fue calificado."}
                                </p>
                              </div>
                            ) : !viajeFinalizado ? (
                              <div className="mt-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled
                                  className="border-slate-200 text-slate-500"
                                >
                                  <Star size={17} className="mr-2" />
                                  Calificación no disponible
                                </Button>
                                <p role="status" className="mt-2 text-sm text-slate-500">
                                  {["cancelado", "cancelada"].includes(estadoViaje)
                                    ? "No es posible calificar un viaje cancelado."
                                    : "Podrás calificar al conductor cuando el viaje haya finalizado."}
                                </p>
                              </div>
                            ) : estadoCalificaciones[reservacion.id] !== "disponible" ? (
                              <div className="mt-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled
                                  className="border-slate-200 text-slate-500"
                                >
                                  <Star size={17} className="mr-2" />
                                  {estadoCalificaciones[reservacion.id] === "no_disponible"
                                    ? "Calificación no disponible"
                                    : "Verificando calificación..."}
                                </Button>
                                <p role="status" className="mt-2 text-sm text-slate-500">
                                  {estadoCalificaciones[reservacion.id] === "no_disponible"
                                    ? motivosCalificacionBloqueada[reservacion.id] ||
                                      "No fue posible verificar la calificación. Inténtalo más tarde."
                                    : "Estamos verificando si ya calificaste este viaje."}
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="mt-2 text-sm text-slate-500">
                                  ¿Cómo fue tu experiencia con{" "}
                                  {reservacion.conductor_nombre || "el conductor"}?
                                </p>

                                {calificacionAbiertaId !== reservacion.id ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-50"
                                    onClick={() =>
                                      abrirFormularioCalificacion(reservacion)
                                    }
                                  >
                                    <Star size={17} className="mr-2" />
                                    Calificar conductor
                                  </Button>
                                ) : (
                                  <div className="mt-4 space-y-4">
                                    <div>
                                      <p className="mb-2 text-sm font-medium text-slate-700">
                                        Tu puntuación
                                      </p>

                                      <div
                                        className="flex items-center gap-2"
                                        role="group"
                                        aria-label="Puntuación del conductor"
                                      >
                                        {[1, 2, 3, 4, 5].map((estrella) => (
                                          <button
                                            key={estrella}
                                            type="button"
                                            aria-label={`${estrella} ${
                                              estrella === 1
                                                ? "estrella"
                                                : "estrellas"
                                            }`}
                                            aria-pressed={
                                              puntuacion === estrella
                                            }
                                            onClick={() =>
                                              setPuntuacion(estrella)
                                            }
                                            className="rounded-md p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                          >
                                            <Star
                                              size={28}
                                              className={
                                                estrella <= puntuacion
                                                  ? "fill-amber-400 text-amber-400"
                                                  : "text-slate-300"
                                              }
                                            />
                                          </button>
                                        ))}

                                        <span className="text-sm text-slate-600">
                                          {puntuacion}/5
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <label
                                        htmlFor={`comentario-${reservacion.id}`}
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                      >
                                        Comentario (opcional)
                                      </label>

                                      <textarea
                                        id={`comentario-${reservacion.id}`}
                                        value={comentario}
                                        onChange={(event) =>
                                          setComentario(
                                            event.target.value.slice(0, 500)
                                          )
                                        }
                                        maxLength={500}
                                        rows={3}
                                        placeholder="Cuéntanos cómo fue tu experiencia..."
                                        className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                      />

                                      <p className="mt-1 text-right text-xs text-slate-400">
                                        {comentario.length}/500 caracteres
                                      </p>
                                    </div>

                                    {errorCalificacion && (
                                      <p
                                        role="alert"
                                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                                      >
                                        {errorCalificacion}
                                      </p>
                                    )}

                                    <div className="flex flex-col gap-2 sm:flex-row">
                                      <Button
                                        type="button"
                                        disabled={
                                          calificandoId === reservacion.id
                                        }
                                        onClick={() =>
                                          enviarCalificacion(reservacion)
                                        }
                                        className="bg-indigo-600 text-white hover:bg-indigo-700"
                                      >
                                        {calificandoId === reservacion.id
                                          ? "Enviando..."
                                          : "Enviar calificación"}
                                      </Button>

                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                          calificandoId === reservacion.id
                                        }
                                        onClick={() => {
                                          setCalificacionAbiertaId(null);
                                          setErrorCalificacion("");
                                          setComentario("");
                                          setPuntuacion(5);
                                        }}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

      </main>

      <Footer />

      {/* MODAL DE CANCELACIÓN */}
      {reservacionSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="mb-3 inline-flex rounded-full bg-red-50 p-3">
                  <AlertCircle
                    size={24}
                    className="text-red-600"
                  />
                </div>

                <h2 className="text-xl font-bold text-slate-900">
                  Cancelar solicitud
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  ¿Estás segura de que deseas cancelar esta solicitud?
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                {reservacionSeleccionada.origen}
                {" → "}
                {reservacionSeleccionada.destino}
              </p>

              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>
                  {formatearFecha(
                    reservacionSeleccionada.fecha_salida
                  )}
                </span>

                <span>
                  {formatearHoraViaje(
                    reservacionSeleccionada.fecha_salida,
                    reservacionSeleccionada.hora_salida
                  )}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={cerrarModal}
                disabled={
                  cancelandoId === reservacionSeleccionada.id
                }
              >
                Mantener solicitud
              </Button>

              <Button
                type="button"
                onClick={cancelarReservacion}
                disabled={
                  cancelandoId === reservacionSeleccionada.id
                }
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {cancelandoId === reservacionSeleccionada.id
                  ? "Cancelando..."
                  : "Sí, cancelar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MisSolicitudes;