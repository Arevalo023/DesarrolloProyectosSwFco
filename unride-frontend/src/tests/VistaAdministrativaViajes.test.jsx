import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/services/api", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "@/services/api";
import ListadoAdministrativo from "@/components/admin/ListadoAdministrativo";

const viaje = {
  id: 12,
  origen: "Monterrey",
  destino: "Saltillo",
  fecha_salida: "2026-11-10T10:00:00",
  estado: "programado",
  conductor_id: 5,
  conductor_nombre: "Carlos L├│pez",
  conductor_correo: "carlos@test.mx",
  conductor: {
    id: 5,
    nombre_completo: "Carlos L├│pez",
    correo: "carlos@test.mx",
    telefono: "8112345678",
  },
  total_reservaciones: 1,
  vehiculo_id: 3,
};

const detalleViaje = {
  ...viaje,
  costo_por_pasajero: 150,
  asientos_disponibles: 2,
  vehiculo: {
    id: 3,
    marca: "Nissan",
    modelo: "Versa",
    anio: 2024,
    color: "Blanco",
    placa: "ABC123",
  },
  reservaciones: [
    {
      id: 30,
      viaje_id: 12,
      pasajero_id: 8,
      estado: "aceptada",
      fecha_solicitud: "2026-11-01T09:00:00",
      pasajero_nombre: "Mar├¡a P├®rez",
      pasajero_correo: "maria@test.mx",
      pasajero_telefono: "8187654321",
      pasajero: {
        id: 8,
        nombre_completo: "Mar├¡a P├®rez",
        correo: "maria@test.mx",
        telefono: "8187654321",
      },
    },
  ],
};

const respuestaLista = {
  viajes: [viaje],
  paginacion: {
    pagina: 1,
    limite: 20,
    total: 1,
    total_paginas: 1,
  },
};

describe("Vista administrativa de viajes - Issue #148", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("consulta y muestra los viajes registrados", async () => {
    apiRequest.mockResolvedValue(respuestaLista);

    render(<ListadoAdministrativo tipo="viajes" />);

    expect(await screen.findByText("Monterrey")).toBeTruthy();
    expect(screen.getByText("Saltillo")).toBeTruthy();
    expect(screen.getByText("Carlos L├│pez")).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Programado" })).toBeTruthy();

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/trips/admin?page=1&limit=20"
    );
  });

  test("permite consultar viajes mediante conductor, estado y fecha", async () => {
    apiRequest.mockResolvedValue(respuestaLista);

    render(<ListadoAdministrativo tipo="viajes" />);

    await screen.findByText("Monterrey");

    fireEvent.change(
      screen.getByPlaceholderText("Nombre, correo o ID del conductor"),
      { target: { value: "Carlos L├│pez" } }
    );

    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "programado" },
    });

    fireEvent.change(screen.getByLabelText("Fecha de salida"), {
      target: { value: "2026-11-10" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledTimes(2);
    });

    const ultimaConsulta = apiRequest.mock.calls[1][0];
    const parametros = new URLSearchParams(
      ultimaConsulta.split("?")[1]
    );

    expect(ultimaConsulta).toContain("/api/trips/admin?");
    expect(parametros.get("conductor")).toBe("Carlos L├│pez");
    expect(parametros.get("estado")).toBe("programado");
    expect(parametros.get("fecha")).toBe("2026-11-10");
    expect(parametros.get("page")).toBe("1");
    expect(parametros.get("limit")).toBe("20");
  });

  test("abre el detalle administrativo del viaje seleccionado", async () => {
    apiRequest
      .mockResolvedValueOnce(respuestaLista)
      .mockResolvedValueOnce({
        success: true,
        data: { viaje: detalleViaje },
      });

    render(<ListadoAdministrativo tipo="viajes" />);

    await screen.findByText("Monterrey");

    fireEvent.click(
      screen.getByRole("button", { name: "Ver detalle" })
    );

    expect(await screen.findByText("Mar├¡a P├®rez")).toBeTruthy();

    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/trips/admin/12"
    );

    expect(screen.getByText("Nissan")).toBeTruthy();
    expect(screen.getByText("Versa")).toBeTruthy();
    expect(screen.getByText("ABC123")).toBeTruthy();
  });

  test("muestra el mensaje cuando el viaje no tiene reservaciones", async () => {
    const viajeSinReservaciones = {
      ...detalleViaje,
      reservaciones: [],
    };

    apiRequest
      .mockResolvedValueOnce(respuestaLista)
      .mockResolvedValueOnce({
        success: true,
        data: { viaje: viajeSinReservaciones },
      });

    render(<ListadoAdministrativo tipo="viajes" />);

    await screen.findByText("Monterrey");

    fireEvent.click(
      screen.getByRole("button", { name: "Ver detalle" })
    );

    expect(
      await screen.findByText(
        "Este viaje todav├¡a no tiene reservaciones registradas."
      )
    ).toBeTruthy();
  });

  test("permite regresar al listado desde el detalle", async () => {
    apiRequest
      .mockResolvedValueOnce(respuestaLista)
      .mockResolvedValueOnce({
        success: true,
        data: { viaje: detalleViaje },
      });

    render(<ListadoAdministrativo tipo="viajes" />);

    await screen.findByText("Monterrey");

    fireEvent.click(
      screen.getByRole("button", { name: "Ver detalle" })
    );

    await screen.findByText("Mar├¡a P├®rez");

    fireEvent.click(
      screen.getByRole("button", { name: "Volver a viajes" })
    );

    expect(await screen.findByText("Monterrey")).toBeTruthy();
  });

  test("permite reintentar cuando falla la consulta del detalle", async () => {
    apiRequest
      .mockResolvedValueOnce(respuestaLista)
      .mockRejectedValueOnce(
        new Error("No se pudo consultar el detalle del viaje.")
      )
      .mockResolvedValueOnce({
        success: true,
        data: { viaje: detalleViaje },
      });

    render(<ListadoAdministrativo tipo="viajes" />);

    await screen.findByText("Monterrey");

    fireEvent.click(
      screen.getByRole("button", { name: "Ver detalle" })
    );

    expect(
      await screen.findByText(
        "No se pudo consultar el detalle del viaje."
      )
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Reintentar" })
    );

    expect(await screen.findByText("Mar├¡a P├®rez")).toBeTruthy();

    expect(apiRequest).toHaveBeenCalledTimes(3);
  });
});
