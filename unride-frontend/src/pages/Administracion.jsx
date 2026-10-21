import { ArrowLeft, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";

export default function Administracion({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Logo />
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft size={18} /> Volver
          </button>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <ShieldCheck className="mb-3 text-emerald-700" size={32} />
        <h1 className="text-3xl font-bold">Administración</h1>
        <p className="mt-2 text-slate-600">Módulo disponible únicamente para usuarios Administradores.</p>
      </main>
    </div>
  );
}
