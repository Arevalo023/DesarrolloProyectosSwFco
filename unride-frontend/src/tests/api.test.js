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

  test("adjunta el token y el rol activo en peticiones protegidas", async () => {
    localStorage.setItem("token", "token-valido");
    localStorage.setItem("rolActivo", "Conductor");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ trips: [] }),
    });

    await apiRequest("/api/trips/driver");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/trips/driver",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-valido",
          "X-Active-Role": "Conductor",
        },
      })
    );
  });

  test("no adjunta credenciales en peticiones públicas", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: "token-nuevo" }),
    });

    await apiRequest("/users/login", {
      method: "POST",
      body: { email: "user@uadec.edu.mx", password: "password" },
      auth: false,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/users/login",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  test.each([
    [403, "No autorizado"],
    [500, "Error interno"],
  ])("expone errores HTTP %s del backend", async (status, message) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ message }),
    });

    await expect(apiRequest("/api/trips")).rejects.toMatchObject({
      message,
      status,
    });
  });
});