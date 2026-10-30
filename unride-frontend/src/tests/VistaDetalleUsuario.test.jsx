
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

vi.mock("@/services/api", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "@/services/api";
import VistaDetalleUsuario from "@/components/admin/VistaDetalleUsuario";

const usuario = {
  id: 5,
  nombre: "Prueba",
  apellido: "Cambio",
  correo: "prueba@universidad.edu.mx",
  roles: ["Conductor"],
};

describe("Issue #146 / HU-11 - Vista de detalle de usuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra los datos del usuario y permite volver al listado", async () => {
    apiRequest.mockResolvedValue({
      usuario,
      reputacion: { promedio: null, calificaciones: [] },
      viajes: [],
      reservaciones: [],
    });

    const onVolver = vi.fn();

    render(
      <VistaDetalleUsuario
        usuario={usuario}
        onVolver={onVolver}
      />
    );

    expect(screen.getByText("Prueba Cambio")).toBeTruthy();
    expect(screen.getByText(usuario.correo)).toBeTruthy();

    expect(
      screen.getByText(/ID: 5 · Rol: Conductor/)
    ).toBeTruthy();

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/users/5"
      );
    });

    // Esperar a que React termine de actualizar los datos.
    expect(
      await screen.findByText(
        "Sin datos: no hay calificaciones recibidas."
      )
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Volver a usuarios/i,
      })
    );

    expect(onVolver).toHaveBeenCalledOnce();
  });

  it("muestra el estado de carga mientras consulta calificaciones", () => {
    // Simulamos una petición que permanece pendiente.
    apiRequest.mockReturnValue(new Promise(() => {}));

    render(
      <VistaDetalleUsuario
        usuario={usuario}
        onVolver={vi.fn()}
      />
    );

    expect(
      screen.getAllByRole("status").length
    ).toBeGreaterThan(0);

    expect(
      screen.getAllByText("Cargando información...")
    ).toHaveLength(2);
  });

  it("muestra el promedio y la lista real de calificaciones recibidas", async () => {
    apiRequest.mockResolvedValue({
      usuario,
      reputacion: { promedio: 4.5, calificaciones: [
        {
          id: 11,
          puntuacion: 5,
          comentario: "Excelente conductor",
          calificador_nombre: "Ana",
          viaje_id: 31,
          fecha_creacion: "2026-10-21T12:00:00Z",
        },
        {
          id: 12,
          puntuacion: 4,
          comentario: "Buen viaje",
          calificador_nombre: "Luis",
          viaje_id: 32,
          fecha_creacion: "2026-10-22T12:00:00Z",
        },
      ] },
      viajes: [],
      reservaciones: [],
    });

    render(
      <VistaDetalleUsuario
        usuario={usuario}
        onVolver={vi.fn()}
      />
    );

    expect(
      await screen.findByText("4.5 / 5")
    ).toBeTruthy();

    expect(
      screen.getByText("(2 calificaciones)")
    ).toBeTruthy();

    expect(
      screen.getByText("Excelente conductor")
    ).toBeTruthy();

    expect(
      screen.getByText("Buen viaje")
    ).toBeTruthy();

    expect(
      screen.getByText(/Calificado por: Ana/)
    ).toBeTruthy();

    expect(
      screen.getByText(/Viaje #31/)
    ).toBeTruthy();
  });

  it("muestra Sin datos cuando no hay calificaciones", async () => {
    apiRequest.mockResolvedValue({
      promedio: null,
      calificaciones: [],
    });

    render(
      <VistaDetalleUsuario
        usuario={usuario}
        onVolver={vi.fn()}
      />
    );

    expect(
      await screen.findByText(
        "Sin datos: este usuario todavía no tiene calificaciones."
      )
    ).toBeTruthy();

    expect(
      screen.getByText(
        "Sin datos: no hay calificaciones recibidas."
      )
    ).toBeTruthy();
  });

  it("muestra un error y permite reintentar la consulta", async () => {
    // Primera consulta: error.
    // Segunda consulta: respuesta correcta.
    apiRequest
      .mockRejectedValueOnce(
        new Error("Servicio no disponible")
      )
      .mockResolvedValueOnce({
        usuario,
        reputacion: { promedio: null, calificaciones: [] },
        viajes: [],
        reservaciones: [],
      });

    render(
      <VistaDetalleUsuario
        usuario={usuario}
        onVolver={vi.fn()}
      />
    );

    const alertas = await screen.findAllByRole("alert");

    expect(alertas).toHaveLength(2);

    expect(alertas[0].textContent).toContain(
      "Servicio no disponible"
    );

    // Simular clic en Reintentar.
    fireEvent.click(
      screen.getAllByRole("button", {
        name: /Reintentar/i,
      })[0]
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledTimes(2);
    });

    // Esperar a que la petición termine correctamente.
    expect(
      await screen.findByText(
        "Sin datos: no hay calificaciones recibidas."
      )
    ).toBeTruthy();
  });

  it("indica la dependencia de API para viajes y reservaciones sin fingir que están vacíos", async () => {
    apiRequest.mockResolvedValue({
      promedio: null,
      calificaciones: [],
    });

    render(
      <VistaDetalleUsuario
        usuario={usuario}
        onVolver={vi.fn()}
      />
    );

    expect(
      screen.getByText("Viajes del usuario")
    ).toBeTruthy();

    expect(
      screen.getByText("Reservaciones del usuario")
    ).toBeTruthy();

    expect(screen.getByText("0 viajes publicados.")).toBeTruthy();
    expect(screen.getByText("0 reservaciones registradas.")).toBeTruthy();

    // Corrección de la advertencia act(...):
    // Esperar a que React termine la actualización asíncrona.
    expect(
      await screen.findByText(
        "Sin datos: no hay calificaciones recibidas."
      )
    ).toBeTruthy();
  });
});
