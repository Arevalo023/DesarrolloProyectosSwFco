import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/services/api", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/components/admin/VistaDetalleUsuario", () => ({
  default: ({ usuario }) => <div>Detalle de {usuario.nombre}</div>,
}));

import { apiRequest } from "@/services/api";
import ListadoAdministrativo from "@/components/admin/ListadoAdministrativo";

describe("Gestión administrativa de usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("consulta usuarios, aplica búsqueda y abre el detalle", async () => {
    apiRequest.mockResolvedValue({
      usuarios: [{ id: 1, nombre: "Ana", apellido: "García", correo: "ana@test.mx", roles: ["Pasajero"] }],
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
      expect(apiRequest).toHaveBeenLastCalledWith("/users?q=Ana&page=1&limit=20");
    });

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
    expect(screen.getByText("Detalle de Ana")).toBeTruthy();
  });

  test("permite paginar y muestra estados vacío y error", async () => {
    apiRequest
      .mockResolvedValueOnce({
        usuarios: [{ id: 1, nombre: "Ana", correo: "ana@test.mx", roles: ["Pasajero"] }],
        paginacion: { total: 21 },
      })
      .mockResolvedValueOnce({ usuarios: [], paginacion: { total: 21 } });

    render(<ListadoAdministrativo tipo="usuarios" />);
    await screen.findByText("Ana");

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => {
      expect(apiRequest).toHaveBeenLastCalledWith("/users?page=2&limit=20");
    });
    expect(await screen.findByText("No se encontraron usuarios.")).toBeTruthy();

    apiRequest.mockRejectedValueOnce(new Error("Servicio no disponible"));
    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Servicio no disponible");
  });
});
