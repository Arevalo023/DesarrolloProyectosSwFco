import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Login from "@/pages/Login";

describe("Login: mostrar y ocultar contraseña", () => {
  test("alterna el tipo del campo sin cambiar el valor escrito", () => {
    render(<Login />);
    const password = screen.getByLabelText("CONTRASEÑA");

    fireEvent.change(password, { target: { value: "MiClave123!" } });
    expect(password.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password.type).toBe("text");
    expect(password.value).toBe("MiClave123!");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(password.type).toBe("password");
    expect(password.value).toBe("MiClave123!");
  });
});
