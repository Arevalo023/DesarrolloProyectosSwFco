import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Administracion from "@/pages/Administracion";

vi.mock("@/components/Logo", () => ({ default: () => <span>UniRide</span> }));

describe("Estructura del módulo de administración", () => {
  test("muestra el panel y permite navegar entre secciones", () => {
    render(<Administracion onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Administración" })).toBeTruthy();
    expect(screen.getByText("Vista general del panel administrativo.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Usuarios" }));
    expect(screen.getByText("Espacio reservado para la administración de usuarios.")).toBeTruthy();
  });

  test("permite volver al inicio", () => {
    const onBack = vi.fn();
    render(<Administracion onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Volver al inicio/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
