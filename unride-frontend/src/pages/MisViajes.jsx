import { useEffect, useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  Car,
  Clock3,
  DollarSign,
  MapPin,
  Users,
  Plus,
  LoaderCircle,
  AlertCircle,
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
}) {

  const [viajes, setViajes] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");


  // ============================================================
  // CARGAR VIAJES
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
                  Consulta y administra los viajes que
                  has publicado como conductor.
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
          {/* ERROR                                              */}
          {/* ================================================== */}

          {error && (
            <div className="mb-6">

              <AlertBanner
                type="error"
                message={error}
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


                <h2 className="!m-0 !text-lg !font-bold !text-slate-900">

                  Cargando tus viajes

                </h2>


                <p className="mt-2 text-sm text-slate-500">

                  Estamos consultando tus viajes
                  publicados.

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
                  consultar su información y disponibilidad.

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

            <div className="grid gap-5">

              {viajes.map(
                (viaje) => {

                  const estado =
                    mapEstado(
                      viaje.estado
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


                        {/* CABECERA */}

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

                                  <MapPin
                                    size={18}
                                  />

                                </div>


                                <div>

                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">

                                    Ruta

                                  </p>


                                  <h2 className="!mb-0 !mt-1 !text-lg !font-bold !text-slate-900 md:!text-xl">

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


                        {/* DATOS */}

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


                        {/* VEHÍCULO */}

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