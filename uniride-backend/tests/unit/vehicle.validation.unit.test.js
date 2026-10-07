/**
 * Pruebas unitarias para validación de datos de vehículos.
 * Issue #72: Pruebas unitarias de vehículos y roles.
 */

const validateMiddleware = require("../../middlewares/validateMiddleware");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("validateMiddleware.validateVehicle", () => {
  const validPayload = {
    marca: "Nissan",
    modelo: "Versa",
    anio: 2022,
    color: "Blanco",
    placa: "SAL-102",
    asientos_disponibles: 4,
  };

  test("pasa exitosamente con next() cuando todos los datos son válidos", () => {
    const req = { body: { ...validPayload } };
    const res = createMockRes();
    const next = jest.fn();

    validateMiddleware.validateVehicle(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("rechaza marca vacía o menor a 2 caracteres", () => {
    const invalidMarcas = ["", "A", null, undefined];
    for (const marca of invalidMarcas) {
      const req = { body: { ...validPayload, marca } };
      const res = createMockRes();
      const next = jest.fn();

      validateMiddleware.validateVehicle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/marca es obligatoria/) })
      );
      expect(next).not.toHaveBeenCalled();
    }
  });

  test("rechaza modelo vacío o no string", () => {
    const req = { body: { ...validPayload, modelo: "" } };
    const res = createMockRes();
    const next = jest.fn();

    validateMiddleware.validateVehicle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/modelo es obligatorio/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("rechaza año si es inválido o no es número entero", () => {
    const invalidAnios = [null, undefined, "dos_mil_veinte", 2022.5];
    for (const anio of invalidAnios) {
      const req = { body: { ...validPayload, anio } };
      const res = createMockRes();
      const next = jest.fn();

      validateMiddleware.validateVehicle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/año es obligatorio y debe ser un número entero/) })
      );
      expect(next).not.toHaveBeenCalled();
    }
  });

  test("rechaza color vacío o menor a 2 caracteres", () => {
    const req = { body: { ...validPayload, color: "R" } };
    const res = createMockRes();
    const next = jest.fn();

    validateMiddleware.validateVehicle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/color es obligatorio/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("rechaza placa vacía", () => {
    const req = { body: { ...validPayload, placa: "" } };
    const res = createMockRes();
    const next = jest.fn();

    validateMiddleware.validateVehicle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/placa es obligatoria/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("rechaza asientos_disponibles si no es número entero", () => {
    const invalidAsientos = [null, undefined, "cuatro", 3.5];
    for (const asientos of invalidAsientos) {
      const req = { body: { ...validPayload, asientos_disponibles: asientos } };
      const res = createMockRes();
      const next = jest.fn();

      validateMiddleware.validateVehicle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/asientos disponibles son obligatorios/) })
      );
      expect(next).not.toHaveBeenCalled();
    }
  });
});

describe("validateMiddleware.validateVehicleStatus", () => {
  test("pasa exitosamente cuando activo es boolean true o false", () => {
    for (const activo of [true, false]) {
      const req = { body: { activo } };
      const res = createMockRes();
      const next = jest.fn();

      validateMiddleware.validateVehicleStatus(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  test("rechaza cuando activo no es boolean (ej. string, number o ausente)", () => {
    const invalidActivos = ["true", "false", 1, 0, null, undefined];
    for (const activo of invalidActivos) {
      const req = { body: { activo } };
      const res = createMockRes();
      const next = jest.fn();

      validateMiddleware.validateVehicleStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/campo activo es obligatorio y debe ser true o false/) })
      );
      expect(next).not.toHaveBeenCalled();
    }
  });
});
