import { useState } from "react";

import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Car,
  XCircle,
} from "lucide-react";
import Logo from "@/components/Logo";
import "../styles/Notificaciones.css";

export default function Notificaciones({ onVolver }) {
  const [notificaciones, setNotificaciones] = useState([
    {
      id: 1,
      tipo: "success",
      titulo: "Reserva confirmada",
      mensaje:
        "Tu lugar para el viaje de Universidad Autónoma de Coahuila a Plaza de Armas ha sido confirmado.",
      tiempo: "Ahora",
      leida: false,
    },
    {
      id: 2,
      tipo: "warning",
      titulo: "Tu viaje comienza pronto",
      mensaje:
        "Tu viaje comienza a las 08:00 AM. Recuerda llegar con anticipación al punto de encuentro.",
      tiempo: "Hace 1 h",
      leida: false,
    },
    {
      id: 3,
      tipo: "info",
      titulo: "Viaje completado",
      mensaje:
        "Tu viaje ha finalizado correctamente. Gracias por usar UniRide.",
      tiempo: "Ayer",
      leida: true,
    },
    {
      id: 4,
      tipo: "error",
      titulo: "Viaje cancelado",
      mensaje:
        "El conductor canceló el viaje programado. Puedes buscar otra opción disponible.",
      tiempo: "Hace 2 días",
      leida: true,
    },
  ]);

  const [notificacionSeleccionada, setNotificacionSeleccionada] =
  useState(null);

  const iconoNotificacion = (tipo) => {
    if (tipo === "success") {
      return <CheckCircle2 size={22} />;
    }

    if (tipo === "warning") {
      return <Clock size={22} />;
    }

    if (tipo === "error") {
      return <XCircle size={22} />;
    }

    return <Car size={22} />;
  };

  const marcarTodasComoLeidas = () => {
    setNotificaciones((actuales) =>
      actuales.map((notificacion) => ({
        ...notificacion,
        leida: true,
      }))
    );
  };

  const marcarComoLeida = (id) => {
    setNotificaciones((actuales) =>
      actuales.map((notificacion) =>
        notificacion.id === id
          ? {
              ...notificacion,
              leida: true,
            }
          : notificacion
      )
    );
  };

  const hayNoLeidas = notificaciones.some(
    (notificacion) => !notificacion.leida
  );

  return (
    <div className="notificaciones-page">
      <header className="notificaciones-navbar">
        <Logo />

        <button
          type="button"
          className="notificaciones-volver"
          onClick={onVolver}
        >
          <ArrowLeft size={18} />
          Volver
        </button>
      </header>

      <main className="notificaciones-container">
        <section className="notificaciones-header">
          <div>
            <p className="notificaciones-eyebrow">
              CENTRO DE NOTIFICACIONES
            </p>

            <h1>Notificaciones</h1>

            <p>
              Mantente al día con tus reservas y próximos viajes.
            </p>
          </div>

          {hayNoLeidas && (
            <button
              type="button"
              className="notificaciones-marcar"
              onClick={marcarTodasComoLeidas}
            >
              Marcar todas como leídas
            </button>
          )}
        </section>

        <section className="notificaciones-lista">
          {notificaciones.map((notificacion) => (
            <article
              key={notificacion.id}
              className={`notificacion-card ${
                notificacion.leida
                  ? "notificacion-leida"
                  : "notificacion-no-leida"
              }`}
            >
              <div
                className={`notificacion-icono ${notificacion.tipo}`}
              >
                {iconoNotificacion(notificacion.tipo)}
              </div>

              <div className="notificacion-contenido">
                <div className="notificacion-top">
                  <div>
                    <h2>
                      {notificacion.titulo}
                    </h2>

                    {!notificacion.leida && (
                      <span className="notificacion-nueva">
                        Nueva
                      </span>
                    )}
                  </div>

                  <span className="notificacion-tiempo">
                    {notificacion.tiempo}
                  </span>
                </div>

                <p>
                  {notificacion.mensaje}
                </p>

                <button
                  type="button"
                  className="notificacion-link"
                  onClick={() => {
                    marcarComoLeida(notificacion.id);
                    setNotificacionSeleccionada(notificacion);
                  }}
                >
                  Ver detalles →
                </button>
              </div>
            </article>
          ))}
        </section>


        {notificacionSeleccionada && (
        <div className="notificacion-modal-overlay">
          <div className="notificacion-modal">
            <button
              type="button"
              className="notificacion-modal-cerrar"
              onClick={() => setNotificacionSeleccionada(null)}
            >
              ×
            </button>

            <div
              className={`notificacion-icono ${notificacionSeleccionada.tipo}`}
            >
              {iconoNotificacion(notificacionSeleccionada.tipo)}
            </div>

            <h2>
              {notificacionSeleccionada.titulo}
            </h2>

            <p>
              {notificacionSeleccionada.mensaje}
            </p>

            <span className="notificacion-modal-tiempo">
              {notificacionSeleccionada.tiempo}
            </span>

            <button
              type="button"
              className="notificacion-modal-boton"
              onClick={() => setNotificacionSeleccionada(null)}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
        <div className="notificaciones-empty-info">
          <Bell size={18} />

          <span>
            Las nuevas notificaciones aparecerán aquí.
          </span>
        </div>
      </main>
    </div>
  );
}