import {
  CheckCircle2,
  CalendarDays,
  Clock,
  MapPin,
} from "lucide-react";

import "../styles/ReservaConfirmada.css";

function ReservaConfirmada({
  viaje,
  onCerrar,
  onIrMisViajes,
}) {
  if (!viaje) return null;

  return (
    <div className="confirmacion-overlay">
      <div className="confirmacion-modal">
        <div className="confirmacion-icono">
          <CheckCircle2 size={38} />
        </div>

        <p className="confirmacion-etiqueta">
          RESERVA CONFIRMADA
        </p>

        <h2>¡Tu lugar está reservado!</h2>

        <p className="confirmacion-descripcion">
          Tu reserva se realizó correctamente.
          Ya puedes consultar este viaje desde
          la sección Mis viajes.
        </p>

        <div className="confirmacion-viaje">
          <div className="confirmacion-ruta">
            <MapPin size={19} />

            <div>
              <span>Ruta</span>

              <strong>
                {viaje.origen} → {viaje.destino}
              </strong>
            </div>
          </div>

          <div className="confirmacion-detalles">
            <div>
              <CalendarDays size={18} />

              <span>
                {viaje.fecha || "Fecha del viaje"}
              </span>
            </div>

            <div>
              <Clock size={18} />

              <span>
                {viaje.hora || "Hora del viaje"}
              </span>
            </div>
          </div>
        </div>

        <div className="confirmacion-total">
          <span>Total</span>

          <strong>
            ${viaje.precio * (viaje.lugares || 1)}
          </strong>
        </div>

        <button
          type="button"
          className="confirmacion-principal"
          onClick={onIrMisViajes}
        >
          Ver mis viajes
        </button>

        <button
          type="button"
          className="confirmacion-secundario"
          onClick={onCerrar}
        >
          Volver a buscar viajes
        </button>
      </div>
    </div>
  );
}

export default ReservaConfirmada;