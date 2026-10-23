import { useState } from "react";
import {
  BarChart3, ChevronRight, ClipboardList, LayoutDashboard, LogOut,
  Menu, Settings, ShieldCheck, UserRound, Users, X,
} from "lucide-react";
import Logo from "@/components/Logo";

// Estructura y navegación solamente. Los módulos funcionales son otros issues.
const secciones = [
  { id: "resumen", nombre: "Resumen", icono: LayoutDashboard, descripcion: "Vista general del panel administrativo." },
  { id: "usuarios", nombre: "Usuarios", icono: Users, descripcion: "Espacio reservado para la administración de usuarios." },
  { id: "viajes", nombre: "Viajes", icono: ClipboardList, descripcion: "Espacio reservado para la administración de viajes." },
  { id: "reportes", nombre: "Reportes", icono: BarChart3, descripcion: "Espacio reservado para los reportes del sistema." },
  { id: "configuracion", nombre: "Configuración", icono: Settings, descripcion: "Espacio reservado para la configuración administrativa." },
];

export default function Administracion({ onProfile, onLogout }) {
  const [seccionActiva, setSeccionActiva] = useState("resumen");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const seccion = secciones.find((item) => item.id === seccionActiva) ?? secciones[0];
  const Icono = seccion.icono;

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
            <div className="mt-6 rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-5">
              <p className="font-medium text-emerald-900">Estructura disponible</p>
              <p className="mt-1 text-sm text-emerald-800">La navegación está lista. El contenido y las operaciones de esta sección se implementarán en próximos sprints.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
