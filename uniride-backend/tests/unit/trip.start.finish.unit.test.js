/**
 * Pruebas unitarias para endpoints y lógica de Iniciar y Finalizar Viaje.
 * Issue #97: Endpoints de iniciar y finalizar viaje.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const db = require("../helpers/mockDb");
const tripModel = require("../../models/tripModel");
const tripService = require("../../services/tripService");
const tripController = require("../../controllers/tripController");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe("Controlador: PATCH /api/trips/:id/start", () => {
  test("rechaza IDs de viaje inválidos con 400", async () => {
    const res = createMockRes();
    await tripController.start({ params: { id: "invalido" }, user: { id: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "El ID del viaje debe ser un número entero positivo.",
    });

    await tripController.start({ params: { id: "-5" }, user: { id: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("inicia viaje exitosamente con 200", async () => {
    const mockTrip = { id: 10, estado: "en_curso", conductor_id: 1 };
    jest.spyOn(tripService, "start").mockResolvedValue({ trip: mockTrip });

    const res = createMockRes();
    await tripController.start({ params: { id: "10" }, user: { id: 1 } }, res);

    expect(tripService.start).toHaveBeenCalledWith(10, 1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Viaje iniciado correctamente.",
      trip: mockTrip,
    });
  });

  test("rechaza iniciar un viaje que ya está en curso", async () => {
    const error = Object.assign(
      new Error("No es posible iniciar un viaje con estado 'en_curso'. El viaje debe estar 'programado'."),
      { statusCode: 400 }
    );
    jest.spyOn(tripService, "start").mockRejectedValue(error);

    const res = createMockRes();
    await tripController.start({ params: { id: "10" }, user: { id: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: error.message,
    });
  });

  test("propaga errores de negocio con el statusCode adecuado", async () => {
    const error403 = new Error("No tienes permiso para iniciar este viaje.");
    error403.statusCode = 403;
    jest.spyOn(tripService, "start").mockRejectedValue(error403);

    const res = createMockRes();
    await tripController.start({ params: { id: "10" }, user: { id: 99 } }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "No tienes permiso para iniciar este viaje.",
    });
  });
});

describe("Controlador: PATCH /api/trips/:id/finish", () => {
  test("rechaza IDs de viaje inválidos con 400", async () => {
    const res = createMockRes();
    await tripController.finish({ params: { id: "0" }, user: { id: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "El ID del viaje debe ser un número entero positivo.",
    });
  });

  test("finaliza viaje exitosamente con 200", async () => {
    const mockTrip = { id: 10, estado: "finalizado", conductor_id: 1 };
    jest.spyOn(tripService, "finish").mockResolvedValue({ trip: mockTrip });

    const res = createMockRes();
    await tripController.finish({ params: { id: "10" }, user: { id: 1 } }, res);

    expect(tripService.finish).toHaveBeenCalledWith(10, 1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Viaje finalizado correctamente.",
      trip: mockTrip,
    });
  });

  test("rechaza finalizar un viaje que ya está finalizado", async () => {
    const error = Object.assign(
      new Error("No es posible finalizar un viaje con estado 'finalizado'. El viaje debe estar 'en curso'."),
      { statusCode: 400 }
    );
    jest.spyOn(tripService, "finish").mockRejectedValue(error);

    const res = createMockRes();
    await tripController.finish({ params: { id: "10" }, user: { id: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: error.message,
    });
  });

  test("propaga errores 400 cuando el viaje no está en curso", async () => {
    const error400 = new Error("No es posible finalizar un viaje con estado 'programado'. El viaje debe estar 'en curso'.");
    error400.statusCode = 400;
    jest.spyOn(tripService, "finish").mockRejectedValue(error400);

    const res = createMockRes();
    await tripController.finish({ params: { id: "10" }, user: { id: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "No es posible finalizar un viaje con estado 'programado'. El viaje debe estar 'en curso'.",
    });
  });
});

describe("Modelo: tripModel.start", () => {
  test("lanza 404 si el viaje no existe", async () => {
    db.queueResult({ recordset: [] });

    await expect(tripModel.start(999, 1)).rejects.toMatchObject({
      statusCode: 404,
      message: "El viaje no existe.",
    });
    expect(db.lastTransaction).toMatchObject({ committed: false, rolledBack: true });
  });

  test("lanza 403 si el conductor no es el dueño del viaje", async () => {
    db.queueResult({ recordset: [{ id: 10, conductor_id: 2, estado: "programado" }] });

    await expect(tripModel.start(10, 1)).rejects.toMatchObject({
      statusCode: 403,
      message: "No tienes permiso para iniciar este viaje.",
    });
    expect(db.lastTransaction).toMatchObject({ committed: false, rolledBack: true });
  });

  test.each(["en_curso", "activo", "cancelado", "finalizado"])(
    "lanza 400 si el viaje está en estado '%s'",
    async (estado) => {
      db.queueResult({ recordset: [{ id: 10, conductor_id: 1, estado }] });

      await expect(tripModel.start(10, 1)).rejects.toMatchObject({
        statusCode: 400,
        message: `No es posible iniciar un viaje con estado '${estado}'. El viaje debe estar 'programado'.`,
      });
      expect(db.lastTransaction).toMatchObject({ committed: false, rolledBack: true });
      expect(db.requests.some((r) => /UPDATE Viajes/.test(r.text))).toBe(false);
    }
  );

  test("cambia estado a 'en_curso' y hace commit en la transacción", async () => {
    const trip = { id: 10, conductor_id: 1, estado: "programado" };
    const updated = { id: 10, conductor_id: 1, estado: "en_curso" };

    db.queueResult({ recordset: [trip] });
    db.queueResult({ recordset: [updated] });

    const result = await tripModel.start(10, 1);

    expect(result).toEqual({ trip: updated });
    expect(db.lastTransaction).toMatchObject({ committed: true, rolledBack: false });
    expect(db.requests[1].text).toMatch(/UPDATE Viajes/);
    expect(db.requests[1].text).toMatch(/estado = 'en_curso'/);
  });
});

describe("Modelo: tripModel.finish", () => {
  test("lanza 404 si el viaje no existe", async () => {
    db.queueResult({ recordset: [] });

    await expect(tripModel.finish(999, 1)).rejects.toMatchObject({
      statusCode: 404,
      message: "El viaje no existe.",
    });
  });

  test("lanza 403 si el conductor no es el dueño del viaje", async () => {
    db.queueResult({ recordset: [{ id: 10, conductor_id: 2, estado: "en_curso" }] });

    await expect(tripModel.finish(10, 1)).rejects.toMatchObject({
      statusCode: 403,
      message: "No tienes permiso para finalizar este viaje.",
    });
  });

  test.each(["programado", "finalizado", "cancelado"])(
    "lanza 400 si el viaje está en estado '%s'",
    async (estado) => {
      db.queueResult({ recordset: [{ id: 10, conductor_id: 1, estado }] });

      await expect(tripModel.finish(10, 1)).rejects.toMatchObject({
        statusCode: 400,
        message: `No es posible finalizar un viaje con estado '${estado}'. El viaje debe estar 'en curso'.`,
      });
      expect(db.lastTransaction).toMatchObject({ committed: false, rolledBack: true });
      expect(db.requests.some((r) => /UPDATE Viajes/.test(r.text))).toBe(false);
    }
  );

  test("cambia estado a 'finalizado' y hace commit en la transacción", async () => {
    const trip = { id: 10, conductor_id: 1, estado: "en_curso" };
    const updated = { id: 10, conductor_id: 1, estado: "finalizado" };

    db.queueResult({ recordset: [trip] });
    db.queueResult({ recordset: [updated] });

    const result = await tripModel.finish(10, 1);

    expect(result).toEqual({ trip: updated });
    expect(db.lastTransaction).toMatchObject({ committed: true, rolledBack: false });
    expect(db.requests[1].text).toMatch(/UPDATE Viajes/);
    expect(db.requests[1].text).toMatch(/estado = 'finalizado'/);
  });
});
