import { useEffect, useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  Car,
  Clock3,
  MapPin,
  Users,
  Plus,
  LoaderCircle,
  Check,
  X,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

import AlertBanner from "@/components/ui/alert-banner";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";

import { apiRequest } from "@/services/api";


// ============================================================
// ESTADO DEL VIAJE
// ============================================================

const mapEstado = (estado) => {
  const valor = String(
    estado || "programado"
  )
    .trim()
    .toLowerCase();

  const estados = {
    programado: {
      label: "Programado",
      className:
        "bg-sky-100 text-sky-700",
    },

    "en curso": {
      label: "En curso",
      className:
        "bg-amber-100 text-amber-700",
    },

    finalizado: {
      label: "Finalizado",
      className:
        "bg-emerald-100 text-emerald-700",
    },
  };

  return (
    estados[valor] || {
      label: "Programado",
      className:
        "bg-sky-100 text-sky-700",
    }
  );
};


// ============================================================
// FECHA
// ============================================================

const formatFecha = (fecha) => {
  if (!fecha) {
    return "Sin fecha";
  }

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return fecha;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(date);
};


// ============================================================
// HORA
// ============================================================

const formatHora = (fecha) => {
  if (!fecha) {
    return "Sin hora";
  }

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return fecha;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  ).format(date);
};


