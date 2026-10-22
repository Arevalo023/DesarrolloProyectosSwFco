import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/services/api";
import MisViajes from "@/pages/MisViajes";
import MisReservaciones from "@/pages/MisReservaciones";

const FECHA_ESPERADA = "lunes, 12 de octubre de 2026";

const viaje = (id, fecha_salida) => ({
  id,
  origen: `Origen ${id}`,
  destino: `Destino ${id}`,
  fecha_salida,
  cupo_disponible: 2,
  estado: "programado",
});

const reservacion = (id, fecha_salida) => ({
  id,
  estado: "pendiente",
  origen: `Campus ${id}`,
  destino: `Centro ${id}`,
  fecha_salida,
  conductor_nombre: "Conductora Prueba",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Issue #101 - MisViajes: fechas recibidas de la API", () => {
  it.each([
    ["fecha sin hora", "2026-10-12"],
    ["ISO UTC a medianoche", "2026-10-12T00:00:00.000Z"],
    ["ISO UTC al final del día", "2026-10-12T23:59:59Z"],
    ["ISO con desplazamiento horario", "2026-10-12T00:30:00+05:00"],
  ])("muestra el día correcto para %s", async (_, fecha) => {
    apiRequest.mockImplementation(async (url) =>
      url === "/api/trips/driver"
        ? { trips: [viaje(101, fecha)] }
        : { requests: [] }
    );

    render(<MisViajes onBackHome={vi.fn()} />);

    expect(await screen.findByText(FECHA_ESPERADA)).toBeTruthy();
    expect(screen.queryByText(/invalid date|fecha inválida/i)).toBeNull();
    expect(apiRequest).toHaveBeenCalledWith("/api/trips/driver");
  });

  it("muestra la hora extraída de fecha_salida cuando el viaje no trae hora_salida", async () => {
    apiRequest.mockImplementation(async (url) =>
      url === "/api/trips/driver"
        ? { trips: [viaje(110, "2026-10-12T10:30:00.000Z")] }
        : { requests: [] }
    );

    render(<MisViajes onBackHome={vi.fn()} />);
    expect(await screen.findByText("10:30")).toBeTruthy();
  });

  it.each(["2026-02-30", "texto-invalido", null])(
    "presenta un texto seguro para fecha inválida %s",
    async (fecha) => {
      apiRequest.mockImplementation(async (url) =>
        url === "/api/trips/driver"
          ? { trips: [{ ...viaje(102, "2026-10-12"), fecha_salida: fecha, fecha: null, departure_date: null }] }
          : { requests: [] }
      );

      render(<MisViajes onBackHome={vi.fn()} />);
      expect(await screen.findByText("Fecha no disponible")).toBeTruthy();
      expect(screen.queryByText(/invalid date/i)).toBeNull();
    }
  );
});

describe("Issue #101 - MisReservaciones: fechas recibidas de la API", () => {
  it.each([
    ["fecha sin hora", "2026-10-12"],
    ["ISO UTC a medianoche", "2026-10-12T00:00:00.000Z"],
    ["ISO UTC al final del día", "2026-10-12T23:59:59Z"],
    ["ISO con desplazamiento horario", "2026-10-12T00:30:00+05:00"],
  ])("muestra el día correcto para %s", async (_, fecha) => {
    apiRequest.mockResolvedValue({ reservations: [reservacion(201, fecha)] });

    render(<MisReservaciones onBack={vi.fn()} user={{ nombre: "Prueba" }} />);

    expect(await screen.findByText(FECHA_ESPERADA)).toBeTruthy();
    expect(screen.queryByText(/invalid date|fecha inválida/i)).toBeNull();
    expect(apiRequest).toHaveBeenCalledWith("/api/trips/reservations");
  });

  it("muestra la hora extraída de fecha_salida en las solicitudes", async () => {
    apiRequest.mockResolvedValue({
      reservations: [reservacion(210, "2026-10-12T10:30:00.000Z")],
    });

    render(<MisReservaciones onBack={vi.fn()} user={{ nombre: "Prueba" }} />);
    expect(await screen.findByText("10:30")).toBeTruthy();
  });

  it.each(["2026-02-30", "texto-invalido", null])(
    "no muestra una fecha inválida para %s",
    async (fecha) => {
      apiRequest.mockResolvedValue({ reservations: [reservacion(202, fecha)] });
      render(<MisReservaciones onBack={vi.fn()} user={{ nombre: "Prueba" }} />);
      expect(await screen.findByText("Fecha no disponible")).toBeTruthy();
      expect(screen.queryByText(/invalid date/i)).toBeNull();
    }
  );
});
