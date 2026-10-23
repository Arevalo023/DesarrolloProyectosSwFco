import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/services/api";
import Register from "@/pages/Register";

const completarFormulario = (overrides = {}) => {
  const values = {
    nombre: "Ana",
    apellido: "Lopez",
    "register-email": "ana@universidad.edu.mx",
    telefono: "",
    "register-password": "Clave123!",
    "confirm-password": "Clave123!",
    ...overrides,
  };
  const labels = {
    nombre: "NOMBRE",
    apellido: "APELLIDO",
    "register-email": "CORREO INSTITUCIONAL",
    telefono: /TELÉFONO/,
    "register-password": "CONTRASEÑA",
    "confirm-password": "CONFIRMAR CONTRASEÑA",
  };

  for (const [id, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(labels[id]), { target: { value } });
  }
};

const enviarFormulario = () => {
  fireEvent.submit(screen.getByRole("button", { name: /Registrarme/i }).closest("form"));
};

describe("Registro de usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test.each([
    [{ nombre: "A" }, "El nombre es obligatorio y debe tener al menos 2 caracteres"],
    [{ apellido: "L" }, "El apellido es obligatorio y debe tener al menos 2 caracteres"],
    [{ "register-email": "ana@example.com" }, "Usa un correo institucional válido"],
    [{ telefono: "123456789" }, "El teléfono debe contener 10 dígitos"],
    [{ "register-password": "clave123!" }, "La contraseña debe tener al menos 8 caracteres"],
    [{ "register-password": "Claveabc!" }, "La contraseña debe tener al menos 8 caracteres"],
    [{ "register-password": "Clave1234" }, "La contraseña debe tener al menos 8 caracteres"],
    [{ "confirm-password": "Otra123!" }, "Las contraseñas no coinciden"],
  ])("rechaza datos inválidos y muestra el error correspondiente", async (overrides, error) => {
    render(<Register />);
    completarFormulario(overrides);

    enviarFormulario();

    expect(await screen.findByText(new RegExp(error))).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  test("registra correctamente, envía los datos y vuelve al login", async () => {
    const onBackToLogin = vi.fn();
    apiRequest.mockResolvedValue({ message: "Usuario registrado exitosamente." });
    render(<Register onBackToLogin={onBackToLogin} />);
    completarFormulario({ telefono: "844-123-4567" });
    fireEvent.change(screen.getByLabelText("CAMPUS"), { target: { value: "2" } });

    enviarFormulario();

    await waitFor(() => expect(onBackToLogin).toHaveBeenCalledOnce());
    expect(apiRequest).toHaveBeenCalledWith("/users/register", {
      method: "POST",
      body: {
        nombre: "Ana",
        apellido: "Lopez",
        correo: "ana@universidad.edu.mx",
        password: "Clave123!",
        telefono: "844-123-4567",
        campus_id: 2,
      },
      auth: false,
    });
  });

  test("envía null si el teléfono opcional está vacío", async () => {
    apiRequest.mockResolvedValue({});
    render(<Register onBackToLogin={vi.fn()} />);
    completarFormulario();

    enviarFormulario();

    await waitFor(() => expect(apiRequest).toHaveBeenCalledOnce());
    expect(apiRequest.mock.calls[0][1].body.telefono).toBeNull();
  });

  test("muestra el error del servidor y no navega al login", async () => {
    const onBackToLogin = vi.fn();
    apiRequest.mockRejectedValue(new Error("El correo ya está registrado"));
    render(<Register onBackToLogin={onBackToLogin} />);
    completarFormulario();

    enviarFormulario();

    expect(await screen.findByText("El correo ya está registrado")).toBeTruthy();
    expect(onBackToLogin).not.toHaveBeenCalled();
  });
});
