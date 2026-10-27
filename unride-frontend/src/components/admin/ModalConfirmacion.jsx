
import { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";

/**
 * Modal de confirmación reutilizable.
 * onConfirmar recibe el motivo.
 * El componente padre decide qué acción ejecutar.
 */
export default function ModalConfirmacion({
  abierto = false,
  titulo = "Confirmar acción",
  mensaje = "¿Deseas continuar?",
  requiereMotivo = false,
  onConfirmar,
  onCerrar,
  cargando = false,
  error = "",
}) {
  // Al cerrar, se desmonta el contenido.
  // Al abrir nuevamente, el motivo comienza vacío.
  if (!abierto) return null;

  return (
    <ContenidoModal
      titulo={titulo}
      mensaje={mensaje}
      requiereMotivo={requiereMotivo}
      onConfirmar={onConfirmar}
      onCerrar={onCerrar}
      cargando={cargando}
      error={error}
    />
  );
}

function ContenidoModal({
  titulo,
  mensaje,
  requiereMotivo,
  onConfirmar,
  onCerrar,
  cargando,
  error,
}) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !cargando) {
        onCerrar?.();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [cargando, onCerrar]);

  const cerrar = () => {
    if (cargando) return;
    onCerrar?.();
  };

  const confirmar = () => {
    if (cargando) return;

    const motivoLimpio = motivo.trim();

    if (requiereMotivo && !motivoLimpio) {
      return;
    }

    onConfirmar?.(motivoLimpio);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          cerrar();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-confirmacion-titulo"
        aria-describedby="modal-confirmacion-mensaje"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="modal-confirmacion-titulo"
            className="text-xl font-bold text-slate-900"
          >
            {titulo}
          </h2>

          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={cerrar}
            disabled={cargando}
          >
            <X size={20} />
          </button>
        </div>

        <p
          id="modal-confirmacion-mensaje"
          className="mt-3 text-sm text-slate-600"
        >
          {mensaje}
        </p>

        {requiereMotivo && (
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Motivo <span aria-hidden="true">*</span>

            <textarea
              autoFocus
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={250}
              disabled={cargando}
              aria-required="true"
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              placeholder="Escribe el motivo de esta acción"
            />

            <span className="text-xs text-slate-500">
              {motivo.length}/250
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={cerrar}
            disabled={cargando}
            className="rounded-lg border border-slate-300 px-4 py-2"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={confirmar}
            disabled={
              cargando || (requiereMotivo && !motivo.trim())
            }
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {cargando && (
              <LoaderCircle
                size={16}
                className="animate-spin"
              />
            )}

            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
