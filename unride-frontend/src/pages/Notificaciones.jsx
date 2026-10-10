import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Car,
  XCircle,
} from "lucide-react";
import Logo from "@/components/Logo";
import { apiRequest } from "@/services/api";
import "../styles/Notificaciones.css";

export default function Notificaciones({ onVolver }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionSeleccionada, setNotificacionSeleccionada] =
    useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    apiRequest("/api/notifications")
      .then((data) => {
        if (!cancelado) setNotificaciones(data.notifications || []);
      })
      .catch((requestError) => {
        if (!cancelado) setError(requestError.message || "No se pudieron cargar las notificaciones.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const iconoNotificacion = (tipo) => {
    if (tipo === "reserva_aceptada") {
      return <CheckCircle2 size={22} />;
    }

    if (tipo === "reserva_solicitada") {
      return <Clock size={22} />;
    }

    if (tipo === "reserva_rechazada") {
      return <XCircle size={22} />;
    }

    return <Car size={22} />;
  };

  const marcarTodasComoLeidas = async () => {
    setActualizando(true);
    setError("");
    try {
      await apiRequest("/api/notifications/read-all", { method: "PATCH" });
      setNotificaciones((actuales) => actuales.map((notificacion) => ({ ...notificacion, leida: true })));
    } catch (requestError) {
      setError(requestError.message || "No se pudieron actualizar las notificaciones.");
    } finally {
      setActualizando(false);
    }
  };

  const marcarComoLeida = async (id) => {
    setError("");
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotificaciones((actuales) => actuales.map((notificacion) =>
        notificacion.id === id ? { ...notificacion, leida: true } : notificacion
      ));
    } catch (requestError) {
      setError(requestError.message || "No se pudo actualizar la notificación.");
    }
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
              disabled={actualizando}
            >
              {actualizando ? "Actualizando..." : "Marcar todas como leídas"}
            </button>
          )}
        </section>

        {error && <p role="alert" className="notificaciones-error">{error}</p>}

        <section className="notificaciones-lista">
          {cargando && <p role="status">Cargando notificaciones...</p>}
          {!cargando && !error && notificaciones.length === 0 && (
            <p className="notificaciones-empty-info">No tienes notificaciones todavía.</p>
          )}
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
                className={`notificacion-icono ${notificacion.tipo === "reserva_aceptada" ? "success" : notificacion.tipo === "reserva_rechazada" ? "error" : "warning"}`}
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
                    {notificacion.fecha_creacion
                      ? new Date(notificacion.fecha_creacion).toLocaleString()
                      : ""}
                  </span>
                </div>

                <p>
                  {notificacion.mensaje}
                </p>

                <button
                  type="button"
                  className="notificacion-link"
                  onClick={async () => {
                    if (!notificacion.leida) await marcarComoLeida(notificacion.id);
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
              className={`notificacion-icono ${notificacionSeleccionada.tipo === "reserva_aceptada" ? "success" : notificacionSeleccionada.tipo === "reserva_rechazada" ? "error" : "warning"}`}
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
              {notificacionSeleccionada.fecha_creacion
                ? new Date(notificacionSeleccionada.fecha_creacion).toLocaleString()
                : ""}
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