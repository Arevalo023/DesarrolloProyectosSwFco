import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Car, CheckCircle2, Clock3, MapPin, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { apiRequest } from "@/services/api";

const normalizarEstado = (viaje) => String(viaje?.estado || viaje?.status || "").trim().toLowerCase();

export default function HistorialViajes({ tipo, onBack }) {
  const esCancelado = tipo === "cancelados";
  const titulo = esCancelado ? "Viajes cancelados" : "Viajes completados";
  const [viajes, setViajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const respuesta = await apiRequest("/api/trips/driver");
        const datos = Array.isArray(respuesta) ? respuesta : respuesta?.trips || respuesta?.viajes || [];
        const filtrados = datos.filter((viaje) => {
          const estado = normalizarEstado(viaje);
          return esCancelado ? ["cancelado", "cancelada"].includes(estado) : ["finalizado", "completado", "completada"].includes(estado);
        });
        if (activo) setViajes(filtrados);
      } catch (err) {
        if (activo) setError(err?.message || "No fue posible cargar tus viajes.");
      } finally {
        if (activo) setCargando(false);
      }
    }
    void cargar();
    return () => { activo = false; };
  }, [esCancelado, reintento]);

  const Icono = esCancelado ? XCircle : CheckCircle2;
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft size={20} /> Regresar a Mis Viajes
          </button>
          <Logo />
          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex"><Car size={18} /> UniRide</div>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">UniRide</p>
        <h1 className="flex items-center gap-3 text-3xl font-bold md:text-4xl"><Icono className={esCancelado ? "text-red-600" : "text-green-600"} />{titulo}</h1>
        <p className="mb-8 mt-2 text-slate-600">{esCancelado ? "Consulta el historial de tus viajes cancelados." : "Consulta el historial de tus viajes finalizados."}</p>
        {cargando ? (
          <Card><CardContent className="flex flex-col items-center py-16 text-center"><div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" /><p>Cargando viajes...</p></CardContent></Card>
        ) : error ? (
          <Card><CardContent className="flex flex-col items-center gap-4 py-14 text-center"><AlertTriangle className="text-red-600" size={32} /><p role="alert" className="text-red-700">{error}</p><Button onClick={() => setReintento((n) => n + 1)}>Reintentar</Button></CardContent></Card>
        ) : viajes.length === 0 ? (
          <Card className="border-dashed bg-white"><CardContent className="flex flex-col items-center py-16 text-center"><div className="mb-4 rounded-full bg-slate-100 p-4"><Icono size={32} className="text-slate-400" /></div><h2 className="text-lg font-semibold">{esCancelado ? "No tienes viajes cancelados" : "No tienes viajes completados"}</h2><p className="mt-2 max-w-md text-sm text-slate-500">{esCancelado ? "Cuando canceles un viaje, aparecerá aquí." : "Cuando finalices un viaje, aparecerá aquí."}</p><Button variant="outline" className="mt-6" onClick={onBack}>Volver a Mis Viajes</Button></CardContent></Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">{viajes.map((viaje) => (
            <Card key={viaje.id ?? viaje.trip_id ?? viaje.viaje_id} className="border-slate-200 bg-white shadow-sm"><CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><span className="text-sm text-slate-500">Viaje #{viaje.id ?? viaje.trip_id ?? viaje.viaje_id}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${esCancelado ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{esCancelado ? "Cancelado" : "Finalizado"}</span></div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><MapPin size={20} className="text-indigo-600" />{viaje.origen || viaje.origin || "Origen no disponible"} → {viaje.destino || viaje.destination || "Destino no disponible"}</h2>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600"><span className="flex items-center gap-2"><CalendarDays size={16} />{String(viaje.fecha_salida || viaje.fecha || viaje.departure_date || "Fecha no disponible").slice(0, 10)}</span><span className="flex items-center gap-2"><Clock3 size={16} />{viaje.hora_salida || viaje.hora || viaje.departure_time || "Hora no disponible"}</span></div>
              {esCancelado && viaje.motivo_cancelacion && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Motivo: {viaje.motivo_cancelacion}</p>}
            </CardContent></Card>
          ))}</div>
        )}
      </main>
      <Footer />
    </div>
  );
}
