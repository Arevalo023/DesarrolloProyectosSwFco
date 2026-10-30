import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Administracion from "@/pages/Administracion";

vi.mock("@/components/Logo", () => ({ default: () => <span>UniRide</span> }));
vi.mock("@/services/api", () => ({
  apiRequest: vi.fn().mockResolvedValue({
    metricas: { usuarios: 3, viajes: 2, reservaciones: 4 },
  }),
}));

describe("Estructura del módulo de administración", () => {
  test("muestra el panel y permite navegar entre secciones", () => {
    render(<Administracion onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Administración" })).toBeTruthy();
    expect(screen.getByText("Vista general del panel administrativo.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Usuarios" }));
    expect(screen.getByText("Consulta y búsqueda de usuarios registrados.")).toBeTruthy();
  });

  test("permite abrir el perfil y cerrar sesión desde el menú", () => {
    const onProfile = vi.fn();
    const onLogout = vi.fn();
    render(<Administracion onProfile={onProfile} onLogout={onLogout} />);

    fireEvent.click(screen.getByRole("button", { name: "Mi perfil" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(onProfile).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /Volver al inicio/i })).toBeNull();
  });
});
