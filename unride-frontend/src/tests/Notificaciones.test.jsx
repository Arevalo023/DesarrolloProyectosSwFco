import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/services/api";
import Notificaciones from "@/pages/Notificaciones";

const notification = {
  id: 4,
  tipo: "reserva_aceptada",
  titulo: "Solicitud aceptada",
  mensaje: "El conductor aceptó tu solicitud.",
  leida: false,
  fecha_creacion: "2026-10-09T12:00:00.000Z",
};

describe("Notificaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({ notifications: [notification] });
  });

  test("carga notificaciones de la API y persiste la lectura individual", async () => {
    render(<Notificaciones onVolver={vi.fn()} />);

    expect(await screen.findByText("Solicitud aceptada")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ver detalles/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/api/notifications/4/read", { method: "PATCH" });
    });
    expect(screen.queryByText("Nueva")).toBeNull();
  });

  test("marca todas como leídas en el backend", async () => {
    render(<Notificaciones onVolver={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Marcar todas como leídas/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/api/notifications/read-all", { method: "PATCH" });
    });
    expect(screen.queryByText("Nueva")).toBeNull();
  });
});