
import { useState } from "react";
import { Search } from "lucide-react";

export default function BarraBusquedaFiltros({
  filtros = [],
  onConsultar,
  cargando = false,
  error = "",
  placeholder = "Buscar...",
  etiquetaBusqueda = "Buscar",
  campoBusqueda = "q",
}) {
  const [q, setQ] = useState("");
  const [valores, setValores] = useState({});

  const enviar = (event) => {
    event.preventDefault();

    const params = {
      [campoBusqueda]: q.trim(),
      ...valores,
    };

    const parametros = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== "" && value != null
      )
    );

    onConsultar?.(parametros);
  };

  const limpiar = () => {
    setQ("");
    setValores({});
    onConsultar?.({});
  };

  return (
    <form
      onSubmit={enviar}
      aria-label="Búsqueda y filtros"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-44 flex-1 text-sm font-medium text-slate-700">
          {etiquetaBusqueda}

          <span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 px-3">
            <Search size={18} className="text-slate-400" />

            <input
              type="text"
              className="w-full bg-transparent py-2 outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              disabled={cargando}
            />
          </span>
        </label>

        {filtros.map((filtro) => (
          <label
            key={filtro.key}
            className="min-w-36 flex-1 text-sm font-medium text-slate-700"
          >
            {filtro.titulo}

            {filtro.tipo === "fecha" ? (
              <input
                aria-label={filtro.titulo}
                type="date"
                value={valores[filtro.key] ?? ""}
                onChange={(e) =>
                  setValores((prev) => ({
                    ...prev,
                    [filtro.key]: e.target.value,
                  }))
                }
                disabled={cargando}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            ) : (
              <select
                aria-label={filtro.titulo}
                value={valores[filtro.key] ?? ""}
                onChange={(e) =>
                  setValores((prev) => ({
                    ...prev,
                    [filtro.key]: e.target.value,
                  }))
                }
                disabled={cargando}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">Todos</option>

                {(filtro.opciones ?? []).map((op) => (
                  <option key={op.valor} value={op.valor}>
                    {op.etiqueta}
                  </option>
                ))}
              </select>
            )}
          </label>
        ))}

        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {cargando ? "Consultando..." : "Consultar"}
        </button>

        <button
          type="button"
          disabled={cargando}
          onClick={limpiar}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
        >
          Limpiar
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
