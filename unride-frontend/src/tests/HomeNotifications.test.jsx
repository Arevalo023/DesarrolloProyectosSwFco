import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/services/api";
import Home from "@/pages/Home";

describe("Home: acceso a notificaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockImplementation((endpoint) => {
      if (endpoint === "/api/notifications") {
        return Promise.resolve({
          notifications: [{ id: 1, leida: false }],
        });
      }
      return Promise.resolve({ reservations: [] });
    });
  });

  test("muestra la campana junto al perfil con indicador para notificaciones nuevas", async () => {
    const onNotificaciones = vi.fn();
    render(
      <Home
        user={{ id: 3, nombre: "Alex", roles: ["Pasajero"] }}
        rolActivo="Pasajero"
        onNotificaciones={onNotificaciones}
      />
    );

    const campana = await screen.findByRole("button", {
      name: "Notificaciones (nuevas)",
    });
    expect(campana.querySelector("span")).toBeTruthy();
    expect(apiRequest).toHaveBeenCalledWith("/api/notifications");

    fireEvent.click(campana);
    expect(onNotificaciones).toHaveBeenCalledOnce();
  });
});
