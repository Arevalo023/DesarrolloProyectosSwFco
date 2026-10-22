import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/services/api";
import Calificaciones, { FormularioCalificacion } from "@/pages/Calificaciones";

describe("Issue #119 y #121 - calificaciones", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra promedio, calificaciones y estado sin calificaciones", async () => {
    apiRequest.mockResolvedValue({
      promedio: 4.5,
      total_calificaciones: 2,
      calificaciones: [{
        id: 1,
        puntuacion: 5,
        comentario: "Excelente",
        calificador_nombre: "María López",
        fecha_creacion: "2026-10-21T14:30:00.000Z",
      }],
    });
    render(<Calificaciones user={{ id: 7 }} onBack={vi.fn()} />);
    expect(await screen.findByText("4.5")).toBeTruthy();
    expect(screen.getByText("Excelente")).toBeTruthy();
    expect(screen.getByText("María López")).toBeTruthy();
    expect(screen.getByText("miércoles, 21 de octubre de 2026")).toBeTruthy();

    apiRequest.mockResolvedValue({ promedio: 0, total_calificaciones: 0, calificaciones: [] });
    render(<Calificaciones user={{ id: 8 }} onBack={vi.fn()} />);
    expect(await screen.findByText("Aún no tienes calificaciones.")).toBeTruthy();
  });

  it("muestra el error de consulta", async () => {
    apiRequest.mockRejectedValue(new Error("Servicio no disponible"));
    render(<Calificaciones user={{ id: 7 }} onBack={vi.fn()} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Servicio no disponible");
  });

  it("envía una calificación al conductor y muestra errores del formulario", async () => {
    apiRequest.mockResolvedValue({});
    render(<FormularioCalificacion viajeId={10} />);
    fireEvent.change(screen.getByLabelText("Puntuación"), { target: { value: "5" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enviar calificación" }).closest("form"));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/api/ratings/driver", expect.objectContaining({ method: "POST" })));
    expect((await screen.findByRole("status")).textContent).toContain("Calificación enviada correctamente.");

    apiRequest.mockRejectedValue(new Error("No permitido"));
    fireEvent.change(screen.getByLabelText("Puntuación"), { target: { value: "3" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enviar calificación" }).closest("form"));
    expect((await screen.findByRole("status")).textContent).toContain("No permitido");
  });

  it("envía una calificación al pasajero", async () => {
    apiRequest.mockResolvedValue({});
    render(<FormularioCalificacion viajeId={10} pasajeroId={4} conductor />);
    fireEvent.change(screen.getByLabelText("Puntuación"), { target: { value: "4" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enviar calificación" }).closest("form"));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/api/ratings/passenger", expect.objectContaining({ method: "POST" })));
  });
});
