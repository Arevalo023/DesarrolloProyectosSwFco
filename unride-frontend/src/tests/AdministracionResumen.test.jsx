import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/services/api", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/components/Logo", () => ({
  default: () => <div>Logo</div>,
}));

vi.mock("@/components/admin/ListadoAdministrativo", () => ({
  default: ({ tipo }) => (
    <div data-testid={`listado-${tipo}`}>
      Listado de {tipo}
    </div>
  ),
}));

import { apiRequest } from "@/services/api";
import Administracion from "@/pages/Administracion";

describe("Resumen administrativo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("muestra el estado de carga mientras consulta el resumen", () => {
    apiRequest.mockReturnValue(new Promise(() => {}));

    render(<Administracion />);

    expect(screen.getByRole("status").textContent).toContain(
      "Cargando resumen..."
    );

    expect(apiRequest).toHaveBeenCalledWith("/api/admin/summary");
  });

  test("presenta las tres métricas recibidas del servidor", async () => {
    apiRequest.mockResolvedValue({
      usuarios: 120,
      viajes: 85,
      reservaciones: 42,
    });

    render(<Administracion />);

    expect(await screen.findByText("120")).toBeTruthy();
    expect(screen.getByText("85")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();

    expect(screen.getByText("Usuarios registrados")).toBeTruthy();
    expect(screen.getByText("Viajes registrados")).toBeTruthy();
    expect(screen.getByText("Reservaciones")).toBeTruthy();
  });

  test("acepta las métricas dentro de la propiedad metricas", async () => {
    apiRequest.mockResolvedValue({
      metricas: {
        usuarios: 15,
        viajes: 25,
        reservaciones: 35,
      },
    });

    render(<Administracion />);

    expect(await screen.findByText("15")).toBeTruthy();
    expect(screen.getByText("25")).toBeTruthy();
    expect(screen.getByText("35")).toBeTruthy();
  });

  test("muestra un error cuando falla la consulta del resumen", async () => {
    apiRequest.mockRejectedValue(
      new Error("No se pudo conectar con el servidor")
    );

    render(<Administracion />);

    expect(
      await screen.findByRole("alert")
    ).toBeTruthy();

    expect(
      screen.getByText("No se pudo conectar con el servidor")
    ).toBeTruthy();

    expect(
      screen.getByRole("button", { name: "Reintentar" })
    ).toBeTruthy();
  });

  test("permite reintentar y muestra el resumen después de un error", async () => {
    apiRequest
      .mockRejectedValueOnce(new Error("Error temporal"))
      .mockResolvedValueOnce({
        usuarios: 10,
        viajes: 20,
        reservaciones: 30,
      });

    render(<Administracion />);

    expect(await screen.findByRole("alert")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Reintentar" })
    );

    expect(await screen.findByText("10")).toBeTruthy();
    expect(screen.getByText("20")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();

    expect(screen.queryByRole("alert")).toBeNull();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  test("permite navegar al listado de usuarios desde su tarjeta", async () => {
    apiRequest.mockResolvedValue({
      usuarios: 10,
      viajes: 20,
      reservaciones: 30,
    });

    render(<Administracion />);

    const tarjeta = await screen.findByRole("button", {
      name: /Usuarios registrados/,
    });

    fireEvent.click(tarjeta);

    expect(screen.getByTestId("listado-usuarios")).toBeTruthy();
  });

  test("permite navegar al listado de viajes desde su tarjeta", async () => {
    apiRequest.mockResolvedValue({
      usuarios: 10,
      viajes: 20,
      reservaciones: 30,
    });

    render(<Administracion />);

    const tarjeta = await screen.findByRole("button", {
      name: /Viajes registrados/,
    });

    fireEvent.click(tarjeta);

    expect(screen.getByTestId("listado-viajes")).toBeTruthy();
  });
});
