import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Clock3,
  DollarSign,
  MapPin,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AlertBanner from "@/components/ui/alert-banner";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import { apiRequest } from "@/services/api";

const mapEstado = (estado) => {
  const valor = String(estado || "programado").trim().toLowerCase();

  const estados = {
    programado: {
      label: "Programado",
      className: "bg-sky-100 text-sky-700",
    },
    "en curso": {
      label: "En curso",
      className: "bg-amber-100 text-amber-700",
    },
    finalizado: {
      label: "Finalizado",
      className: "bg-emerald-100 text-emerald-700",
    },
  };

  return estados[valor] || {
    label: "Programado",
    className: "bg-sky-100 text-sky-700",
  };
};

const formatFecha = (fecha) => {
  if (!fecha) return "Sin fecha";
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatHora = (fecha) => {
  if (!fecha) return "Sin hora";
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export default function MisViajes({ onBackHome }) {
  const [viajes, setViajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarViajes = async () => {
      try {
        const data = await apiRequest("/api/trips/driver");
        setViajes(data.trips || []);
      } catch (requestError) {
        setError(requestError.message || "No se pudieron cargar tus viajes.");
      } finally {
        setCargando(false);
      }
    };

    cargarViajes();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <nav className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <Button type="button" variant="outline" onClick={onBackHome}>
            <ArrowLeft size={16} />
            Volver al inicio
          </Button>
        </div>
      </nav>

      <main className="flex-1 px-6 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-left text-sm font-semibold tracking-widest text-emerald-600">
                MIS VIAJES
              </p>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Viajes publicados
              </h1>
            </div>
          </div>

          {error && <div className="mb-6"><AlertBanner type="error" message={error} /></div>}

          {cargando ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-500">
              Cargando tus viajes publicados...
            </div>
          ) : viajes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-600">
                Aún no has publicado viajes. Cuando publiques uno, aparecerá aquí.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5">
              {viajes.map((viaje) => {
                const estado = mapEstado(viaje.estado);

                return (
                  <Card key={viaje.id} className="overflow-hidden">
                    <CardContent className="p-5 md:p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estado.className}`}>
                              {estado.label}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {viaje.vehiculo_marca || "Vehículo"} {viaje.vehiculo_modelo || ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                            <MapPin size={18} className="text-emerald-600" />
                            <span>
                              {viaje.origen} <span className="text-slate-400">→</span> {viaje.destino}
                            </span>
                          </div>

                          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-5">
                            <div className="flex items-center gap-2">
                              <CalendarDays size={16} className="text-emerald-600" />
                              {formatFecha(viaje.fecha_salida)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock3 size={16} className="text-emerald-600" />
                              {formatHora(viaje.fecha_salida)}
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign size={16} className="text-emerald-600" />
                              ${Number(viaje.costo_por_pasajero ?? 0).toFixed(2)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users size={16} className="text-emerald-600" />
                              {viaje.cupo_disponible ?? 0} asientos libres
                            </div>
                            <div className="flex items-center gap-2">
                              <Users size={16} className="text-violet-600" />
                              {Number(viaje.usuarios_separaron_asiento ?? 0)} usuario{Number(viaje.usuarios_separaron_asiento ?? 0) === 1 ? "" : "s"} separ{Number(viaje.usuarios_separaron_asiento ?? 0) === 1 ? "ó" : "aron"} asiento
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 md:min-w-[180px]">
                          <div className="mb-2 flex items-center gap-2 font-medium text-slate-700">
                            <Car size={16} className="text-emerald-600" />
                            Detalles del vehículo
                          </div>
                          <p>{viaje.vehiculo_marca || "Marca no disponible"}</p>
                          <p>{viaje.vehiculo_modelo || "Modelo no disponible"}</p>
                          <p>{viaje.vehiculo_placa || "Placa no disponible"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
