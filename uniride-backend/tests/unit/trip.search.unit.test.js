jest.mock("../../config/db", () => {
  const request = {
    input: jest.fn().mockReturnThis(),
    query: jest.fn(),
  };

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/trips filtros", () => {
  test("pasa filtros opcionales normalizados y responde con lista vacía", async () => {
    tripService.listAvailable.mockResolvedValue([]);
    const req = {
      query: {
        origen: "  Campus  ",
        destino: "  Centro  ",
        fecha: "2026-10-11",
        fecha_inicio: "2026-10-10",
        fecha_fin: "2026-10-12",
        hora_desde: "08:30",
        hora_hasta: "12:00",
        cupo_minimo: "2",
      },
    };
    const res = createMockRes();

    await tripController.listAvailable(req, res);

    expect(tripService.listAvailable).toHaveBeenCalledWith({
      origen: "Campus",
      destino: "Centro",
      fecha: "2026-10-11",
      fechaInicio: "2026-10-10",
      fechaFin: "2026-10-12",
      horaDesde: "08:30",
      horaHasta: "12:00",
      cupoMinimo: 2,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ trips: [] });
  });

  test("rechaza fechas inválidas, rangos invertidos y cupos no enteros", async () => {
    for (const query of [
      { fecha_inicio: "2026-02-30" },
      { fecha_inicio: "2026-10-12", fecha_fin: "2026-10-10" },
      { hora_desde: "25:00" },
      { hora_desde: "12:00", hora_hasta: "08:00" },
      { cupo_minimo: "1.5" },
      { fecha_inicio: ["2026-10-10", "2026-10-12"] },
    ]) {
      const res = createMockRes();
      await tripController.listAvailable({ query }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }

    expect(tripService.listAvailable).not.toHaveBeenCalled();
  });

  test("aplica los parámetros como filtros SQL opcionales", async () => {
    mockRequest.query.mockResolvedValue({ recordset: [] });

    const trips = await tripModel.findAvailable({
      origen: "Campus",
      destino: "Centro",
      fecha: null,
      fechaInicio: "2026-10-10",
      fechaFin: "2026-10-12",
      horaDesde: "08:30",
      horaHasta: "12:00",
      cupoMinimo: 2,
    });

    expect(trips).toEqual([]);
    expect(mockRequest.input).toHaveBeenCalledWith("fecha_inicio", "Date", "2026-10-10");
    expect(mockRequest.input).toHaveBeenCalledWith("fecha_fin", "Date", "2026-10-12");
    expect(mockRequest.input).toHaveBeenCalledWith("hora_desde", "Time", "08:30");
    expect(mockRequest.input).toHaveBeenCalledWith("hora_hasta", "Time", "12:00");
    expect(mockRequest.input).toHaveBeenCalledWith("cupo_minimo", "Int", 2);
    expect(mockRequest.query.mock.calls[0][0]).toContain("v.fecha_salida >= @fecha_inicio");
    expect(mockRequest.query.mock.calls[0][0]).toContain("v.fecha_salida < DATEADD(day, 1, @fecha_fin)");
    expect(mockRequest.query.mock.calls[0][0]).toContain("CONVERT(time, v.fecha_salida) >= @hora_desde");
    expect(mockRequest.query.mock.calls[0][0]).toContain("CONVERT(time, v.fecha_salida) <= @hora_hasta");
    expect(mockRequest.query.mock.calls[0][0]).toContain("v.cupo_disponible >= @cupo_minimo");
  });

  test("admite cupo_minimo igual a 0 y filtros parciales", async () => {
    tripService.listAvailable.mockResolvedValue([]);
    const req = {
      query: {
        origen: "Campus Poniente",
        cupo_minimo: "0",
      },
    };
    const res = createMockRes();

    await tripController.listAvailable(req, res);

    expect(tripService.listAvailable).toHaveBeenCalledWith({
      origen: "Campus Poniente",
      destino: null,
      fecha: null,
      fechaInicio: null,
      fechaFin: null,
      horaDesde: null,
      horaHasta: null,
      cupoMinimo: 0,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ trips: [] });
  });

  test("rechaza cupo_minimo negativo y valores no numéricos", async () => {
    for (const invalidCupo of ["-1", "-5", "abc", "999999999999999999999"]) {
      const res = createMockRes();
      await tripController.listAvailable({ query: { cupo_minimo: invalidCupo } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "El cupo mínimo debe ser un número entero mayor o igual a cero.",
      });
    }

    expect(tripService.listAvailable).not.toHaveBeenCalled();
  });

  test("retorna 500 cuando el servicio falla", async () => {
    tripService.listAvailable.mockRejectedValue(new Error("Database error"));
    const res = createMockRes();

    await tripController.listAvailable({ query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "No se pudieron obtener los viajes.",
    });
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
});