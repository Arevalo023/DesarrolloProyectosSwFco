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
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import { apiRequest } from "@/services/api";

function MisSolicitudes({ onBack, user }) {
  const [reservaciones, setReservaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [cancelandoId, setCancelandoId] = useState(null);

  const [reservacionSeleccionada, setReservacionSeleccionada] =
    useState(null);

  useEffect(() => {
    let cancelado = false;
    apiRequest("/api/trips/reservations")
      .then((data) => {
        if (!cancelado) setReservaciones(data.reservations || []);
      })
      .catch((requestError) => {
        if (!cancelado) {
          setError(requestError.message || "No se pudieron cargar tus solicitudes.");
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const formatearFecha = (fecha) => {
    if (!fecha) return "";

    const [year, month, day] = fecha.split("-");

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
      await apiRequest(`/api/reservations/${id}/cancel`, { method: "PATCH" });
      setReservaciones((actuales) => actuales.map((reservacion) =>
        reservacion.id === id ? { ...reservacion, estado: "cancelada" } : reservacion
      ));
      setReservacionSeleccionada(null);
    } catch (requestError) {
      setError(requestError.message || "No se pudo cancelar la solicitud.");
    } finally {
      setCancelandoId(null);
    }
  };

  const reservacionesActivas = reservaciones.filter(
    (reservacion) => reservacion.estado !== "cancelada"
  );

  const reservacionesCanceladas = reservaciones.filter(
    (reservacion) => reservacion.estado === "cancelada"
  );

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

            <span className="hidden sm:inline">
              Regresar
            </span>
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
            Mis Solicitudes
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Consulta tus solicitudes de viaje y revisa cuáles fueron confirmadas.
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* RESERVACIONES */}
        <section>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Mis solicitudes
            </h2>

            <p className="text-sm text-slate-500">
              {reservacionesActivas.length} solicitud
              {reservacionesActivas.length !== 1 ? "es" : ""}
            </p>
          </div>

          {/* ESTADO VACÍO */}
          {cargando ? (
            <p role="status" className="py-10 text-center text-sm text-slate-500">
              Cargando tus solicitudes...
            </p>
          ) : reservacionesActivas.length === 0 ? (
            <Card className="border-dashed bg-white">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">

                <div className="mb-4 rounded-full bg-slate-100 p-4">
                  <CalendarDays
                    size={32}
                    className="text-slate-400"
                  />
                </div>

                <h3 className="text-lg font-semibold text-slate-800">
                  No tienes solicitudes
                </h3>

                <p className="mt-2 max-w-md text-sm text-slate-500">
                  Cuando solicites un viaje, tus solicitudes
                  aparecerán aquí.
                </p>

              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">

              {reservacionesActivas.map((reservacion) => {
                const estado = obtenerEstado(
                  reservacion.estado
                );

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
                                {formatearFecha(
                                  reservacion.fecha_salida
                                )}
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
                                {reservacion.hora_salida}
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

                          {reservacion.estado !== "rechazada" && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                abrirModalCancelacion(
                                  reservacion
                                )
                              }
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <X size={17} />
                              Cancelar solicitud
                            </Button>
                          )}

                        </div>

                      </div>

                    </CardContent>
                  </Card>
                );
              })}

            </div>
          )}

        </section>

        {/* HISTORIAL DE CANCELADAS */}
        {reservacionesCanceladas.length > 0 && (
          <section className="mt-10">

            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                Solicitudes canceladas
              </h2>

              <p className="text-sm text-slate-500">
                Historial de solicitudes canceladas
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">

              {reservacionesCanceladas.map((reservacion) => (
                <Card
                  key={reservacion.id}
                  className="border-slate-200 bg-white opacity-80"
                >
                  <CardContent className="p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div>
                        <p className="text-xs font-medium text-slate-400">
                          Solicitud #{reservacion.id}
                        </p>

                        <h3 className="mt-1 font-semibold text-slate-700">
                          {reservacion.origen} →{" "}
                          {reservacion.destino}
                        </h3>
                      </div>

                      <span className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                        <X size={15} />
                        Cancelada
                      </span>

                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">

                      <span className="flex items-center gap-2">
                        <CalendarDays size={16} />
                        {formatearFecha(
                          reservacion.fecha_salida
                        )}
                      </span>

                      <span className="flex items-center gap-2">
                        <Clock3 size={16} />
                        {reservacion.hora_salida}
                      </span>

                    </div>

                  </CardContent>
                </Card>
              ))}

            </div>

          </section>
        )}

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
                  ¿Estás segura de que deseas cancelar esta
                  solicitud?
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
                  {reservacionSeleccionada.hora_salida}
                </span>

              </div>

            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <Button
                type="button"
                variant="outline"
                onClick={cerrarModal}
                disabled={cancelandoId === reservacionSeleccionada.id}
              >
                Mantener solicitud
              </Button>

              <Button
                type="button"
                onClick={cancelarReservacion}
                disabled={cancelandoId === reservacionSeleccionada.id}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {cancelandoId === reservacionSeleccionada.id ? "Cancelando..." : "Sí, cancelar"}
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default MisSolicitudes;