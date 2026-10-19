
import { describe, it, expect } from "vitest";
import { formatearFechaViaje } from "../utils/fechaViaje";

describe("Issue #101 - Formatos de fecha", () => {
  it("formatea fechas sin hora", () => {
    expect(formatearFechaViaje("2026-10-12"))
      .toBe("lunes, 12 de octubre de 2026");
  });

  it("formatea fechas ISO con hora UTC", () => {
    expect(formatearFechaViaje("2026-10-12T00:00:00.000Z"))
      .toBe("lunes, 12 de octubre de 2026");
  });

  it("mantiene la fecha sin desfase de zona horaria", () => {
    expect(formatearFechaViaje("2026-10-12T23:59:59Z"))
      .toBe("lunes, 12 de octubre de 2026");
  });

  it("rechaza fechas inexistentes", () => {
    expect(formatearFechaViaje("2026-02-30"))
      .toBe("Fecha no disponible");
  });

  it("rechaza valores vacíos", () => {
    expect(formatearFechaViaje(""))
      .toBe("Fecha no disponible");
  });

  it("rechaza fechas mal formadas", () => {
    expect(formatearFechaViaje("fecha incorrecta"))
      .toBe("Fecha no disponible");
  });
});
