import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/services/api";
import MisViajes from "@/pages/MisViajes";

const futureDate = () => "2026-10-25";

describe("MisViajes: Clasificación por estado y persistencia (Issue #105)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("clasifica y muestra etiquetas correctas para viajes programados, en curso, finalizados y cancelados", async () => {
    apiRequest.mockImplementation(async (url) => {
      if (url === "/api/trips/driver") {
        return {
          trips: [
            {
              id: 1,
              origen: "Campus Arteaga",
              destino: "Zona Centro",
              fecha_salida: futureDate(),
              cupo_disponible: 3,
              costo_por_pasajero: 25,
              estado: "programado",
            },
            {
              id: 2,
              origen: "Campus Poniente",
              destino: "Rectoría",
              fecha_salida: futureDate(),
              cupo_disponible: 2,
              costo_por_pasajero: 20,
              estado: "en curso",
            },
            {
              id: 3,
              origen: "Facultad de Sistemas",
              destino: "Plaza Sendero",
              fecha_salida: futureDate(),
              cupo_disponible: 0,
              costo_por_pasajero: 15,
              estado: "finalizado",
            },
            {
              id: 4,
              origen: "Campus Central",
              destino: "Aeropuerto",
              fecha_salida: futureDate(),
              cupo_disponible: 4,
              costo_por_pasajero: 30,
              estado: "cancelado",
              motivo_cancelacion: "Lluvia intensa",
            },
          ],
        };
      }
      return { requests: [] };
    });

    render(<MisViajes onBackHome={vi.fn()} />);

    // Verificar que cada estado se identifique y renderice correctamente
    expect(await screen.findByText("Programado")).toBeTruthy();
    expect(screen.getByText("En curso")).toBeTruthy();
    expect(screen.getByText("Finalizado")).toBeTruthy();
    expect(screen.getByText("Cancelado")).toBeTruthy();

    // Acciones y mensajes por estado
    expect(screen.getByText("Este viaje ya finalizó.")).toBeTruthy();
    expect(screen.getByText("Este viaje está cancelado y ya no tiene acciones disponibles.")).toBeTruthy();
    expect(screen.getByText(/Lluvia intensa/)).toBeTruthy();
  });

  test("cubre el caso de lista vacía mostrando el estado vacío correspondiente", async () => {
    apiRequest.mockResolvedValue({ trips: [], requests: [] });

    render(<MisViajes onBackHome={vi.fn()} />);

    expect(await screen.findByText("No tienes viajes publicados")).toBeTruthy();
    expect(
      screen.getByText(
        "Cuando publiques un viaje, aparecerá aquí para que puedas administrarlo."
      )
    ).toBeTruthy();
  });

  test("persistencia tras recargar: refleja cambios de estado sin duplicidad", async () => {
    // Primera carga: viaje programado
    apiRequest.mockResolvedValue({
      trips: [
        {
          id: 50,
          origen: "Campus Poniente",
          destino: "Centro",
          fecha_salida: futureDate(),
          cupo_disponible: 2,
          costo_por_pasajero: 20,
          estado: "programado",
        },
      ],
      requests: [],
    });

    const { unmount } = render(<MisViajes onBackHome={vi.fn()} />);
    expect(await screen.findByText("Programado")).toBeTruthy();
    unmount();

    // Simular recarga tras transición en backend a finalizado
    apiRequest.mockResolvedValue({
      trips: [
        {
          id: 50,
          origen: "Campus Poniente",
          destino: "Centro",
          fecha_salida: futureDate(),
          cupo_disponible: 2,
          costo_por_pasajero: 20,
          estado: "finalizado",
        },
      ],
      requests: [],
    });

    render(<MisViajes onBackHome={vi.fn()} />);
    expect(await screen.findByText("Finalizado")).toBeTruthy();
    expect(screen.queryByText("Programado")).toBeNull();
  });
});
