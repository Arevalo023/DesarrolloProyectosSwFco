import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/services/api";
import MisSolicitudes from "@/pages/MisReservaciones";

describe("MisSolicitudes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({
      reservations: [{
        id: 19,
        estado: "pendiente",
        origen: "Campus Norte",
        destino: "Centro",
        fecha_salida: "2026-10-12T10:00:00.000Z",
        conductor_nombre: "Dana",
        vehiculo_marca: "Mazda",
        vehiculo_modelo: "3",
        vehiculo_color: "Rojo",
        vehiculo_placa: "ABC-123",
      }],
    });
  });

  test("carga las solicitudes principales y al cancelar las quita de la lista activa", async () => {
    const onVerRechazadas = vi.fn();
    const onVerCanceladas = vi.fn();
    render(
      <MisSolicitudes
        onBack={vi.fn()}
        onVerRechazadas={onVerRechazadas}
        onVerCanceladas={onVerCanceladas}
        user={{ nombre: "Alex" }}
      />
    );

    expect(await screen.findByText("Solicitud #19")).toBeTruthy();
    expect(screen.getByText("Mazda")).toBeTruthy();
    expect(apiRequest).toHaveBeenCalledWith("/api/trips/reservations");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar solicitud" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/api/reservations/19/cancel", { method: "PATCH" });
      expect(screen.queryByText("Cancelada")).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: /Solicitudes rechazadas/ }));
    fireEvent.click(screen.getByRole("button", { name: /Solicitudes canceladas/ }));
    expect(onVerRechazadas).toHaveBeenCalledOnce();
    expect(onVerCanceladas).toHaveBeenCalledOnce();
  });

  test.each([
    ["rechazadas", "rechazada", "Solicitud rechazada"],
    ["canceladas", "cancelada", "Solicitud cancelada"],
  ])("la página de %s solo muestra solicitudes con ese estado", async (vista, estado, titulo) => {
    apiRequest.mockResolvedValue({
      reservations: [
        {
          id: 19,
          estado,
          origen: titulo,
          destino: "Centro",
          fecha_salida: "2026-10-12T10:00:00.000Z",
        },
        {
          id: 20,
          estado: estado === "rechazada" ? "cancelada" : "rechazada",
          origen: "No debe aparecer",
          destino: "Centro",
          fecha_salida: "2026-10-12T10:00:00.000Z",
        },
        {
          id: 21,
          estado: "aceptada",
          origen: "Aceptada principal",
          destino: "Centro",
          fecha_salida: "2026-10-12T10:00:00.000Z",
        },
      ],
    });

    render(<MisSolicitudes vista={vista} onBack={vi.fn()} user={{ nombre: "Alex" }} />);

    expect(await screen.findByText("Solicitud #19")).toBeTruthy();
    expect(screen.getByText(titulo)).toBeTruthy();
    expect(screen.queryByText("Solicitud #20")).toBeNull();
    expect(screen.queryByText("Solicitud #21")).toBeNull();
    expect(screen.getByRole("heading", {
      level: 1,
      name: vista === "rechazadas" ? "Solicitudes rechazadas" : "Solicitudes canceladas",
    })).toBeTruthy();
  });

  test("mantiene las solicitudes aceptadas y pendientes en la página principal", async () => {
    apiRequest.mockResolvedValue({
      reservations: [
        { id: 31, estado: "aceptada", origen: "Viaje aceptado", destino: "Centro" },
        { id: 32, estado: "pendiente", origen: "Viaje pendiente", destino: "Campus" },
        { id: 33, estado: "rechazada", origen: "Viaje rechazado", destino: "Aeropuerto" },
        { id: 34, estado: "cancelada", origen: "Viaje cancelado", destino: "Rectoría" },
      ],
    });

    render(<MisSolicitudes onBack={vi.fn()} user={{ nombre: "Alex" }} />);

    expect(await screen.findByText("Viaje aceptado")).toBeTruthy();
    expect(screen.getByText("Viaje pendiente")).toBeTruthy();
    expect(screen.queryByText("Viaje rechazado")).toBeNull();
    expect(screen.queryByText("Viaje cancelado")).toBeNull();
  });

  test("deshabilita la calificación e informa cuando ya se calificó el viaje", async () => {
    apiRequest.mockImplementation((endpoint) => {
      if (endpoint === "/api/trips/reservations") {
        return Promise.resolve({
          reservations: [{
            id: 40,
            viaje_id: 70,
            estado: "aceptada",
            viaje_estado: "finalizado",
            conductor_id: 9,
            conductor_nombre: "Dana",
            origen: "Campus",
            destino: "Centro",
          }],
        });
      }
      if (endpoint === "/api/ratings/user/9") {
        return Promise.resolve({
          calificaciones: [{
            viaje_id: 70,
            calificador_id: 7,
            calificado_id: 9,
            puntuacion: 5,
          }],
        });
      }
      throw new Error(`Ruta inesperada: ${endpoint}`);
    });

    render(<MisSolicitudes onBack={vi.fn()} user={{ id: 7, nombre: "Alex" }} />);

    expect(await screen.findByText("Este viaje ya fue calificado.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Calificación completada" }).disabled).toBe(true);
    expect(apiRequest).toHaveBeenCalledWith("/api/ratings/user/9");
  });

  test("deshabilita la calificación hasta que finalice el viaje", async () => {
    apiRequest.mockResolvedValue({
      reservations: [{
        id: 41,
        viaje_id: 71,
        estado: "aceptada",
        viaje_estado: "en_curso",
        conductor_id: 9,
        conductor_nombre: "Dana",
        origen: "Campus",
        destino: "Centro",
      }],
    });

    render(<MisSolicitudes onBack={vi.fn()} user={{ id: 7, nombre: "Alex" }} />);

    expect(await screen.findByText(
      "Podrás calificar al conductor cuando el viaje haya finalizado."
    )).toBeTruthy();
    expect(screen.getByRole("button", { name: "Calificación no disponible" }).disabled).toBe(true);
    expect(apiRequest).not.toHaveBeenCalledWith("/api/ratings/user/9");
  });

  test("permite abrir la calificación cuando el viaje finalizó y no hay calificación previa", async () => {
    apiRequest.mockImplementation((endpoint) => {
      if (endpoint === "/api/trips/reservations") {
        return Promise.resolve({
          reservations: [{
            id: 42,
            viaje_id: 72,
            estado: "aceptada",
            viaje_estado: "finalizado",
            conductor_id: 9,
            conductor_nombre: "Dana",
            origen: "Campus",
            destino: "Centro",
          }],
        });
      }
      if (endpoint === "/api/ratings/user/9") {
        return Promise.resolve({ calificaciones: [] });
      }
      throw new Error(`Ruta inesperada: ${endpoint}`);
    });

    render(<MisSolicitudes onBack={vi.fn()} user={{ id: 7, nombre: "Alex" }} />);

    fireEvent.click(await screen.findByRole("button", { name: "Calificar conductor" }));
    expect(screen.getByRole("group", { name: "Puntuación del conductor" })).toBeTruthy();
  });

  test("bloquea la calificación con el motivo del servidor si ya no es posible calificar", async () => {
    const reason = "Solo se puede calificar cuando el viaje ha finalizado.";
    apiRequest.mockImplementation((endpoint, options) => {
      if (endpoint === "/api/trips/reservations") {
        return Promise.resolve({
          reservations: [{
            id: 43,
            viaje_id: 73,
            estado: "aceptada",
            viaje_estado: "finalizado",
            conductor_id: 9,
            conductor_nombre: "Dana",
            origen: "Campus",
            destino: "Centro",
          }],
        });
      }
      if (endpoint === "/api/ratings/user/9") {
        return Promise.resolve({ calificaciones: [] });
      }
      if (endpoint === "/api/trips/73/rate-driver" && options?.method === "POST") {
        return Promise.reject(Object.assign(new Error(reason), { status: 400 }));
      }
      throw new Error(`Ruta inesperada: ${endpoint}`);
    });

    render(<MisSolicitudes onBack={vi.fn()} user={{ id: 7, nombre: "Alex" }} />);

    fireEvent.click(await screen.findByRole("button", { name: "Calificar conductor" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar calificación" }));

    expect(await screen.findByText(reason)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Calificación no disponible" }).disabled).toBe(true);
  });
});