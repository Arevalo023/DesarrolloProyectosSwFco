import { useEffect, useState } from "react";
import {
  BarChart3, ChevronRight, ClipboardList, LayoutDashboard, LogOut,
  Menu, ShieldCheck, UserRound, Users, X,
} from "lucide-react";
import Logo from "@/components/Logo";
import ListadoAdministrativo from "@/components/admin/ListadoAdministrativo";
import { apiRequest } from "@/services/api";

const secciones = [
  { id: "resumen", nombre: "Resumen", icono: LayoutDashboard, descripcion: "Vista general del panel administrativo." },
  { id: "usuarios", nombre: "Usuarios", icono: Users, descripcion: "Consulta y búsqueda de usuarios registrados." },
  { id: "viajes", nombre: "Viajes", icono: ClipboardList, descripcion: "Consulta de viajes registrados." },
];

const metricas = [
  { key: "usuarios", label: "Usuarios registrados", shortLabel: "Usuarios", icon: Users, color: "#047857" },
  { key: "viajes", label: "Viajes registrados", shortLabel: "Viajes", icon: ClipboardList, color: "#2563eb" },
  { key: "reservaciones", label: "Reservaciones", shortLabel: "Reservaciones", icon: BarChart3, color: "#d97706" },
];

function GraficaComparativa({ datos }) {
  const maximo = Math.max(1, ...datos.map(({ valor }) => valor));

  return (
    <section
      aria-label="Gráfica comparativa de métricas"
      className="rounded-xl border border-slate-200 p-5"
    >
      <h3 className="font-semibold text-slate-900">Volumen por categoría</h3>
      <div className="mt-5 space-y-5">
        {datos.map(({ key, label, valor, color }) => (
          <div key={key}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-600">{label}</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {valor.toLocaleString("es-MX")}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={maximo}
              aria-valuenow={valor}
              className="h-3 overflow-hidden rounded-full bg-slate-100"
            >
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${(valor / maximo) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GraficaDistribucion({ datos }) {
  const total = datos.reduce((suma, { valor }) => suma + valor, 0);
  const radio = 42;
  const circunferencia = 2 * Math.PI * radio;
  let desplazamiento = 0;

  return (
    <section
      aria-label="Gráfica de distribución de métricas"
      className="rounded-xl border border-slate-200 p-5"
    >
      <h3 className="font-semibold text-slate-900">Distribución del total</h3>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
        <svg
          role="img"
          aria-label={
            total
              ? `Distribución de ${total.toLocaleString("es-MX")} registros`
              : "Sin registros para mostrar"
          }
          viewBox="0 0 100 100"
          className="h-36 w-36 shrink-0"
        >
          <circle
            cx="50"
            cy="50"
            r={radio}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
          />
          {total > 0 &&
            datos.map(({ key, valor, color }) => {
              const longitud = (valor / total) * circunferencia;
              const segmento = (
                <circle
                  key={key}
                  cx="50"
                  cy="50"
                  r={radio}
                  fill="none"
                  stroke={color}
                  strokeWidth="12"
                  strokeDasharray={`${longitud} ${circunferencia - longitud}`}
                  strokeDashoffset={-desplazamiento}
                  transform="rotate(-90 50 50)"
                />
              );
              desplazamiento += longitud;
              return segmento;
            })}
          <text
            x="50"
            y="48"
            textAnchor="middle"
            className="fill-slate-900 text-[13px] font-bold"
          >
            {total.toLocaleString("es-MX")}
          </text>
          <text
            x="50"
            y="61"
            textAnchor="middle"
            className="fill-slate-500 text-[7px]"
          >
            registros
          </text>
        </svg>
        <ul className="w-full space-y-3 sm:max-w-52">
          {datos.map(({ key, shortLabel, valor, color }) => (
            <li key={key} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {shortLabel}
              </span>
              <span className="font-medium tabular-nums text-slate-900">
                {total
                  ? `${((valor / total) * 100).toLocaleString("es-MX", {
                      maximumFractionDigits: 1,
                    })}%`
                  : "0%"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Administracion({ onProfile, onLogout }) {
  const [seccionActiva, setSeccionActiva] = useState("resumen");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [errorResumen, setErrorResumen] = useState("");
  const [reintento, setReintento] = useState(0);
  const seccion = secciones.find((item) => item.id === seccionActiva) ?? secciones[0];
  const Icono = seccion.icono;
  const datosGrafica = metricas.map((metrica) => ({
    ...metrica,
    valor: Math.max(0, Number(resumen?.[metrica.key]) || 0),
  }));

  useEffect(() => {
    let activo = true;

    apiRequest("/api/admin/summary")
      .then((respuesta) => {
        if (activo) setResumen(respuesta.metricas ?? respuesta);
      })
      .catch((error) => {
        if (activo) setErrorResumen(error.message || "No se pudo cargar el resumen administrativo.");
      })
      .finally(() => {
        if (activo) setCargandoResumen(false);
      });

    return () => {
      activo = false;
    };
  }, [reintento]);

  const cambiarSeccion = (id) => {
    setSeccionActiva(id);
    setMenuAbierto(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden border-l border-slate-200 pl-4 text-sm font-semibold text-emerald-700 sm:block">Panel de administración</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              <LogOut size={18} /> Cerrar sesión
            </button>
            <button type="button" aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuAbierto} onClick={() => setMenuAbierto((valor) => !valor)} className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden">
              {menuAbierto ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row">
        <aside aria-label="Navegación de administración" className={`${menuAbierto ? "block" : "hidden"} w-full shrink-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:block md:w-64`}>
          <p className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Menú administrativo</p>
          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setMenuAbierto(false);
                onProfile?.();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <UserRound size={19} /> <span className="flex-1">Mi perfil</span>
            </button>
            {secciones.map((item) => {
              const ItemIcon = item.icono;
              const activo = seccionActiva === item.id;
              return (
                <button key={item.id} type="button" aria-current={activo ? "page" : undefined} onClick={() => cambiarSeccion(item.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${activo ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                  <ItemIcon size={19} /> <span className="flex-1">{item.nombre}</span> {activo && <ChevronRight size={16} />}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 flex items-start gap-4">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-800"><ShieldCheck size={28} /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Administración</h1>
              <p className="mt-1 text-sm text-slate-600">Área exclusiva para usuarios con rol Administrador.</p>
            </div>
          </div>
          <section aria-labelledby="titulo-seccion" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-slate-100 p-2 text-slate-700"><Icono size={23} /></span>
              <h2 id="titulo-seccion" className="text-xl font-semibold">{seccion.nombre}</h2>
            </div>
            <p className="mt-4 text-slate-600">{seccion.descripcion}</p>
            {seccionActiva === "resumen" && (
              <div className="mt-6">
                {cargandoResumen ? (
                  <p role="status" className="py-8 text-center text-slate-500">Cargando resumen...</p>
                ) : errorResumen ? (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    <p>{errorResumen}</p>
                    <button type="button" className="mt-3 underline" onClick={() => setReintento((valor) => valor + 1)}>Reintentar</button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {metricas.map(({ key, label, icon: MetricIcon }) => (
                        <button key={key} type="button" onClick={() => key === "usuarios" ? cambiarSeccion("usuarios") : key === "viajes" ? cambiarSeccion("viajes") : undefined} className="rounded-xl border border-slate-200 p-5 text-left transition hover:border-emerald-300 hover:bg-emerald-50">
                          <MetricIcon className="text-emerald-700" size={24} />
                          <p className="mt-4 text-sm text-slate-500">{label}</p>
                          <p className="mt-1 text-3xl font-bold text-slate-900">{Number(resumen?.[key] ?? 0).toLocaleString("es-MX")}</p>
                        </button>
                      ))}
                    </div>
                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                      <GraficaComparativa datos={datosGrafica} />
                      <GraficaDistribucion datos={datosGrafica} />
                    </div>
                  </>
                )}
              </div>
            )}
            {(seccionActiva === "usuarios" || seccionActiva === "viajes") && <ListadoAdministrativo key={seccionActiva} tipo={seccionActiva} />}
          </section>
        </main>
      </div>
    </div>
  );
}
