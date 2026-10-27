import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

/** Paginación controlada por el padre (compatible con paginación del servidor). */
export default function TablaPaginada({ columnas = [], datos = [], pagina = 1, porPagina = 20, total = 0, onPaginaChange, cargando = false, error = "", onReintentar, mensajeVacio = "No hay resultados." }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const actual = Math.min(Math.max(1, pagina), paginas);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-700"><tr>{columnas.map((col) => <th key={col.key} scope="col" className="px-4 py-3 font-semibold">{col.titulo}</th>)}</tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={Math.max(columnas.length, 1)} className="px-4 py-12 text-center"><span role="status" className="inline-flex items-center gap-2 text-slate-500"><LoaderCircle className="animate-spin" size={18}/> Cargando datos...</span></td></tr> :
              error ? <tr><td colSpan={Math.max(columnas.length, 1)} className="px-4 py-10 text-center text-red-700" role="alert">{error}{onReintentar && <button type="button" onClick={onReintentar} className="ml-3 underline">Reintentar</button>}</td></tr> :
              datos.length === 0 ? <tr><td colSpan={Math.max(columnas.length, 1)} className="px-4 py-12 text-center text-slate-500">{mensajeVacio}</td></tr> :
              datos.map((fila, index) => <tr key={fila.id ?? index} className="border-t border-slate-100 hover:bg-slate-50">{columnas.map((col) => <td key={col.key} className="px-4 py-3 text-slate-700">{col.render ? col.render(fila) : String(fila[col.key] ?? "—")}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
        <span className="text-slate-500">{total} registros · Página {actual} de {paginas}</span>
        <nav aria-label="Paginación" className="flex items-center gap-2">
          <button type="button" aria-label="Página anterior" onClick={() => onPaginaChange?.(actual - 1)} disabled={cargando || actual <= 1} className="rounded-lg border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={18}/></button>
          <button type="button" aria-label="Página siguiente" onClick={() => onPaginaChange?.(actual + 1)} disabled={cargando || actual >= paginas} className="rounded-lg border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18}/></button>
        </nav>
      </div>
    </div>
  );
}
