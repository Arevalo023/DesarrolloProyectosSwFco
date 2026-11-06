import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCcw, MapPin, Car, User, Users } from "lucide-react";
import { apiRequest } from "@/services/api";

const mostrar = (valor) =>
  valor === null || valor === undefined || valor === "" ? "—" : valor;

const fecha = (valor) => {
  if (!valor) return "—";

  const d = new Date(valor);

  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-MX");
};

const dinero = (valor) => {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
      })
    : "—";
};

const normalizarEstado = (estado) => {
  const estados = {
    programado: "Programado",
    en_curso: "En curso",
    activo: "Activo",
    cancelado: "Cancelado",
    finalizado: "Finalizado",
    completado: "Completado",
    pendiente: "Pendiente",
  };

  return estados[String(estado || "").toLowerCase()] || mostrar(estado);
};

function Campo({ titulo, valor }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {titulo}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {mostrar(valor)}
      </p>
    </div>
  );
}

function Seccion({ titulo, icono, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
        {icono}
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export default function VistaDetalleViaje({ viaje, onVolver }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let activo = true;

    async function obtenerDetalle() {
      setCargando(true);
      setError("");

      try {
        const respuesta = await apiRequest(
          `/api/trips/admin/${encodeURIComponent(viaje.id)}`
        );

        if (!activo) return;

        const resultado =
          respuesta?.viaje ??
          respuesta?.data?.viaje ??
          respuesta?.trip ??
          respuesta?.data ??
          null;

        if (!resultado) {
          throw new Error("El servidor no devolvió el detalle del viaje.");
        }

        setDetalle(resultado);
      } catch (e) {
        if (activo) {
          setDetalle(null);
          setError(e.message || "No se pudo consultar el detalle del viaje.");
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    obtenerDetalle();

    return () => {
      activo = false;
    };
  }, [viaje.id, reintento]);

  const reintentar = () => {
    setCargando(true);
    setReintento((n) => n + 1);
  };

  const conductor = detalle?.conductor ?? {};
  const vehiculo = detalle?.vehiculo ?? {};
  const reservaciones = Array.isArray(detalle?.reservaciones)
    ? detalle.reservaciones
    : [];

  return (
    <div className="mt-6 space-y-5">
      <button
        type="button"
        onClick={onVolver}
        className="inline-flex items-center gap-2 font-medium text-emerald-700 hover:underline"
      >
        <ArrowLeft size={18} />
        Volver a viajes
      </button>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Detalle administrativo</p>
            <h2 className="text-2xl font-bold text-slate-900">
              Viaje #{viaje.id}
            </h2>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
            {normalizarEstado(detalle?.estado ?? viaje.estado)}
          </span>
        </div>

        <div className="mt-5">
          {cargando ? (
            <p role="status" className="text-sm text-slate-500">
              Cargando detalle del viaje...
            </p>
          ) : error ? (
            <div role="alert" className="space-y-3 text-sm text-red-700">
              <p>{error}</p>
              <button
                type="button"
                onClick={reintentar}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2"
              >
                <RefreshCcw size={16} />
                Reintentar
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Campo titulo="Fecha de salida" valor={fecha(detalle.fecha_salida)} />
              <Campo titulo="Estado" valor={normalizarEstado(detalle.estado)} />
              <Campo titulo="Costo por pasajero" valor={dinero(detalle.costo_por_pasajero)} />
              <Campo titulo="Asientos disponibles" valor={detalle.asientos_disponibles ?? detalle.cupo_disponible} />
              <Campo titulo="Total de reservaciones" valor={reservaciones.length} />
              <Campo titulo="Motivo de cancelación" valor={detalle.motivo_cancelacion} />
            </div>
          )}
        </div>
      </section>

      {!cargando && !error && detalle && (
        <>
          <Seccion titulo="Ruta del viaje" icono={<MapPin size={20} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo titulo="Origen" valor={detalle.origen} />
              <Campo titulo="Destino" valor={detalle.destino} />
            </div>
          </Seccion>

          <Seccion titulo="Información del conductor" icono={<User size={20} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                titulo="Nombre"
                valor={conductor.nombre_completo || detalle.conductor_nombre}
              />
              <Campo
                titulo="ID del conductor"
                valor={conductor.id ?? detalle.conductor_id}
              />
              <Campo
                titulo="Correo"
                valor={conductor.correo ?? detalle.conductor_correo}
              />
              <Campo
                titulo="Teléfono"
                valor={conductor.telefono ?? detalle.conductor_telefono}
              />
            </div>
          </Seccion>

          <Seccion titulo="Información del vehículo" icono={<Car size={20} />}>
            {detalle.vehiculo_id ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Campo titulo="Marca" valor={vehiculo.marca ?? detalle.vehiculo_marca} />
                <Campo titulo="Modelo" valor={vehiculo.modelo ?? detalle.vehiculo_modelo} />
                <Campo titulo="Año" valor={vehiculo.anio} />
                <Campo titulo="Color" valor={vehiculo.color} />
                <Campo titulo="Placa" valor={vehiculo.placa ?? detalle.vehiculo_placa} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Este viaje no tiene un vehículo asociado.
              </p>
            )}
          </Seccion>

          <Seccion
            titulo={`Reservaciones (${reservaciones.length})`}
            icono={<Users size={20} />}
          >
            {reservaciones.length === 0 ? (
              <p className="text-sm text-slate-500">
                Este viaje todavía no tiene reservaciones registradas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Pasajero</th>
                      <th className="px-4 py-3">Correo</th>
                      <th className="px-4 py-3">Teléfono</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Solicitud</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservaciones.map((r) => {
                      const pasajero = r.pasajero ?? {};

                      return (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">{r.id}</td>
                          <td className="px-4 py-3">
                            {pasajero.nombre_completo || r.pasajero_nombre || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {mostrar(pasajero.correo ?? r.pasajero_correo)}
                          </td>
                          <td className="px-4 py-3">
                            {mostrar(pasajero.telefono ?? r.pasajero_telefono)}
                          </td>
                          <td className="px-4 py-3">
                            {normalizarEstado(r.estado)}
                          </td>
                          <td className="px-4 py-3">
                            {fecha(r.fecha_solicitud)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </>
      )}
    </div>
  );
}