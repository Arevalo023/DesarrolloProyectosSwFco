import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/services/api";
import Home from "@/pages/Home";

const futureDeparture = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const commonProps = (role) => ({
  user: { id: 3, nombre: "Alex", roles: [role] },
  rolActivo: role,
  onLogout: vi.fn(),
  onProfile: vi.fn(),
  onVehiculos: vi.fn(),
  onPublish: vi.fn(),
  onMisViajes: vi.fn(),
  onMisSolicitudes: vi.fn(),
  onCambiarRol: vi.fn(),
});

describe("Home: resumen de viajes activos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    delete HTMLElement.prototype.scrollIntoView;
  });

  test("muestra reservas pendientes y aceptadas, pero excluye canceladas", async () => {
    apiRequest.mockResolvedValue({
      reservations: [
        {
          id: 11,
          estado: "pendiente",
          viaje_estado: "programado",
          origen: "Campus Norte",
          destino: "Centro",
          fecha_salida: futureDeparture(),
          conductor_nombre: "Dana",
          vehiculo_marca: "Mazda",
          vehiculo_modelo: "3",
          vehiculo_color: "Rojo",
          vehiculo_placa: "ABC-123",
        },
        {
          id: 12,
          estado: "aceptada",
          viaje_estado: "programado",
          origen: "Campus Sur",
          destino: "Rectoría",
          fecha_salida: futureDeparture(),
          conductor_nombre: "Sam",
          vehiculo_marca: "Nissan",
          vehiculo_modelo: "Versa",
          vehiculo_color: "Blanco",
          vehiculo_placa: "XYZ-456",
        },
        {
          id: 13,
          estado: "cancelada",
          viaje_estado: "programado",
          origen: "Ruta cancelada",
          destino: "Centro",
          fecha_salida: futureDeparture(),
        },
      ],
    });

    render(<Home {...commonProps("Pasajero")} />);

    expect(await screen.findByText("Reservaciones activas")).toBeTruthy();
    expect(screen.getByText("Reservación #11")).toBeTruthy();
    expect(screen.getByText("Reservación #12")).toBeTruthy();
    expect(screen.getByText("Mazda · 3 · Rojo · Placas ABC-123")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mis reservaciones" })).toBeTruthy();
    expect(screen.queryByText("Ruta cancelada → Centro")).toBeNull();
    expect(apiRequest).toHaveBeenCalledWith("/api/trips/reservations");
  });

  test("muestra al conductor una tarjeta de su propio viaje próximo", async () => {
    apiRequest.mockResolvedValue({
      trips: [
        {
          id: 77,
          estado: "programado",
          origen: "Campus Arteaga",
          destino: "Rectoría",
          fecha_salida: futureDeparture(),
          cupo_disponible: 2,
          vehiculo_marca: "Toyota",
          vehiculo_modelo: "Corolla",
          vehiculo_color: "Azul",
          vehiculo_placa: "DEF-789",
        },
        {
          id: 78,
          estado: "cancelado",
          origen: "Ruta cancelada",
          destino: "Centro",
          fecha_salida: futureDeparture(),
        },
      ],
    });

    render(<Home {...commonProps("Conductor")} />);

    expect(await screen.findByText("Mis viajes publicados")).toBeTruthy();
    expect(screen.getByText("Viaje propio #77")).toBeTruthy();
    expect(screen.getByText("Toyota · Corolla · Azul · Placas DEF-789")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mis viajes" })).toBeTruthy();
    expect(screen.queryByText("Viaje propio #78")).toBeNull();
    expect(apiRequest).toHaveBeenCalledWith("/api/trips/driver");
  });

  test.each([
    ["Pasajero", "Mis reservaciones", "onMisSolicitudes"],
    ["Conductor", "Mis viajes", "onMisViajes"],
  ])("el acceso %s desplaza a la sección de Home", async (role, label, callbackName) => {
    apiRequest.mockResolvedValue(role === "Pasajero" ? { reservations: [] } : { trips: [] });
    const props = commonProps(role);

    render(<Home {...props} />);
    await screen.findByText(role === "Pasajero" ? "Reservaciones activas" : "Mis viajes publicados");
    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(props[callbackName]).not.toHaveBeenCalled();
  });
});