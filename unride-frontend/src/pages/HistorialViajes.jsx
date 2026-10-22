import { useEffect, useState } from "react";
import {
  ArrowLeft, CalendarDays, Car, CheckCircle2, Clock3, MapPin,
  XCircle, AlertTriangle, Star, UserRound,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { apiRequest } from "@/services/api";
import { formatearHoraViaje } from "@/utils/fechaViaje";

const normalizarEstado = (v) => String(v?.estado || v?.status || "").trim().toLowerCase();
const idViaje = (v) => v.id ?? v.trip_id ?? v.viaje_id;
const clave = (viajeId, pasajeroId) => `${viajeId}:${pasajeroId}`;

export default function HistorialViajes({ tipo, onBack }) {
  const esCancelado = tipo === "cancelados";
  const titulo = esCancelado ? "Viajes cancelados" : "Viajes completados";
  const [viajes, setViajes] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [verificados, setVerificados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [reintento, setReintento] = useState(0);
  const [seleccion, setSeleccion] = useState(null);
  const [puntuacion, setPuntuacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorCalificacion, setErrorCalificacion] = useState("");

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
          return esCancelado
            ? ["cancelado", "cancelada"].includes(estado)
            : ["finalizado", "completado", "completada"].includes(estado);
        });

        // Las solicitudes incluyen pasajero_id, pasajero_nombre y estado.
        // Solo un pasajero con reservación aceptada puede ser calificado.
        let aceptadas = [];
        const estados = {};
        if (!esCancelado && filtrados.length > 0) {
          const respuestaSolicitudes = await apiRequest("/api/trips/driver/requests");
          const todas = Array.isArray(respuestaSolicitudes)
            ? respuestaSolicitudes : respuestaSolicitudes?.requests || [];
          const ids = new Set(filtrados.map((v) => Number(idViaje(v))));
          aceptadas = todas.filter((s) =>
            ids.has(Number(s.viaje_id)) &&
            String(s.estado || "").toLowerCase() === "aceptada" &&
            Number(s.pasajero_id) > 0
          );

          // Revisar calificaciones persistidas, no solo estado temporal en React.
          const pasajeros = [...new Set(aceptadas.map((s) => Number(s.pasajero_id)))];
          const consultas = await Promise.allSettled(pasajeros.map((id) =>
            apiRequest(`/api/ratings/user/${id}`)
          ));
          pasajeros.forEach((pasajeroId, i) => {
            const consulta = consultas[i];
            const ratings = consulta.status === "fulfilled"
              ? consulta.value?.calificaciones || [] : null;
            aceptadas.filter((s) => Number(s.pasajero_id) === pasajeroId)
              .forEach((s) => {
                const viaje = filtrados.find((v) => Number(idViaje(v)) === Number(s.viaje_id));
                // Se verifica el conductor para no confundir una calificación
                // anterior de otro usuario con la del conductor actual.
                const conductorId = viaje?.conductor_id ?? viaje?.driver_id;
                const key = clave(s.viaje_id, s.pasajero_id);
                estados[key] = ratings === null || !conductorId ? "desconocido" :
                  ratings.some((r) => Number(r.viaje_id) === Number(s.viaje_id) &&
                    Number(r.calificador_id) === Number(conductorId) &&
                    Number(r.calificado_id) === pasajeroId)
                    ? "calificado" : "pendiente";
              });
          });
        }
        if (activo) {
          setViajes(filtrados);
          setSolicitudes(aceptadas);
          setVerificados(estados);
        }
      } catch (err) {
        if (activo) setError(err?.message || "No fue posible cargar tus viajes.");
      } finally {
        if (activo) setCargando(false);
      }
    }
    void cargar();
    return () => { activo = false; };
  }, [esCancelado, reintento]);

  function abrirCalificacion(viaje, solicitud) {
    setSeleccion({ viajeId: idViaje(viaje), pasajeroId: solicitud.pasajero_id,
      nombre: solicitud.pasajero_nombre || "Pasajero" });
    setPuntuacion(0);
    setComentario("");
    setErrorCalificacion("");
  }

  async function enviarCalificacion(event) {
    event.preventDefault();
    if (!seleccion || puntuacion < 1 || puntuacion > 5 || enviando) return;
    setEnviando(true);
    setErrorCalificacion("");
    try {
      await apiRequest("/api/ratings/passenger", {
        method: "POST",
        body: { viaje_id: seleccion.viajeId, pasajero_id: seleccion.pasajeroId,
          puntuacion, comentario: comentario.trim() || null },
      });
      setVerificados((prev) => ({ ...prev,
        [clave(seleccion.viajeId, seleccion.pasajeroId)]: "calificado" }));
      setSeleccion(null);
    } catch (err) {
      setErrorCalificacion(err?.message || "No se pudo registrar la calificación.");
      // Ante un duplicado informado por el servidor, recargar las calificaciones.
      if (err?.status === 409 || err?.statusCode === 409 || /ya has calificado/i.test(err?.message || "")) {
        setSeleccion(null);
        setReintento((n) => n + 1);
      }
    } finally {
      setEnviando(false);
    }
  }

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
        <p className="mb-8 mt-2 text-slate-600">{esCancelado ? "Consulta el historial de tus viajes cancelados." : "Consulta tus viajes finalizados y califica a tus pasajeros."}</p>
        {cargando ? (
          <Card><CardContent className="flex flex-col items-center py-16 text-center"><div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" /><p>Cargando viajes...</p></CardContent></Card>
        ) : error ? (
          <Card><CardContent className="flex flex-col items-center gap-4 py-14 text-center"><AlertTriangle className="text-red-600" size={32} /><p role="alert" className="text-red-700">{error}</p><Button onClick={() => setReintento((n) => n + 1)}>Reintentar</Button></CardContent></Card>
        ) : viajes.length === 0 ? (
          <Card className="border-dashed bg-white"><CardContent className="flex flex-col items-center py-16 text-center"><div className="mb-4 rounded-full bg-slate-100 p-4"><Icono size={32} className="text-slate-400" /></div><h2 className="text-lg font-semibold">{esCancelado ? "No tienes viajes cancelados" : "No tienes viajes completados"}</h2><p className="mt-2 max-w-md text-sm text-slate-500">{esCancelado ? "Cuando canceles un viaje, aparecerá aquí." : "Cuando finalices un viaje, aparecerá aquí."}</p><Button variant="outline" className="mt-6" onClick={onBack}>Volver a Mis Viajes</Button></CardContent></Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">{viajes.map((viaje) => {
            const id = idViaje(viaje);
            const pasajeros = solicitudes.filter((s) => Number(s.viaje_id) === Number(id));
            return (
              <Card key={id} className="border-slate-200 bg-white shadow-sm"><CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3"><span className="text-sm text-slate-500">Viaje #{id}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${esCancelado ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{esCancelado ? "Cancelado" : "Finalizado"}</span></div>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><MapPin size={20} className="text-indigo-600" />{viaje.origen || viaje.origin || "Origen no disponible"} → {viaje.destino || viaje.destination || "Destino no disponible"}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600"><span className="flex items-center gap-2"><CalendarDays size={16} />{String(viaje.fecha_salida || viaje.fecha || viaje.departure_date || "Fecha no disponible").slice(0, 10)}</span><span className="flex items-center gap-2"><Clock3 size={16} />{formatearHoraViaje(viaje.fecha_salida || viaje.fecha || viaje.departure_date, viaje.hora_salida || viaje.hora || viaje.departure_time)}</span></div>
                {esCancelado && viaje.motivo_cancelacion && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Motivo: {viaje.motivo_cancelacion}</p>}
                {!esCancelado && (
                  <section className="mt-5 border-t pt-4" aria-label={`Pasajeros del viaje ${id}`}>
                    <h3 className="mb-3 font-semibold text-slate-800">Pasajeros confirmados</h3>
                    {pasajeros.length === 0 ? <p className="text-sm text-slate-500">Este viaje no tiene pasajeros con reservación aceptada.</p> :
                      <div className="space-y-3">{pasajeros.map((s) => {
                        const estado = verificados[clave(id, s.pasajero_id)] || "desconocido";
                        return <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                          <div className="flex items-center gap-2"><UserRound size={19} className="text-slate-500" /><span className="text-sm font-medium">{s.pasajero_nombre || "Pasajero"}</span></div>
                          {estado === "calificado" ? <span className="text-sm font-semibold text-emerald-700">✓ Ya calificado</span> :
                            estado === "desconocido" ? <Button type="button" variant="outline" size="sm" onClick={() => setReintento((n) => n + 1)}>Reintentar verificación</Button> :
                              <Button type="button" size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => abrirCalificacion(viaje, s)}><Star size={16} /> Calificar pasajero</Button>}
                        </div>;
                      })}</div>}
                  </section>
                )}
              </CardContent></Card>
            );
          })}</div>
        )}
      </main>
      <Footer />
      {seleccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-calificacion" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="titulo-calificacion" className="text-xl font-bold">Calificar pasajero</h2><p className="mt-1 text-sm text-slate-500">{seleccion.nombre} · Viaje #{seleccion.viajeId}</p></div><button type="button" aria-label="Cerrar" disabled={enviando} onClick={() => setSeleccion(null)}><XCircle size={22} /></button></div>
            <form onSubmit={enviarCalificacion}>
              <p className="mb-2 text-sm font-semibold">Puntuación (obligatoria)</p>
              <div role="group" aria-label="Puntuación" className="mb-5 flex gap-2">{[1,2,3,4,5].map((n) => <button key={n} type="button" aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} aria-pressed={puntuacion === n} onClick={() => setPuntuacion(n)} className="rounded-lg p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"><Star size={29} className={n <= puntuacion ? "fill-amber-400 text-amber-400" : "text-slate-300"} /></button>)}</div>
              <label htmlFor="comentario-calificacion" className="mb-2 block text-sm font-semibold">Comentario (opcional)</label>
              <textarea id="comentario-calificacion" value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={500} rows={3} placeholder="Describe tu experiencia..." className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:outline-none" />
              <p className="mt-1 text-right text-xs text-slate-500">{comentario.length}/500</p>
              {errorCalificacion && <p role="alert" className="mt-3 text-sm text-red-700">{errorCalificacion}</p>}
              <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" disabled={enviando} onClick={() => setSeleccion(null)}>Cancelar</Button><Button type="submit" disabled={enviando || !puntuacion} className="bg-emerald-700 text-white hover:bg-emerald-800">{enviando ? "Enviando..." : "Enviar calificación"}</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
