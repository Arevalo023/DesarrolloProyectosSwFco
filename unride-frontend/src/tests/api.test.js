import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { apiRequest } from "@/services/api";

describe("apiRequest y token expirado", () => {
  beforeEach(() => {
    localStorage.clear();

    vi.restoreAllMocks();
  });

  test("elimina la sesión cuando el backend responde 401", async () => {
    localStorage.setItem(
      "token",
      "token-expirado"
    );

    localStorage.setItem(
      "usuario",
      JSON.stringify({
        id: 5,
        roles: ["Pasajero"],
      })
    );

    localStorage.setItem(
      "rolActivo",
      "Pasajero"
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,

      json: async () => ({
        message:
          "Token expirado",
      }),
    });

    await expect(
      apiRequest(
        "/api/trips/driver"
      )
    ).rejects.toThrow(
      "Token expirado"
    );

    expect(
      localStorage.getItem("token")
    ).toBeNull();

    expect(
      localStorage.getItem("usuario")
    ).toBeNull();

    expect(
      localStorage.getItem("rolActivo")
    ).toBeNull();
  });

  test("dispara auth:logout cuando recibe 401", async () => {
    localStorage.setItem(
      "token",
      "token-expirado"
    );

    localStorage.setItem(
      "usuario",
      JSON.stringify({
        id: 5,
        roles: ["Pasajero"],
      })
    );

    const listener =
      vi.fn();

    window.addEventListener(
      "auth:logout",
      listener
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,

      json: async () => ({
        message:
          "Sesión expirada",
      }),
    });

    try {
      await apiRequest(
        "/api/trips/driver"
      );
    } catch {
      // El error es esperado.
    }

    expect(
      listener
    ).toHaveBeenCalledTimes(1);

    window.removeEventListener(
      "auth:logout",
      listener
    );
  });
});