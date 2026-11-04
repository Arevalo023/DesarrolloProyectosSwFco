import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/services/api", () => ({
  apiRequest: vi.fn(),
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

describe("Filtros y búsqueda administrativa de viajes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiRequest.mockResolvedValue({
      viajes: [crearViaje(10)],
      paginacion: { total: 1 },
    });
  });

  test("consulta viajes aplicando conductor, estado y fecha", async () => {
    render(<ListadoAdministrativo tipo="viajes" />);

    expect(await screen.findByText("Monterrey")).toBeTruthy();

    fireEvent.change(
      screen.getByPlaceholderText("Nombre, correo o ID del conductor"),
      { target: { value: " Luis Pérez " } }
    );

    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "en_curso" },
    });

    fireEvent.change(screen.getByLabelText("Fecha de salida"), {
      target: { value: "2026-11-05" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenLastCalledWith(
        "/api/trips/admin?conductor=Luis+P%C3%A9rez&estado=en_curso&fecha=2026-11-05&page=1&limit=20"
      );
    });
  });

  test("limpia la búsqueda y los filtros seleccionados", async () => {
    render(<ListadoAdministrativo tipo="viajes" />);

    expect(await screen.findByText("Monterrey")).toBeTruthy();

    fireEvent.change(
      screen.getByPlaceholderText("Nombre, correo o ID del conductor"),
      { target: { value: "Luis" } }
    );

    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "programado" },
    });

    fireEvent.change(screen.getByLabelText("Fecha de salida"), {
      target: { value: "2026-11-05" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenLastCalledWith(
        "/api/trips/admin?conductor=Luis&estado=programado&fecha=2026-11-05&page=1&limit=20"
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenLastCalledWith(
        "/api/trips/admin?page=1&limit=20"
      );
    });
  });

  test("permite avanzar a la siguiente página de viajes", async () => {
    apiRequest.mockResolvedValue({
      viajes: [crearViaje(10)],
      paginacion: { total: 21 },
    });

    render(<ListadoAdministrativo tipo="viajes" />);

    expect(await screen.findByText("Monterrey")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Página siguiente" })
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenLastCalledWith(
        "/api/trips/admin?page=2&limit=20"
      );
    });
  });
});
