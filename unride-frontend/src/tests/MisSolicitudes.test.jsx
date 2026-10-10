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
        hora_salida: "10:00",
        conductor_nombre: "Dana",
        vehiculo_marca: "Mazda",
        vehiculo_modelo: "3",
        vehiculo_color: "Rojo",
        vehiculo_placa: "ABC-123",
      }],
    });
  });

  test("carga solicitudes del servidor y persiste la cancelación", async () => {
    render(<MisSolicitudes onBack={vi.fn()} user={{ nombre: "Alex" }} />);

    expect(await screen.findByText("Solicitud #19")).toBeTruthy();
    expect(screen.getByText("Mazda")).toBeTruthy();
    expect(apiRequest).toHaveBeenCalledWith("/api/trips/reservations");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar solicitud" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/api/reservations/19/cancel", { method: "PATCH" });
      expect(screen.getByText("Solicitudes canceladas")).toBeTruthy();
    });
  });
});