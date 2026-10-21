import { useEffect, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import Logo from "@/components/Logo";
import { apiRequest } from "@/services/api";

export function FormularioCalificacion({ viajeId, pasajeroId, conductor = false }) {
  const [puntuacion, setPuntuacion] = useState("");
  const [comentario, setComentario] = useState("");
  const [estado, setEstado] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (event) => {
    event.preventDefault();
    setEnviando(true);
    setEstado("");
    try {
      await apiRequest(conductor ? "/api/ratings/passenger" : "/api/ratings/driver", {
        method: "POST",
        body: { viaje_id: viajeId, pasajero_id: conductor ? pasajeroId : undefined, puntuacion: Number(puntuacion), comentario },
      });
      setEstado("Calificación enviada correctamente.");
      setPuntuacion("");
      setComentario("");
    } catch (error) {
      setEstado(error.message || "No se pudo enviar la calificación.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold">{conductor ? "Calificar pasajero" : "Calificar conductor"}</h2>
      <label className="mb-3 block text-sm">
        Puntuación
        <select aria-label="Puntuación" value={puntuacion} onChange={(event) => setPuntuacion(event.target.value)} required className="mt-1 block w-full rounded border p-2">
          <option value="">Selecciona una puntuación</option>
          {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
        </select>
      </label>
      <label className="mb-3 block text-sm">
        Comentario
        <textarea value={comentario} onChange={(event) => setComentario(event.target.value)} maxLength={500} className="mt-1 block w-full rounded border p-2" />
      </label>
      <button type="submit" disabled={enviando} className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">
        {enviando ? "Enviando..." : "Enviar calificación"}
      </button>
      {estado && <p role="status" className="mt-3 text-sm">{estado}</p>}
    </form>
  );
}

export default function Calificaciones({ user, onBack }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    apiRequest(`/api/ratings/user/${user?.id}`)
      .then((respuesta) => { if (!cancelado) setDatos(respuesta); })
      .catch((requestError) => { if (!cancelado) setError(requestError.message || "No se pudieron cargar las calificaciones."); });
    return () => { cancelado = true; };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between"><Logo /><button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-600"><ArrowLeft size={18} /> Volver</button></div>
      </nav>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-bold">Mis calificaciones</h1>
        {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
        {!error && !datos && <p role="status" className="mt-4">Cargando calificaciones...</p>}
        {datos && (
          <>
            <div className="mt-6 flex items-center gap-3 rounded-xl border bg-white p-5">
              <Star className="fill-amber-400 text-amber-400" />
              <strong className="text-2xl">{datos.promedio ?? "0.00"}</strong>
              <span className="text-slate-500">({datos.total_calificaciones || 0} calificaciones)</span>
            </div>
            {datos.calificaciones?.length ? (
              <ul className="mt-5 space-y-3">{datos.calificaciones.map((calificacion) => <li key={calificacion.id} className="rounded-xl border bg-white p-4"><strong>{calificacion.puntuacion}/5</strong><p className="mt-1 text-slate-600">{calificacion.comentario || "Sin comentario"}</p></li>)}</ul>
            ) : <p className="mt-5 rounded-xl border border-dashed bg-white p-6 text-slate-600">Aún no tienes calificaciones.</p>}
          </>
        )}
      </main>
    </div>
  );
}
