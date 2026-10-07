import { describe, beforeEach, test, expect } from "vitest";
import {
  iniciarSesion,
  cerrarSesion,
  obtenerToken,
  obtenerUsuario,
  obtenerRolActivo,
} from "@/services/session";

describe("Persistencia de sesión", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("guarda la sesión en localStorage", () => {
    const user = {
      id: 5,
      nombre: "Erika",
      roles: ["Pasajero"],
    };

    iniciarSesion({
      token: "token-prueba",
      user,
    });

    expect(
      obtenerToken()
    ).toBe("token-prueba");

    expect(
      obtenerUsuario()
    ).toEqual(user);

    expect(
      obtenerRolActivo()
    ).toBe("Pasajero");
  });

  test("la sesión permanece disponible después de volver a leer localStorage", () => {
    const user = {
      id: 5,
      nombre: "Erika",
      roles: ["Conductor"],
    };

    iniciarSesion({
      token: "token-persistente",
      user,
    });

    expect(
      localStorage.getItem("token")
    ).toBe("token-persistente");

    expect(
      JSON.parse(
        localStorage.getItem("usuario")
      )
    ).toEqual(user);
  });

  test("cerrarSesion elimina toda la sesión", () => {
    iniciarSesion({
      token: "token-prueba",
      user: {
        id: 5,
        roles: ["Pasajero"],
      },
    });

    cerrarSesion();

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
});