export default function MisViajes({
  onBackHome,
  onPublicarViaje,
  onResponderSolicitud,
}) {

  // ============================================================
  // ESTADOS
  // ============================================================

  const [viajes, setViajes] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    procesandoSolicitud,
    setProcesandoSolicitud,
  ] = useState(null);

  const [
    mensajeSolicitud,
    setMensajeSolicitud,
  ] = useState("");


  // ============================================================
  // CARGAR VIAJES REALES
  // ============================================================

  useEffect(() => {
    let cancelado = false;

    const cargarViajes = async () => {
      try {
        setCargando(true);
        setError("");

        const data =
          await apiRequest(
            "/api/trips/driver"
          );

        if (cancelado) {
          return;
        }

        setViajes(
          data.trips || []
        );

      } catch (requestError) {
        if (cancelado) {
          return;
        }

        setViajes([]);

        setError(
          requestError.message ||
            "No se pudieron cargar tus viajes."
        );

      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    };

    cargarViajes();

    return () => {
      cancelado = true;
    };
  }, []);


  // ============================================================
  // CONTAR PENDIENTES
  // ============================================================

  const contarPendientes = (
    solicitudes = []
  ) => {
    return solicitudes.filter(
      (solicitud) =>
        solicitud.estado ===
        "pendiente"
    ).length;
  };


  // ============================================================
  // CLASE ESTADO SOLICITUD
  // ============================================================

  const claseEstadoSolicitud = (
    estado
  ) => {
    if (estado === "aceptada") {
      return (
        "bg-emerald-100 text-emerald-700"
      );
    }

    if (estado === "rechazada") {
      return (
        "bg-red-100 text-red-700"
      );
    }

    return (
      "bg-amber-100 text-amber-700"
    );
  };


  // ============================================================
  // TEXTO ESTADO SOLICITUD
  // ============================================================

  const textoEstadoSolicitud = (
    estado
  ) => {
    if (estado === "aceptada") {
      return "Aceptada";
    }

    if (estado === "rechazada") {
      return "Rechazada";
    }

    return "Pendiente";
  };


  // ============================================================
  // RESPONDER SOLICITUD
  // ============================================================

  const responderSolicitud = async (
    viajeId,
    solicitudId,
    nuevoEstado
  ) => {
    if (procesandoSolicitud) {
      return;
    }

    if (!onResponderSolicitud) {
      setError(
        "La gestión de solicitudes todavía no está disponible en el backend."
      );

      return;
    }

    setProcesandoSolicitud(
      solicitudId
    );

    setError("");
    setMensajeSolicitud("");

    try {
      const resultado =
        await onResponderSolicitud({
          viajeId,
          solicitudId,
          estado: nuevoEstado,
        });


      // ========================================================
      // ACTUALIZAR FRONTEND CON RESPUESTA REAL
      // ========================================================

      setViajes((actuales) =>
        actuales.map((viaje) => {

          if (viaje.id !== viajeId) {
            return viaje;
          }

          const solicitudes =
            (
              viaje.solicitudes || []
            ).map((solicitud) =>
              solicitud.id ===
              solicitudId
                ? {
                    ...solicitud,
                    estado:
                      nuevoEstado,
                  }
                : solicitud
            );


          return {
            ...viaje,

            solicitudes,

            cupo_disponible:
              resultado?.cupo_disponible ??
              viaje.cupo_disponible,

            usuarios_separaron_asiento:
              resultado
                ?.usuarios_separaron_asiento ??
              viaje
                .usuarios_separaron_asiento,
          };
        })
      );


      setMensajeSolicitud(
        resultado?.message ||
          (nuevoEstado ===
          "aceptada"
            ? "Solicitud aceptada correctamente."
            : "Solicitud rechazada correctamente.")
      );

    } catch (requestError) {
      setError(
        requestError.message ||
          "No fue posible actualizar la solicitud."
      );

    } finally {
      setProcesandoSolicitud(null);
    }
  };


  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">

      {/* ====================================================== */}
      {/* NAVBAR                                                 */}
      {/* ====================================================== */}

      <nav className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">

          <Logo />

          <Button
            type="button"
            variant="outline"
            onClick={onBackHome}
            className="
              flex
              items-center
              gap-2
              border-slate-300
              text-slate-700
              hover:border-emerald-500
              hover:bg-emerald-50
              hover:text-emerald-700
            "
          >
            <ArrowLeft size={17} />

            Volver al inicio
          </Button>

        </div>

      </nav>


      {/* ====================================================== */}
      {/* CONTENIDO                                              */}
      {/* ====================================================== */}

      <main className="flex-1">

        <div className="mx-auto w-full max-w-6xl px-6 py-10 md:py-14">


          {/* ================================================== */}
          {/* ENCABEZADO                                        */}
          {/* ================================================== */}

          <section className="mb-8">

            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

              <div className="max-w-2xl">

                <div className="mb-3 flex items-center gap-2 text-emerald-700">

                  <Car size={22} />

                  <span className="text-sm font-bold tracking-widest">
                    MIS VIAJES
                  </span>

                </div>


                <h1
                  className="m-0 text-3xl font-bold tracking-tight md:text-4xl"
                  style={{
                    color: "#0f172a",
                    opacity: 1,
                  }}
                >
                  Viajes publicados
                </h1>


                <p
                  className="mt-3 text-base leading-7"
                  style={{
                    color: "#475569",
                    opacity: 1,
                  }}
                >
                  Consulta tus viajes y administra
                  las solicitudes de los pasajeros.
                </p>

              </div>


              {onPublicarViaje && (
                <Button
                  type="button"
                  onClick={
                    onPublicarViaje
                  }
                  className="
                    flex
                    items-center
                    gap-2
                    bg-emerald-600
                    text-white
                    hover:bg-emerald-700
                  "
                >
                  <Plus size={18} />

                  Publicar viaje
                </Button>
              )}

            </div>

          </section>


          {/* ================================================== */}
          {/* MENSAJES                                           */}
          {/* ================================================== */}

          {error && (
            <div className="mb-6">

              <AlertBanner
                type="error"
                message={error}
              />

            </div>
          )}


          {mensajeSolicitud && (
            <div className="mb-6">

              <AlertBanner
                type="success"
                message={
                  mensajeSolicitud
                }
              />

            </div>
          )}


          {/* ================================================== */}
          {/* CARGANDO                                           */}
          {/* ================================================== */}

          {cargando ? (

            <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">

              <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">

                <LoaderCircle
                  size={34}
                  className="mb-4 animate-spin text-emerald-600"
                />

                <h2
                  className="m-0 text-lg font-bold"
                  style={{
                    color: "#0f172a",
                  }}
                >
                  Cargando tus viajes
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Estamos consultando tus viajes publicados.
                </p>

              </CardContent>

            </Card>


          ) : viajes.length === 0 ? (

            /* ================================================= */
            /* ESTADO VACÍO                                     */
            /* ================================================= */

            <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">

              <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center md:py-20">

                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">

                  <Car size={36} />

                </div>


                <h2
                  className="mb-0 mt-6 text-2xl font-bold"
                  style={{
                    color: "#0f172a",
                    opacity: 1,
                  }}
                >
                  Aún no has publicado viajes
                </h2>


                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                  Cuando publiques tu primer viaje,
                  aparecerá aquí para que puedas
                  consultar su información y
                  administrar sus solicitudes.
                </p>


                {onPublicarViaje && (
                  <Button
                    type="button"
                    onClick={
                      onPublicarViaje
                    }
                    className="
                      mt-7
                      flex
                      items-center
                      gap-2
                      bg-emerald-600
                      text-white
                      hover:bg-emerald-700
                    "
                  >
                    <Plus size={18} />

                    Publicar mi primer viaje
                  </Button>
                )}

              </CardContent>

            </Card>


          ) : (

            /* ================================================= */
            /* LISTA DE VIAJES                                  */
            /* ================================================= */

            <div className="grid gap-6">

              {viajes.map(
                (viaje) => {

                  const estado =
                    mapEstado(
                      viaje.estado
                    );

                  const solicitudesViaje =
                    viaje.solicitudes || [];

                  const pendientes =
                    contarPendientes(
                      solicitudesViaje
                    );


                  return (
                    <Card
                      key={viaje.id}
                      className="
                        overflow-hidden
                        rounded-2xl
                        border-slate-200
                        bg-white
                        shadow-sm
                        transition
                        duration-200
                        hover:-translate-y-0.5
                        hover:shadow-md
                      "
                    >

                      <CardContent className="p-0">


                        {/* ===================================== */}
                        {/* CABECERA                              */}
                        {/* ===================================== */}

                        <div className="border-b border-slate-100 bg-white px-6 py-5">

                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                            <div>

                              <div className="mb-3 flex flex-wrap items-center gap-2">

                                <span
                                  className={`
                                    rounded-full
                                    px-3
                                    py-1
                                    text-xs
                                    font-semibold
                                    ${estado.className}
                                  `}
                                >
                                  {estado.label}
                                </span>


                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">

                                  {viaje.vehiculo_marca ||
                                    "Vehículo"}{" "}

                                  {viaje.vehiculo_modelo ||
                                    ""}

                                </span>

                              </div>


                              <div className="flex items-start gap-3">

                                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">

                                  <MapPin size={18} />

                                </div>


                                <div>

                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    Ruta
                                  </p>


                                  <h2
                                    className="mb-0 mt-1 text-lg font-bold md:text-xl"
                                    style={{
                                      color:
                                        "#0f172a",
                                    }}
                                  >
                                    {viaje.origen}

                                    <span className="mx-2 text-emerald-500">
                                      →
                                    </span>

                                    {viaje.destino}
                                  </h2>

                                </div>

                              </div>

                            </div>


                            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-left md:text-right">

                              <p className="text-xs font-medium text-emerald-700">
                                Precio por pasajero
                              </p>


                              <p className="mt-1 text-2xl font-bold text-emerald-700">

                                $
                                {Number(
                                  viaje.costo_por_pasajero ??
                                    0
                                ).toFixed(2)}

                              </p>

                            </div>

                          </div>

                        </div>


                        {/* ===================================== */}
                        {/* DATOS                                 */}
                        {/* ===================================== */}

                        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">

                          <div className="rounded-xl bg-slate-50 p-4">

                            <div className="mb-2 flex items-center gap-2 text-slate-500">

                              <CalendarDays
                                size={16}
                                className="text-emerald-600"
                              />

                              <span className="text-xs font-medium">
                                Fecha
                              </span>

                            </div>

                            <p className="text-sm font-semibold text-slate-900">
                              {formatFecha(
                                viaje.fecha_salida
                              )}
                            </p>

                          </div>


                          <div className="rounded-xl bg-slate-50 p-4">

                            <div className="mb-2 flex items-center gap-2 text-slate-500">

                              <Clock3
                                size={16}
                                className="text-emerald-600"
                              />

                              <span className="text-xs font-medium">
                                Hora
                              </span>

                            </div>

                            <p className="text-sm font-semibold text-slate-900">
                              {formatHora(
                                viaje.fecha_salida
                              )}
                            </p>

                          </div>


                          <div className="rounded-xl bg-slate-50 p-4">

                            <div className="mb-2 flex items-center gap-2 text-slate-500">

                              <Users
                                size={16}
                                className="text-emerald-600"
                              />

                              <span className="text-xs font-medium">
                                Asientos libres
                              </span>

                            </div>

                            <p className="text-sm font-semibold text-slate-900">
                              {viaje.cupo_disponible ??
                                0}
                            </p>

                          </div>


                          <div className="rounded-xl bg-slate-50 p-4">

                            <div className="mb-2 flex items-center gap-2 text-slate-500">

                              <Users
                                size={16}
                                className="text-violet-600"
                              />

                              <span className="text-xs font-medium">
                                Reservados
                              </span>

                            </div>

                            <p className="text-sm font-semibold text-slate-900">
                              {Number(
                                viaje.usuarios_separaron_asiento ??
                                  0
                              )}
                            </p>

                          </div>

                        </div>


                        {/* ===================================== */}
                        {/* VEHÍCULO                              */}
                        {/* ===================================== */}

                        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">

                                <Car size={19} />

                              </div>


                              <div>

                                <p className="text-xs text-slate-500">
                                  Vehículo
                                </p>

                                <p className="text-sm font-semibold text-slate-900">

                                  {viaje.vehiculo_marca ||
                                    "Marca no disponible"}{" "}

                                  {viaje.vehiculo_modelo ||
                                    ""}

                                </p>

                              </div>

                            </div>


                            <div>

                              <p className="text-xs text-slate-500">
                                Placas
                              </p>

                              <p className="text-sm font-semibold uppercase text-slate-900">

                                {viaje.vehiculo_placa ||
                                  "No disponible"}

                              </p>

                            </div>

                          </div>

                        </div>


                        {/* ===================================== */}
                        {/* SOLICITUDES                           */}
                        {/* ===================================== */}

                        <div className="border-t border-slate-200 bg-white px-6 py-6">

                          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                            <div>

                              <div className="flex items-center gap-2">

                                <Users
                                  size={19}
                                  className="text-emerald-600"
                                />

                                <h3
                                  className="text-base font-bold"
                                  style={{
                                    color:
                                      "#0f172a",
                                  }}
                                >
                                  Solicitudes de pasajeros
                                </h3>

                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                Acepta o rechaza las solicitudes interesadas en este viaje.
                              </p>

                            </div>


                            <span
                              className={`
                                inline-flex
                                w-fit
                                rounded-full
                                px-3
                                py-1
                                text-xs
                                font-semibold

                                ${
                                  pendientes > 0
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }
                              `}
                            >
                              {pendientes}{" "}

                              {pendientes === 1
                                ? "pendiente"
                                : "pendientes"}
                            </span>

                          </div>


                          {solicitudesViaje.length ===
                          0 ? (

                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center">

                              <Users
                                size={26}
                                className="mx-auto mb-3 text-slate-400"
                              />

                              <p className="text-sm font-medium text-slate-600">
                                No hay solicitudes para este viaje.
                              </p>

                            </div>

                          ) : (

                            <div className="space-y-3">

                              {solicitudesViaje.map(
                                (
                                  solicitud
                                ) => (

                                  <div
                                    key={
                                      solicitud.id
                                    }
                                    className="
                                      flex
                                      flex-col
                                      gap-4
                                      rounded-xl
                                      border
                                      border-slate-200
                                      bg-slate-50
                                      p-4
                                      sm:flex-row
                                      sm:items-center
                                      sm:justify-between
                                    "
                                  >

                                    {/* PASAJERO */}

                                    <div className="flex items-center gap-3">

                                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">

                                        <UserRound
                                          size={20}
                                        />

                                      </div>


                                      <div>

                                        <p className="font-semibold text-slate-900">

                                          {solicitud.nombre ||
                                            solicitud.pasajero ||
                                            "Pasajero"}

                                        </p>


                                        <span
                                          className={`
                                            mt-1
                                            inline-flex
                                            rounded-full
                                            px-2.5
                                            py-1
                                            text-xs
                                            font-semibold

                                            ${claseEstadoSolicitud(
                                              solicitud.estado
                                            )}
                                          `}
                                        >
                                          {textoEstadoSolicitud(
                                            solicitud.estado
                                          )}
                                        </span>

                                      </div>

                                    </div>


                                    {/* BOTONES */}

                                    {solicitud.estado ===
                                      "pendiente" && (

                                      <div className="flex flex-col gap-2 sm:flex-row">

                                        <Button
                                          type="button"
                                          disabled={
                                            procesandoSolicitud ===
                                              solicitud.id ||
                                            Number(
                                              viaje.cupo_disponible ||
                                                0
                                            ) <= 0
                                          }
                                          onClick={() =>
                                            responderSolicitud(
                                              viaje.id,
                                              solicitud.id,
                                              "aceptada"
                                            )
                                          }
                                          className="
                                            flex
                                            items-center
                                            justify-center
                                            gap-2
                                            bg-emerald-600
                                            text-white
                                            hover:bg-emerald-700
                                          "
                                        >

                                          {procesandoSolicitud ===
                                          solicitud.id ? (

                                            <LoaderCircle
                                              size={17}
                                              className="animate-spin"
                                            />

                                          ) : (

                                            <Check
                                              size={17}
                                            />

                                          )}

                                          {procesandoSolicitud ===
                                          solicitud.id
                                            ? "Procesando..."
                                            : "Aceptar"}

                                        </Button>


                                        <Button
                                          type="button"
                                          variant="outline"
                                          disabled={
                                            procesandoSolicitud ===
                                            solicitud.id
                                          }
                                          onClick={() =>
                                            responderSolicitud(
                                              viaje.id,
                                              solicitud.id,
                                              "rechazada"
                                            )
                                          }
                                          className="
                                            flex
                                            items-center
                                            justify-center
                                            gap-2
                                            border-red-200
                                            text-red-600
                                            hover:bg-red-50
                                          "
                                        >

                                          <X size={17} />

                                          Rechazar

                                        </Button>

                                      </div>

                                    )}

                                  </div>

                                )
                              )}

                            </div>

                          )}

                        </div>

                      </CardContent>

                    </Card>
                  );
                }
              )}

            </div>

          )}

        </div>

      </main>

      <Footer />

    </div>
  );
}