import { useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Car,
  UserRound,
  Users,
  CheckCircle2,
} from "lucide-react";
import Logo from "@/components/Logo";
import ReservaConfirmada from "../components/ReservaConfirmada";
import "../styles/ResumenReserva.css";

export default function ResumenReserva({
  viaje,
  onVolver,
  onConfirmar,
  onIrMisViajes,
}) {
  const [reservaConfirmada, setReservaConfirmada] = useState(false);

  const viajeActual = viaje || {};

  const origen =
    viajeActual.origen ||
    "Origen no disponible";

  const destino =
    viajeActual.destino ||
    "Destino no disponible";

  const conductor =
    viajeActual.conductor ||
    "Conductor no disponible";

  const precioPorLugar =
    Number(
      viajeActual.costo_por_pasajero ??
      viajeActual.precio ??
      0
    );

  const lugares =
    Number(
      viajeActual.lugares ??
      1
    );

  const cupoDisponible =
    viajeActual.cupo_disponible ??
    viajeActual.lugares ??
    1;

  const marca =
    viajeActual.marca ||
    viajeActual.vehiculo ||
    "Vehículo";

  const modelo =
    viajeActual.modelo || "";

  const color =
    viajeActual.color || "";

  const placas =
    viajeActual.placas || "";

  const fechaSalida =
    viajeActual.fecha_salida
      ? new Date(viajeActual.fecha_salida)
      : null;

  const fecha =
    viajeActual.fecha ||
    (fechaSalida
      ? fechaSalida.toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "Fecha no disponible");

  const hora =
    viajeActual.hora ||
    (fechaSalida
      ? fechaSalida.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Hora no disponible");

  const total =
    precioPorLugar * lugares;

  const confirmarReserva = () => {
    onConfirmar?.(viajeActual);
    setReservaConfirmada(true);
  };

  const volverABuscar = () => {
    setReservaConfirmada(false);
    onVolver?.();
  };

  const irAMisViajes = () => {
    setReservaConfirmada(false);
    onIrMisViajes?.();
  };

  return (
    <div className="reserva-page">
      <header className="reserva-navbar">
        <Logo />

        <button
          type="button"
          className="reserva-back-navbar"
          onClick={onVolver}
        >
          <ArrowLeft size={18} />
          Volver
        </button>
      </header>

      <main className="reserva-container">
        <div className="reserva-header">
          <p className="reserva-eyebrow">
            RESUMEN DE RESERVA
          </p>

          <h1>
            Revisa los detalles de tu viaje
          </h1>

          <p>
            Confirma que toda la información sea correcta antes
            de reservar tu lugar.
          </p>
        </div>

        <div className="reserva-layout">
          <section className="reserva-card">
            <div className="reserva-card-header">
              <div>
                <span className="reserva-small-label">
                  Detalles del viaje
                </span>

                <h2>
                  {origen}
                  <span> → </span>
                  {destino}
                </h2>
              </div>

              <div className="reserva-price">
                ${precioPorLugar}
              </div>
            </div>

            <div className="reserva-route">
              <div className="reserva-route-row">
                <div className="reserva-route-icon">
                  <MapPin size={18} />
                </div>

                <div>
                  <span className="reserva-small-label">
                    Origen
                  </span>

                  <p>{origen}</p>
                </div>
              </div>

              <div className="reserva-route-line" />

              <div className="reserva-route-row">
                <div className="reserva-route-icon destino">
                  <MapPin size={18} />
                </div>

                <div>
                  <span className="reserva-small-label">
                    Destino
                  </span>

                  <p>{destino}</p>
                </div>
              </div>
            </div>

            <div className="reserva-information-grid">
              <div className="reserva-info-item">
                <CalendarDays size={19} />

                <div>
                  <span>Fecha</span>
                  <strong>{fecha}</strong>
                </div>
              </div>

              <div className="reserva-info-item">
                <Clock size={19} />

                <div>
                  <span>Hora</span>
                  <strong>{hora}</strong>
                </div>
              </div>

              <div className="reserva-info-item">
                <Users size={19} />

                <div>
                  <span>Cupo disponible</span>
                  <strong>{cupoDisponible}</strong>
                </div>
              </div>
            </div>

            <div className="reserva-divider" />

            <div className="reserva-driver-section">
              <div className="reserva-section-title">
                <UserRound size={20} />

                <div>
                  <span className="reserva-small-label">
                    Conductor
                  </span>

                  <h3>{conductor}</h3>
                </div>
              </div>

              <span className="reserva-verified">
                <CheckCircle2 size={15} />
                Verificado
              </span>
            </div>

            <div className="reserva-vehicle">
              <div className="reserva-vehicle-icon">
                <Car size={22} />
              </div>

              <div>
                <span className="reserva-small-label">
                  Vehículo
                </span>

                <h3>
                  {marca}
                  {modelo ? ` ${modelo}` : ""}
                </h3>

                {(color || placas) && (
                  <p>
                    {color}
                    {color && placas ? " · " : ""}
                    {placas}
                  </p>
                )}
              </div>
            </div>
          </section>

          <aside className="reserva-summary-card">
            <h2>Tu reserva</h2>

            <div className="reserva-summary-row">
              <span>Precio por lugar</span>

              <strong>
                ${precioPorLugar}
              </strong>
            </div>

            <div className="reserva-summary-row">
              <span>Lugares</span>

              <strong>
                {lugares}
              </strong>
            </div>

            <div className="reserva-divider" />

            <div className="reserva-total">
              <span>Total</span>

              <strong>
                ${total}
              </strong>
            </div>

            <button
              type="button"
              className="reserva-confirm-button"
              onClick={confirmarReserva}
            >
              Confirmar reserva
            </button>

            <button
              type="button"
              className="reserva-cancel-button"
              onClick={onVolver}
            >
              Volver a resultados
            </button>

            <p className="reserva-help">
              Revisa la información antes de confirmar tu lugar.
            </p>
          </aside>
        </div>
      </main>

      {reservaConfirmada && (
        <ReservaConfirmada
          viaje={{
            ...viajeActual,
            origen,
            destino,
            fecha,
            hora,
            precio: precioPorLugar,
            lugares,
          }}
          onCerrar={volverABuscar}
          onIrMisViajes={irAMisViajes}
        />
      )}
    </div>
  );
}