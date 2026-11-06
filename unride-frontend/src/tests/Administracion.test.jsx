import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

vi.mock("@/services/api", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/components/admin/VistaDetalleUsuario", () => ({
  default: ({ usuario }) => <div>Detalle de {usuario.nombre}</div>,
}));

import { apiRequest } from "@/services/api";
import ListadoAdministrativo from "@/components/admin/ListadoAdministrativo";

const crearViaje = (id, estado = "Programado") => ({
  id,
  origen: "Monterrey",
  destino: "Saltillo",
  fecha_salida: "2026-11-05T10:00:00",
  estado,
});

describe("Gestión administrativa de usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("consulta usuarios, aplica búsqueda y abre el detalle", async () => {
    apiRequest.mockResolvedValue({
      usuarios: [
        {
          id: 1,
          nombre: "Ana",
          apellido: "García",
          correo: "ana@test.mx",
          roles: ["Pasajero"],
        },
      ],
      paginacion: { total: 21 },
    });

    render(<ListadoAdministrativo tipo="usuarios" />);

    expect(await screen.findByText("Ana García")).toBeTruthy();
    expect(apiRequest).toHaveBeenCalledWith("/users?page=1&limit=20");

    fireEvent.change(screen.getByPlaceholderText("Nombre o correo"), {
      target: { value: "Ana" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenLastCalledWith(
        "/users?q=Ana&page=1&limit=20"
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));

    expect(screen.getByText("Detalle de Ana")).toBeTruthy();
  });

  test("permite paginar y muestra estados vacío y error", async () => {
    apiRequest
      .mockResolvedValueOnce({
        usuarios: [
          {
            id: 1,
            nombre: "Ana",
            correo: "ana@test.mx",
            roles: ["Pasajero"],
          },
        ],
        paginacion: { total: 21 },
      })
      .mockResolvedValueOnce({
        usuarios: [],
        paginacion: { total: 21 },
      });

    render(<ListadoAdministrativo tipo="usuarios" />);

    await screen.findByText("Ana");

    fireEvent.click(
      screen.getByRole("button", { name: "Página siguiente" })
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenLastCalledWith(
        "/users?page=2&limit=20"
      );
    });

    expect(
      await screen.findByText("No se encontraron usuarios.")
    ).toBeTruthy();

    apiRequest.mockRejectedValueOnce(
      new Error("Servicio no disponible")
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Página anterior" })
    );

    expect(
      (await screen.findByRole("alert")).textContent
    ).toContain("Servicio no disponible");
  });
});

describe("Cancelación administrativa de viajes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("muestra la acción únicamente para viajes programados", async () => {
    apiRequest.mockResolvedValue({
      viajes: [
        crearViaje(10, "Programado"),
        crearViaje(11, "En curso"),
        crearViaje(12, "Cancelado"),
        crearViaje(13, "Completado"),
      ],
      paginacion: { total: 4 },
    });

    render(<ListadoAdministrativo tipo="viajes" />);

    expect(await screen.findAllByText("Monterrey")).toHaveLength(4);

    expect(
      screen.getAllByRole("button", { name: "Cancelar viaje" })
    ).toHaveLength(1);
  });

  test("solicita motivo y cancela el viaje correctamente", async () => {
    apiRequest
      .mockResolvedValueOnce({
        viajes: [crearViaje(10)],
        paginacion: { total: 1 },
      })
      .mockResolvedValueOnce({
        trip: {
          id: 10,
          estado: "Cancelado",
          motivo_cancelacion: "Cambio de planes",
        },
      });

    render(<ListadoAdministrativo tipo="viajes" />);

    await screen.findByText("Monterrey");

    fireEvent.click(
      screen.getByRole("button", { name: "Cancelar viaje" })
    );

    expect(screen.getByRole("dialog")).toBeTruthy();

    const botonConfirmar = screen.getByRole("button", {
      name: "Confirmar",
    });

    expect(botonConfirmar.disabled).toBe(true);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Escribe el motivo de esta acción"
      ),
      {
        target: { value: "Cambio de planes" },
      }
    );

    fireEvent.click(botonConfirmar);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenLastCalledWith(
        "/api/trips/10/cancel",
        {
          method: "PATCH",
          body: {
            motivo_cancelacion: "Cambio de planes",
          },
        }
      );
    });

    const mensajeExito = await screen.findByRole("status");

expect(mensajeExito.textContent).toContain(
    "El viaje #10 fue cancelado correctamente."
);

    expect(
    await screen.findByRole("cell", { name: "Cancelado" })
).toBeTruthy();

    expect(
      screen.queryByRole("button", { name: "Cancelar viaje" })
    ).toBeNull();
  });

  test("muestra el error del servidor y conserva el modal", async () => {
    apiRequest
      .mockResolvedValueOnce({
        viajes: [crearViaje(20)],
        paginacion: { total: 1 },
      })
      .mockRejectedValueOnce(
        new Error("El viaje tiene reservaciones activas.")
      );

    render(<ListadoAdministrativo tipo="viajes" />);

    await screen.findByText("Monterrey");

    fireEvent.click(
      screen.getByRole("button", { name: "Cancelar viaje" })
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        "Escribe el motivo de esta acción"
      ),
      {
        target: { value: "Solicitud de cancelación" },
      }
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar" })
    );

    expect(
      await screen.findByText(
        "El viaje tiene reservaciones activas."
      )
    ).toBeTruthy();

    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});