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

  test("muestra Login si el usuario no está autenticado", () => {
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
      screen.queryByText(
        "Contenido privado"
      )
    ).toBeNull();
  });

  test("ejecuta onUnauthorized cuando no existe sesión", async () => {
    const onUnauthorized =
      vi.fn();

    render(
      <ProtectedRoute
        onUnauthorized={
          onUnauthorized
        }
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

  test("muestra contenido privado cuando existe una sesión válida", () => {
    localStorage.setItem(
      "token",
      "token-valido"
    );

    localStorage.setItem(
      "usuario",
      JSON.stringify({
        id: 5,
        nombre: "Erika",
        roles: [
          "Pasajero",
        ],
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
      screen.getByText(
        "Contenido privado"
      )
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
        roles: [
          "Pasajero",
        ],
      })
    );

    const onUnauthorized =
      vi.fn();

    render(
      <ProtectedRoute
        allowedRoles={[
          "Conductor",
        ]}
        onUnauthorized={
          onUnauthorized
        }
      >
        <div>
          Panel conductor
        </div>
      </ProtectedRoute>
    );

    expect(
      screen.queryByText(
        "Panel conductor"
      )
    ).toBeNull();

    await waitFor(() => {
      expect(
        onUnauthorized
      ).toHaveBeenCalled();
    });
  });
});