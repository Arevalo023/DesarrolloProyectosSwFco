/**
 * Pruebas unitarias para el sistema de Calificaciones al Conductor.
 * Issue #114: Endpoint para calificar al conductor (Historia HU-18).
 * Issue #113: Modelo de calificaciones.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const db = require("../helpers/mockDb");
const ratingModel = require("../../models/ratingModel");
const ratingService = require("../../services/ratingService");
const ratingController = require("../../controllers/ratingController");
const tripModel = require("../../models/tripModel");

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

describe("Controlador: Calificar al Conductor", () => {
  test("POST /api/trips/:id/rate-driver responde 201 en caso exitoso", async () => {
    const mockRatingResult = {
      message: "Calificación al conductor registrada exitosamente.",
      rating: {
        id: 1,
        viaje_id: 10,
        calificador_id: 5,
        calificado_id: 2,
        puntuacion: 5,
        comentario: "Excelente conductor, muy puntual",
      },
    };

    jest.spyOn(ratingService, "rateDriver").mockResolvedValue(mockRatingResult);

    const req = {
      params: { id: "10" },
      body: { puntuacion: 5, comentario: "Excelente conductor, muy puntual" },
      user: { id: 5 },
    };
    const res = createMockRes();

    await ratingController.rateDriver(req, res);

    expect(ratingService.rateDriver).toHaveBeenCalledWith({
      viajeId: "10",
      calificadorId: 5,
      puntuacion: 5,
      comentario: "Excelente conductor, muy puntual",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockRatingResult);
  });

  test("POST /api/ratings/driver responde 201 admitiendo viaje_id en el body", async () => {
    const mockRatingResult = {
      message: "Calificación al conductor registrada exitosamente.",
      rating: { id: 2, viaje_id: 20, calificador_id: 7, calificado_id: 3, puntuacion: 4 },
    };

    jest.spyOn(ratingService, "rateDriver").mockResolvedValue(mockRatingResult);

    const req = {
      params: {},
      body: { viaje_id: 20, puntuacion: 4 },
      user: { id: 7 },
    };
    const res = createMockRes();

    await ratingController.rateDriver(req, res);

    expect(ratingService.rateDriver).toHaveBeenCalledWith({
      viajeId: 20,
      calificadorId: 7,
      puntuacion: 4,
      comentario: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("propaga statusCode y mensaje de error al fallar", async () => {
    const error = new Error("Solo se puede calificar al conductor cuando el viaje ha finalizado.");
    error.statusCode = 400;
    jest.spyOn(ratingService, "rateDriver").mockRejectedValue(error);

    const req = { params: { id: "10" }, body: { puntuacion: 5 }, user: { id: 2 } };
    const res = createMockRes();

    await ratingController.rateDriver(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: error.message });
  });

  test("GET /api/ratings/user/:id responde 200 con calificaciones y promedio", async () => {
    const mockUserRatings = {
      usuario_id: 2,
      promedio: 4.8,
      total_calificaciones: 12,
      calificaciones: [],
    };
    jest.spyOn(ratingService, "getUserRatings").mockResolvedValue(mockUserRatings);

    const req = { params: { id: "2" }, user: { id: 2 } };
    const res = createMockRes();

    await ratingController.getUserRatings(req, res);

    expect(ratingService.getUserRatings).toHaveBeenCalledWith("2");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUserRatings);
  });
});

describe("Servicio: ratingService.rateDriver (Reglas de Negocio)", () => {
  const baseTrip = {
    id: 10,
    conductor_id: 1,
    estado: "finalizado",
    origen: "Campus Norte",
    destino: "Centro",
  };

  test("permite calificar exitosamente si el pasajero tiene reservación aceptada y el viaje está finalizado", async () => {
    jest.spyOn(tripModel, "findById").mockResolvedValue(baseTrip);
    jest.spyOn(ratingModel, "hasAcceptedReservation").mockResolvedValue(true);
    jest.spyOn(ratingModel, "findByTripAndParticipants").mockResolvedValue(null);
    jest.spyOn(ratingModel, "create").mockResolvedValue({
      id: 100,
      viaje_id: 10,
      calificador_id: 2,
      calificado_id: 1,
      puntuacion: 5,
      comentario: "Gran viaje!",
      fecha_creacion: new Date(),
    });

    const result = await ratingService.rateDriver({
      viajeId: 10,
      calificadorId: 2,
      puntuacion: 5,
      comentario: "Gran viaje!",
    });

    expect(result.message).toMatch(/registrada exitosamente/i);
    expect(result.rating.id).toBe(100);
    expect(ratingModel.create).toHaveBeenCalledWith({
      viajeId: 10,
      calificadorId: 2,
      calificadoId: 1,
      puntuacion: 5,
      comentario: "Gran viaje!",
    });
  });

  test("rechaza IDs inválidos de viaje o calificador con 400", async () => {
    await expect(
      ratingService.rateDriver({ viajeId: "abc", calificadorId: 2, puntuacion: 5 })
    ).rejects.toMatchObject({ statusCode: 400, message: /ID del viaje es inválido/i });

    await expect(
      ratingService.rateDriver({ viajeId: 10, calificadorId: null, puntuacion: 5 })
    ).rejects.toMatchObject({ statusCode: 400, message: /ID del calificador es inválido/i });
  });

  test("rechaza con 404 si el viaje no existe", async () => {
    jest.spyOn(tripModel, "findById").mockResolvedValue(null);

    await expect(
      ratingService.rateDriver({ viajeId: 999, calificadorId: 2, puntuacion: 5 })
    ).rejects.toMatchObject({ statusCode: 404, message: /Viaje no encontrado/i });
  });

  test("rechaza con 400 si el viaje NO está finalizado (programado, en_curso o cancelado)", async () => {
    const estadosInvalidos = ["programado", "en_curso", "cancelado"];

    for (const estado of estadosInvalidos) {
      jest.spyOn(tripModel, "findById").mockResolvedValue({ ...baseTrip, estado });

      await expect(
        ratingService.rateDriver({ viajeId: 10, calificadorId: 2, puntuacion: 5 })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: /Solo se puede calificar al conductor cuando el viaje ha finalizado/i,
      });
    }
  });

  test("rechaza con 400 si el conductor intenta calificarse a sí mismo", async () => {
    jest.spyOn(tripModel, "findById").mockResolvedValue(baseTrip); // conductor_id es 1

    await expect(
      ratingService.rateDriver({ viajeId: 10, calificadorId: 1, puntuacion: 5 })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: /No puedes calificarte a ti mismo/i,
    });
  });

  test("rechaza con 403 si el usuario no tiene reservación aceptada en el viaje", async () => {
    jest.spyOn(tripModel, "findById").mockResolvedValue(baseTrip);
    jest.spyOn(ratingModel, "hasAcceptedReservation").mockResolvedValue(false);

    await expect(
      ratingService.rateDriver({ viajeId: 10, calificadorId: 99, puntuacion: 5 })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: /Solo los pasajeros con reservación confirmada/i,
    });
  });

  test("rechaza con 409 si el pasajero ya calificó previamente al conductor en este viaje", async () => {
    jest.spyOn(tripModel, "findById").mockResolvedValue(baseTrip);
    jest.spyOn(ratingModel, "hasAcceptedReservation").mockResolvedValue(true);
    jest.spyOn(ratingModel, "findByTripAndParticipants").mockResolvedValue({
      id: 50,
      puntuacion: 4,
    });

    await expect(
      ratingService.rateDriver({ viajeId: 10, calificadorId: 2, puntuacion: 5 })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: /Ya has calificado al conductor de este viaje/i,
    });
  });

  test("valida puntuaciones: rechaza números fuera de 1-5, decimales o valores no numéricos con 400", async () => {
    const puntuacionesInvalidas = [0, 6, -1, 3.5, "cinco", null, undefined];

    for (const p of puntuacionesInvalidas) {
      await expect(
        ratingService.rateDriver({ viajeId: 10, calificadorId: 2, puntuacion: p })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: /La puntuación debe ser un número entero entre 1 y 5/i,
      });
    }
  });

  test("comentario es opcional: permite null, omitido o string vacío y lo normaliza a null", async () => {
    jest.spyOn(tripModel, "findById").mockResolvedValue(baseTrip);
    jest.spyOn(ratingModel, "hasAcceptedReservation").mockResolvedValue(true);
    jest.spyOn(ratingModel, "findByTripAndParticipants").mockResolvedValue(null);
    jest.spyOn(ratingModel, "create").mockResolvedValue({ id: 101, puntuacion: 4, comentario: null });

    await ratingService.rateDriver({ viajeId: 10, calificadorId: 2, puntuacion: 4 });
    expect(ratingModel.create).toHaveBeenCalledWith(expect.objectContaining({ comentario: null }));

    await ratingService.rateDriver({ viajeId: 10, calificadorId: 2, puntuacion: 4, comentario: "   " });
    expect(ratingModel.create).toHaveBeenCalledWith(expect.objectContaining({ comentario: null }));
  });

  test("rechaza comentario si excede los 500 caracteres con 400", async () => {
    const comentarioLargo = "a".repeat(501);

    await expect(
      ratingService.rateDriver({
        viajeId: 10,
        calificadorId: 2,
        puntuacion: 5,
        comentario: comentarioLargo,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: /El comentario no puede exceder los 500 caracteres/i,
    });
  });
});

describe("Modelo: ratingModel", () => {
  test("ratingModel.create inserta en Calificaciones con tipos correctos", async () => {
    db.queueResult({
      recordset: [
        {
          id: 1,
          viaje_id: 10,
          calificador_id: 2,
          calificado_id: 1,
          puntuacion: 5,
          comentario: "Muy buen servicio",
          fecha_creacion: new Date("2026-10-16T12:00:00Z"),
        },
      ],
    });

    const created = await ratingModel.create({
      viajeId: 10,
      calificadorId: 2,
      calificadoId: 1,
      puntuacion: 5,
      comentario: "Muy buen servicio",
    });

    expect(created.id).toBe(1);
    expect(db.requests[0].text).toMatch(/INSERT INTO Calificaciones/i);
    expect(db.requests[0].inputs.viaje_id.value).toBe(10);
    expect(db.requests[0].inputs.calificador_id.value).toBe(2);
    expect(db.requests[0].inputs.calificado_id.value).toBe(1);
    expect(db.requests[0].inputs.puntuacion.value).toBe(5);
    expect(db.requests[0].inputs.comentario.value).toBe("Muy buen servicio");
  });

  test("ratingModel.hasAcceptedReservation retorna true cuando existe solicitud aceptada", async () => {
    db.queueResult({ recordset: [{ id: 55 }] });

    const has = await ratingModel.hasAcceptedReservation({ viajeId: 10, pasajeroId: 2 });
    expect(has).toBe(true);
    expect(db.requests[0].text).toMatch(/FROM SolicitudesViaje/i);
    expect(db.requests[0].text).toMatch(/LOWER\(estado\) = 'aceptada'/i);
  });

  test("ratingModel.hasAcceptedReservation retorna false cuando no hay reservación aceptada", async () => {
    db.queueResult({ recordset: [] });

    const has = await ratingModel.hasAcceptedReservation({ viajeId: 10, pasajeroId: 99 });
    expect(has).toBe(false);
  });

  test("ratingModel.getAverageScore calcula promedio y total de calificaciones", async () => {
    db.queueResult({
      recordset: [{ promedio: 4.6, total_calificaciones: 8 }],
    });

    const stats = await ratingModel.getAverageScore(1);
    expect(stats.promedio).toBe(4.6);
    expect(stats.total_calificaciones).toBe(8);
    expect(db.requests[0].text).toMatch(/AVG\(CAST\(puntuacion AS FLOAT\)\)/i);
  });

  test("ratingModel.findByUser consulta calificaciones recibidas con JOINs", async () => {
    db.queueResult({
      recordset: [
        {
          id: 1,
          viaje_id: 10,
          calificador_nombre: "Juan Pérez",
          puntuacion: 5,
          origen: "Campus",
          destino: "Centro",
        },
      ],
    });

    const ratings = await ratingModel.findByUser(1);
    expect(ratings.length).toBe(1);
    expect(db.requests[0].text).toMatch(/INNER JOIN Usuarios u ON u\.id = c\.calificador_id/i);
    expect(db.requests[0].text).toMatch(/INNER JOIN Viajes v ON v\.id = c\.viaje_id/i);
  });
});
