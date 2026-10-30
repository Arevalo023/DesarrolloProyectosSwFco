
import { useEffect, useState } from "react";
import { ArrowLeft, Star, RefreshCcw } from "lucide-react";
import { apiRequest } from "@/services/api";

const fecha = (valor) => {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-MX");
};

function Seccion({
  titulo,
  cargando = false,
  error = "",
  onReintentar,
  children,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        {titulo}
      </h3>

      {cargando ? (
        <p role="status" className="text-sm text-slate-500">
          Cargando información...
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 text-sm text-red-700">
          <p>{error}</p>

          {onReintentar && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2"
              onClick={onReintentar}
            >
              <RefreshCcw size={16} />
              Reintentar
            </button>
          )}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/**
 * HU-11: Detalle administrativo del usuario.
 * No modifica información de la base de datos.
 */
export default function VistaDetalleUsuario({
  usuario,
  onVolver,
}) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let activo = true;

    async function obtener() {
      try {
        const respuesta = await apiRequest(`/users/${encodeURIComponent(usuario.id)}`);

        if (!activo) return;

        setDetalle(respuesta);

        setError("");
      } catch (e) {
        if (activo) {
          setError(
            e.message ||
              "No se pudieron consultar las calificaciones."
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    obtener();

    return () => {
      activo = false;
    };
  }, [usuario.id, reintento]);

  const reintentar = () => {
    setCargando(true);
    setReintento((n) => n + 1);
  };

  const nombre =
    [usuario.nombre, usuario.apellido]
      .filter(Boolean)
      .join(" ") || `Usuario #${usuario.id}`;

  const datosUsuario = detalle?.usuario ?? usuario;
  const calificaciones = detalle?.reputacion?.calificaciones ?? [];
  const promedio = detalle?.reputacion?.promedio ?? null;
  const roles = Array.isArray(datosUsuario.roles)
    ? datosUsuario.roles.join(", ")
    : datosUsuario.rol_nombre ||
      ({ 1: "Pasajero", 2: "Conductor", 3: "Administrador" }[
        datosUsuario.rol_id
      ] ?? "—");

  return (
    <div className="mt-6 space-y-5">
      <button
        type="button"
        className="inline-flex items-center gap-2 font-medium text-emerald-700 hover:underline"
        onClick={onVolver}
      >
        <ArrowLeft size={18} />
        Volver a usuarios
      </button>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">
          {nombre}
        </h3>

        <p className="mt-1 break-all text-sm text-slate-600">
          {datosUsuario.correo}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          ID: {datosUsuario.id} · Rol: {roles}
        </p>
      </section>

      <Seccion
        titulo="Reputación del usuario"
        cargando={cargando}
        error={error}
        onReintentar={reintentar}
      >
        {promedio === null ? (
          <p className="text-sm text-slate-500">
            Sin datos: este usuario todavía no tiene calificaciones.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <Star
              size={28}
              className="fill-amber-400 text-amber-400"
            />

            <span className="text-3xl font-bold">
              {promedio.toFixed(1)} / 5
            </span>

            <span className="text-sm text-slate-500">
              ({calificaciones.length} calificaciones)
            </span>
          </div>
        )}
      </Seccion>

      <Seccion
        titulo="Calificaciones recibidas"
        cargando={cargando}
        error={error}
        onReintentar={reintentar}
      >
        {calificaciones.length === 0 ? (
          <p className="text-sm text-slate-500">
            Sin datos: no hay calificaciones recibidas.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {calificaciones.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="text-slate-900">
                    {c.puntuacion} / 5 ★
                  </strong>

                  <span className="text-xs text-slate-500">
                    {fecha(c.fecha_creacion)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-700">
                  {c.comentario || "Sin comentario"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Calificado por:{" "}
                  {c.calificador_nombre || "Usuario"} · Viaje #
                  {c.viaje_id}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Viajes del usuario">
        <p className="text-sm text-slate-600">{detalle?.viajes?.length ?? 0} viajes publicados.</p>
      </Seccion>

      <Seccion titulo="Reservaciones del usuario">
        <p className="text-sm text-slate-600">{detalle?.reservaciones?.length ?? 0} reservaciones registradas.</p>
      </Seccion>
    </div>
  );
}
