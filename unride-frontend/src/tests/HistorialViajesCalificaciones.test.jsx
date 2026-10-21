import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ViajesCompletados from "@/pages/ViajesCompletados";
import { apiRequest } from "@/services/api";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

const viaje = { id: 25, conductor_id: 9, origen: "Arteaga", destino: "Poniente", estado: "finalizado" };
const solicitud = { id: 50, viaje_id: 25, pasajero_id: 12, pasajero_nombre: "María López", estado: "aceptada" };

function mockDatos(calificaciones = []) {
  apiRequest.mockImplementation(async (url, options) => {
    if (url === "/api/trips/driver") return { trips: [viaje] };
    if (url === "/api/trips/driver/requests") return { requests: [solicitud] };
    if (url === "/api/ratings/user/12") return { calificaciones };
    if (url === "/api/ratings/passenger" && options?.method === "POST") return { message: "Registrada" };
    throw new Error(`Ruta inesperada: ${url}`);
  });
}

describe("Issue #118: calificación de pasajeros", () => {
  beforeEach(() => vi.clearAllMocks());

  test("permite calificar con estrellas y comentario opcional", async () => {
    mockDatos();
    render(<ViajesCompletados onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Calificar pasajero/i }));
    expect(screen.getByRole("button", { name: "Enviar calificación" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "5 estrellas" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar calificación" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/api/ratings/passenger", {
      method: "POST", body: { viaje_id: 25, pasajero_id: 12, puntuacion: 5, comentario: null },
    }));
    expect(await screen.findByText(/Ya calificado/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Calificar pasajero/i })).toBeNull();
  });

  test("no deja enviar una calificación ya existente", async () => {
    mockDatos([{ viaje_id: 25, calificador_id: 9, calificado_id: 12, puntuacion: 4 }]);
    render(<ViajesCompletados onBack={vi.fn()} />);
    expect(await screen.findByText(/Ya calificado/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Calificar pasajero/i })).toBeNull();
  });
});
