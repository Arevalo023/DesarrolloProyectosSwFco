import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import ProtectedRoute from "@/components/ProtectedRoute";

vi.mock("@/pages/Login", () => ({
  default: () => (
    <div>
      Login
    </div>
  ),
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("muestra Login si el usuario no estÃ¡ autenticado", () => {
    render(
      <ProtectedRoute>
        <div>
          Contenido privado
        </div>
      </ProtectedRoute>
    );

    expect(
      screen.getByText("Login")
    ).toBeTruthy();

    expect(
      screen.queryByText("Contenido privado")
    ).toBeNull();
  });

  test("ejecuta onUnauthorized cuando no existe sesiÃ³n", async () => {
    const onUnauthorized = vi.fn();

    render(
      <ProtectedRoute
        onUnauthorized={onUnauthorized}
      >
        <div>
          Contenido privado
        </div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(
        onUnauthorized
      ).toHaveBeenCalled();
    });
  });

  test("muestra contenido privado cuando existe una sesiÃ³n vÃ¡lida", () => {
    localStorage.setItem(
      "token",
      "token-valido"
    );

    localStorage.setItem(
      "usuario",
      JSON.stringify({
        id: 5,
        nombre: "Erika",
        roles: ["Pasajero"],
      })
    );

    render(
      <ProtectedRoute>
        <div>
          Contenido privado
        </div>
      </ProtectedRoute>
    );

    expect(
      screen.getByText("Contenido privado")
    ).toBeTruthy();
  });

  test("bloquea el acceso cuando el usuario no tiene el rol permitido", async () => {
    localStorage.setItem(
      "token",
      "token-valido"
    );

    localStorage.setItem(
      "usuario",
      JSON.stringify({
        id: 5,
        roles: ["Pasajero"],
      })
    );

    const onUnauthorized = vi.fn();

    render(
      <ProtectedRoute
        allowedRoles={["Conductor"]}
        onUnauthorized={onUnauthorized}
      >
        <div>
          Panel conductor
        </div>
      </ProtectedRoute>
    );

    expect(
      screen.queryByText("Panel conductor")
    ).toBeNull();

    await waitFor(() => {
      expect(
        onUnauthorized
      ).toHaveBeenCalled();
    });
  });

  // ISSUE #111: acceso permitido al administrador.
  test("permite el acceso al administrador autenticado", () => {
    localStorage.setItem(
      "token",
      "token-valido"
    );

    localStorage.setItem(
      "usuario",
      JSON.stringify({
        id: 1,
        nombre: "Administrador",
        roles: ["Administrador"],
      })
    );

    render(
      <ProtectedRoute
        allowedRoles={["Administrador"]}
      >
        <div>
          Panel de administraciÃ³n
        </div>
      </ProtectedRoute>
    );

    expect(
      screen.getByText("Panel de administraciÃ³n")
    ).toBeTruthy();
  });

  // ISSUE #111: los demÃ¡s roles no deben entrar.
  test.each(["Pasajero", "Conductor"])(
    "deniega el acceso al rol %s",
    async (rol) => {
      localStorage.setItem(
        "token",
        "token-valido"
      );

      localStorage.setItem(
        "usuario",
        JSON.stringify({
          id: 2,
          roles: [rol],
        })
      );

      const onUnauthorized = vi.fn();

      render(
        <ProtectedRoute
          allowedRoles={["Administrador"]}
          onUnauthorized={onUnauthorized}
        >
          <div>
            Panel de administraciÃ³n
          </div>
        </ProtectedRoute>
      );

      expect(
        screen.queryByText("Panel de administraciÃ³n")
      ).toBeNull();

      await waitFor(() => {
        expect(
          onUnauthorized
        ).toHaveBeenCalled();
      });
    }
  );

  test("reconoce el rol autorizado sin distinguir mayÃºsculas", () => {
    localStorage.setItem(
      "token",
      "token-valido"
    );

    localStorage.setItem(
      "usuario",
      JSON.stringify({
        id: 3,
        roles: ["administrador"],
      })
    );

    render(
      <ProtectedRoute
        allowedRoles={["Administrador"]}
      >
        <div>
          Panel de administraciÃ³n
        </div>
      </ProtectedRoute>
    );

    expect(
      screen.getByText("Panel de administraciÃ³n")
    ).toBeTruthy();
  });
});
