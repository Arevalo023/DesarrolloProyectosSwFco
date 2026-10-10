jest.mock("../../config/db", () => {
  const request = { input: jest.fn().mockReturnThis(), query: jest.fn() };
  return {
    sql: {
      VarChar: jest.fn((length) => `VarChar(${length})`),
      Date: "Date",
      Time: "Time",
      Int: "Int",
    },
    poolPromise: Promise.resolve({ request: jest.fn(() => request) }),
    mockRequest: request,
  };
});

jest.mock("../../services/tripService", () => ({
  listAvailable: jest.fn(),
  cancel: jest.fn(),
}));
jest.mock("../../services/reservationService", () => ({}));

const { mockRequest } = require("../../config/db");
const tripService = require("../../services/tripService");
const tripModel = require("../../models/tripModel");
const tripController = require("../../controllers/tripController");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe("GET /api/trips", () => {
  test("normaliza filtros y devuelve metadatos de paginación", async () => {
    tripService.listAvailable.mockResolvedValue([]);
    const res = createMockRes();
    await tripController.listAvailable({
      user: { id: 7 },
      query: {
        origen: " Campus ", destino: " Centro ", fecha: "2026-10-11",
        fecha_inicio: "2026-10-10", fecha_fin: "2026-10-12",
        hora_desde: "08:30", hora_hasta: "12:00", cupo_minimo: "2",
      },
    }, res);

    expect(tripService.listAvailable).toHaveBeenCalledWith({
      origen: "Campus", destino: "Centro", fecha: "2026-10-11",
      fechaInicio: "2026-10-10", fechaFin: "2026-10-12",
      horaDesde: "08:30", horaHasta: "12:00", cupoMinimo: 2,
      conductorId: 7, limit: 10, offset: 0,
    });
    expect(res.json).toHaveBeenCalledWith({
      trips: [],
      pagination: { limit: 10, offset: 0, hasMore: false, nextOffset: null },
    });
  });

  test("rechaza rangos de fechas/horas y parámetros de paginación inválidos", async () => {
    for (const query of [
      { fecha_inicio: "2026-02-30" },
      { fecha_inicio: "2026-10-12", fecha_fin: "2026-10-10" },
      { hora_desde: "25:00" },
      { hora_desde: "12:00", hora_hasta: "08:00" },
      { limit: "51" },
      { offset: "-1" },
    ]) {
      const res = createMockRes();
      await tripController.listAvailable({ user: { id: 1 }, query }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(tripService.listAvailable).not.toHaveBeenCalled();
  });

  test("admite cupo mínimo cero y filtros parciales", async () => {
    tripService.listAvailable.mockResolvedValue([]);
    const res = createMockRes();
    await tripController.listAvailable({
      user: { id: 8 },
      query: { origen: "Campus Poniente", cupo_minimo: "0" },
    }, res);

    expect(tripService.listAvailable).toHaveBeenCalledWith(expect.objectContaining({
      origen: "Campus Poniente",
      cupoMinimo: 0,
      conductorId: 8,
      limit: 10,
      offset: 0,
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("devuelve error genérico cuando falla la búsqueda", async () => {
    tripService.listAvailable.mockRejectedValue(new Error("Database error"));
    const res = createMockRes();
    await tripController.listAvailable({ user: { id: 1 }, query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "No se pudieron obtener los viajes." });
  });

  test("usa paginación parametrizada y excluye al conductor actual", async () => {
    mockRequest.query.mockResolvedValue({ recordset: [] });
    await tripModel.findAvailable({
      origen: "Campus", destino: "Centro", horaDesde: "08:30",
      conductorId: 4, limit: 10, offset: 10,
    });

    expect(mockRequest.input).toHaveBeenCalledWith("conductor_id", "Int", 4);
    expect(mockRequest.input).toHaveBeenCalledWith("limit", "Int", 11);
    expect(mockRequest.input).toHaveBeenCalledWith("offset", "Int", 10);
    expect(mockRequest.query.mock.calls[0][0]).toContain("v.conductor_id <> @conductor_id");
    expect(mockRequest.query.mock.calls[0][0]).toContain("OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY");
  });
});

describe("PATCH /api/trips/:id/cancel", () => {
  test("persiste y responde el viaje cancelado", async () => {
    const canceledTrip = {
      id: 7,
      estado: "cancelado",
      motivo_cancelacion: "Cambio de planes",
    };
    tripService.cancel.mockResolvedValue(canceledTrip);
    const req = {
      params: { id: "7" },
      user: { id: 3 },
      body: { motivo_cancelacion: "  Cambio de planes  " },
    };
    const res = createMockRes();

    await tripController.cancel(req, res);

    expect(tripService.cancel).toHaveBeenCalledWith(7, 3, "Cambio de planes");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Viaje cancelado correctamente.",
      trip: canceledTrip,
    });
  });

  test("rechaza motivos demasiado largos sin llamar al servicio", async () => {
    const req = {
      params: { id: "7" },
      user: { id: 3 },
      body: { motivo_cancelacion: "x".repeat(251) },
    };
    const res = createMockRes();

    await tripController.cancel(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(tripService.cancel).not.toHaveBeenCalled();
  });

  test("acepta cancelar sin motivo cuando el cliente envía null", async () => {
    const canceledTrip = { id: 7, estado: "cancelado", motivo_cancelacion: null };
    tripService.cancel.mockResolvedValue(canceledTrip);
    const req = {
      params: { id: "7" },
      user: { id: 3 },
      body: { motivo_cancelacion: null },
    };
    const res = createMockRes();

    await tripController.cancel(req, res);

    expect(tripService.cancel).toHaveBeenCalledWith(7, 3, null);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Viaje cancelado correctamente.",
      trip: canceledTrip,
    });
  });
});