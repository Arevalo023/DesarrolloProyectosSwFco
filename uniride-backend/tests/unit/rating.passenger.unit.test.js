/**
 * Pruebas unitarias para calificar a un pasajero.
 * Issue #115: Endpoint para calificar al pasajero.
 *
 * Criterios de aceptación cubiertos:
 *  1. Solo el conductor propietario del viaje puede calificar.
 *  2. Solo se califica a pasajeros con reservación aceptada.
 *  3. El viaje debe estar finalizado y se validan los permisos del usuario.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const jwt = require("jsonwebtoken");

const db = require("../helpers/mockDb");
const app = require("../../app");
const ratingModel = require("../../models/ratingModel");
const ratingService = require("../../services/ratingService");
const ratingController = require("../../controllers/ratingController");
const tripModel = require("../../models/tripModel");

const DRIVER_ID = 1;
const PASSENGER_ID = 2;
const OTHER_DRIVER_ID = 9;
const TRIP_ID = 10;

const baseTrip = {
  id: TRIP_ID,
  conductor_id: DRIVER_ID,
  estado: "finalizado",
  origen: "Campus Norte",
  destino: "Centro",
};

const validInput = (overrides = {}) => ({
  viajeId: TRIP_ID,
  calificadorId: DRIVER_ID,
  pasajeroId: PASSENGER_ID,
  puntuacion: 5,
  comentario: "Pasajero puntual y respetuoso",
  ...overrides,
});

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "uniride_default_secret_key", {
    expiresIn: "1h",
  });

const driverToken = (id = DRIVER_ID) =>
  tokenFor({ id, rol: "Conductor", roles: ["Conductor", "Pasajero"] });

const passengerToken = (id = PASSENGER_ID) =>
  tokenFor({ id, rol: "Pasajero", roles: ["Pasajero"] });

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

/** Configura los modelos para el "camino feliz" y permite sobrescribir piezas. */
const arrangeHappyPath = ({
  trip = baseTrip,
  hasReservation = true,
  existingRating = null,
} = {}) => {
  jest.spyOn(tripModel, "findById").mockResolvedValue(trip);
  jest.spyOn(ratingModel, "hasAcceptedReservation").mockResolvedValue(hasReservation);
  jest.spyOn(ratingModel, "findByTripAndParticipants").mockResolvedValue(existingRating);
  jest.spyOn(ratingModel, "create").mockImplementation(
    async ({ viajeId, calificadorId, calificadoId, puntuacion, comentario = null }) => ({
      id: 700,
      viaje_id: viajeId,
      calificador_id: calificadorId,
      calificado_id: calificadoId,
      puntuacion,
      comentario,
      fecha_creacion: new Date("2026-10-20T12:00:00Z"),
    })
  );
};

const expectRejection = async (input, statusCode, message) => {
  await expect(ratingService.ratePassenger(input)).rejects.toMatchObject({
    statusCode,
    ...(message ? { message } : {}),
  });
  expect(ratingModel.create).not.toHaveBeenCalled();
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Servicio: camino feliz
// ---------------------------------------------------------------------------
describe("ratingService.ratePassenger: camino feliz", () => {
  test("registra la calificación del conductor al pasajero", async () => {
    arrangeHappyPath();

    const result = await ratingService.ratePassenger(validInput());

    expect(ratingModel.create).toHaveBeenCalledWith({
      viajeId: TRIP_ID,
      calificadorId: DRIVER_ID,
      calificadoId: PASSENGER_ID,
      puntuacion: 5,
      comentario: "Pasajero puntual y respetuoso",
    });
    expect(result.message).toBe("Calificación al pasajero registrada exitosamente.");
    expect(result.rating).toMatchObject({
      calificador_id: DRIVER_ID,
      calificado_id: PASSENGER_ID,
      puntuacion: 5,
    });
  });

  test("acepta IDs y puntuación como strings numéricos", async () => {
    arrangeHappyPath();

    await ratingService.ratePassenger(
      validInput({ viajeId: "10", calificadorId: "1", pasajeroId: "2", puntuacion: "4" })
    );

    expect(ratingModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ viajeId: 10, calificadorId: 1, calificadoId: 2, puntuacion: 4 })
    );
  });

  test.each([undefined, null, "", "   "])(
    "guarda comentario null cuando se recibe %p",
    async (comentario) => {
      arrangeHappyPath();
      await ratingService.ratePassenger(validInput({ comentario }));
      expect(ratingModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ comentario: null })
      );
    }
  );

  test("recorta espacios del comentario", async () => {
    arrangeHappyPath();
    await ratingService.ratePassenger(validInput({ comentario: "  Muy amable  " }));
    expect(ratingModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ comentario: "Muy amable" })
    );
  });

  test("acepta viajes en estado 'completado' sin importar mayúsculas", async () => {
    arrangeHappyPath({ trip: { ...baseTrip, estado: "  COMPLETADO " } });
    await expect(ratingService.ratePassenger(validInput())).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Servicio: validación de entrada
// ---------------------------------------------------------------------------
describe("ratingService.ratePassenger: validación de entrada", () => {
  beforeEach(() => arrangeHappyPath());

  test.each([undefined, null, 0, -1, "abc", 1.5])("400 con viajeId inválido (%p)", async (viajeId) => {
    await expectRejection(validInput({ viajeId }), 400, "El ID del viaje es inválido o requerido.");
    expect(tripModel.findById).not.toHaveBeenCalled();
  });

  test("400 sin calificador autenticado", async () => {
    await expectRejection(
      validInput({ calificadorId: undefined }),
      400,
      "El ID del calificador es inválido o requerido."
    );
  });

  test.each([undefined, null, 0, "x"])("400 con pasajeroId inválido (%p)", async (pasajeroId) => {
    await expectRejection(validInput({ pasajeroId }), 400, "El ID del pasajero es inválido o requerido.");
  });

  test.each([0, 6, 3.5, "cinco", undefined])("400 con puntuación inválida (%p)", async (puntuacion) => {
    await expectRejection(
      validInput({ puntuacion }),
      400,
      "La puntuación debe ser un número entero entre 1 y 5."
    );
  });

  test("400 si el comentario no es texto", async () => {
    await expectRejection(validInput({ comentario: 123 }), 400, "El comentario debe ser una cadena de texto.");
  });

  test("400 si el comentario excede 500 caracteres", async () => {
    await expectRejection(
      validInput({ comentario: "a".repeat(501) }),
      400,
      "El comentario no puede exceder los 500 caracteres."
    );
  });
});

// ---------------------------------------------------------------------------
// Servicio: reglas de negocio (criterios de aceptación)
// ---------------------------------------------------------------------------
describe("ratingService.ratePassenger: reglas de negocio", () => {
  test("404 si el viaje no existe", async () => {
    arrangeHappyPath({ trip: null });
    await expectRejection(validInput(), 404, "Viaje no encontrado.");
  });

  test.each(["programado", "activo", "en_curso", "cancelado", null])(
    "400 si el viaje no está finalizado (estado %p)",
    async (estado) => {
      arrangeHappyPath({ trip: { ...baseTrip, estado } });
      await expectRejection(
        validInput(),
        400,
        "Solo se puede calificar a un pasajero cuando el viaje ha finalizado."
      );
      expect(ratingModel.hasAcceptedReservation).not.toHaveBeenCalled();
    }
  );

  test("403 si quien califica no es el conductor propietario del viaje", async () => {
    arrangeHappyPath();
    await expectRejection(
      validInput({ calificadorId: OTHER_DRIVER_ID }),
      403,
      "Solo el conductor de este viaje puede calificar a sus pasajeros."
    );
    expect(ratingModel.hasAcceptedReservation).not.toHaveBeenCalled();
  });

  test("403 si un pasajero del viaje intenta calificar a otro pasajero", async () => {
    arrangeHappyPath();
    await expectRejection(validInput({ calificadorId: 3, pasajeroId: PASSENGER_ID }), 403);
  });

  test("400 si el conductor intenta calificarse a sí mismo", async () => {
    arrangeHappyPath();
    await expectRejection(validInput({ pasajeroId: DRIVER_ID }), 400, "No puedes calificarte a ti mismo.");
  });

  test("403 si el pasajero no tiene reservación aceptada en el viaje", async () => {
    arrangeHappyPath({ hasReservation: false });
    await expectRejection(
      validInput(),
      403,
      "Solo se puede calificar a pasajeros con reservación confirmada en este viaje."
    );
    expect(ratingModel.hasAcceptedReservation).toHaveBeenCalledWith({
      viajeId: TRIP_ID,
      pasajeroId: PASSENGER_ID,
    });
  });

  test("409 si el conductor ya calificó a ese pasajero en el viaje", async () => {
    arrangeHappyPath({ existingRating: { id: 1 } });
    await expectRejection(validInput(), 409, "Ya has calificado a este pasajero en este viaje.");
    expect(ratingModel.findByTripAndParticipants).toHaveBeenCalledWith({
      viajeId: TRIP_ID,
      calificadorId: DRIVER_ID,
      calificadoId: PASSENGER_ID,
    });
  });
});

// ---------------------------------------------------------------------------
// Controlador
// ---------------------------------------------------------------------------
describe("ratingController.ratePassenger", () => {
  test("toma el viaje de la URL y responde 201", async () => {
    const mockResult = { message: "ok", rating: { id: 1 } };
    jest.spyOn(ratingService, "ratePassenger").mockResolvedValue(mockResult);

    const req = {
      params: { id: "10" },
      body: { pasajero_id: 2, puntuacion: 5, comentario: "Bien" },
      user: { id: DRIVER_ID },
    };
    const res = createMockRes();

    await ratingController.ratePassenger(req, res);

    expect(ratingService.ratePassenger).toHaveBeenCalledWith({
      viajeId: "10",
      calificadorId: DRIVER_ID,
      pasajeroId: 2,
      puntuacion: 5,
      comentario: "Bien",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  test("admite viaje_id en el body (alias /api/ratings/passenger)", async () => {
    jest.spyOn(ratingService, "ratePassenger").mockResolvedValue({});
    const req = { params: {}, body: { viaje_id: 20, pasajero_id: 3, puntuacion: 4 }, user: { id: 7 } };
    const res = createMockRes();

    await ratingController.ratePassenger(req, res);

    expect(ratingService.ratePassenger).toHaveBeenCalledWith(
      expect.objectContaining({ viajeId: 20, pasajeroId: 3, calificadorId: 7 })
    );
  });

  test("propaga statusCode y mensaje de error", async () => {
    const error = new Error("Ya has calificado a este pasajero en este viaje.");
    error.statusCode = 409;
    jest.spyOn(ratingService, "ratePassenger").mockRejectedValue(error);
    const res = createMockRes();

    await ratingController.ratePassenger({ params: { id: "10" }, body: {}, user: { id: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: error.message });
  });

  test("responde 500 con mensaje genérico ante errores inesperados", async () => {
    jest.spyOn(ratingService, "ratePassenger").mockRejectedValue(new Error(""));
    const res = createMockRes();

    await ratingController.ratePassenger({ params: { id: "10" }, body: {}, user: { id: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Error al registrar la calificación." });
  });
});

// ---------------------------------------------------------------------------
// Rutas HTTP (JWT -> rol activo -> controlador -> servicio)
// ---------------------------------------------------------------------------
describe("Rutas: calificar al pasajero", () => {
  const routes = [
    ["POST /api/trips/:id/rate-passenger", (r) => r.post(`/api/trips/${TRIP_ID}/rate-passenger`), {}],
    ["POST /api/ratings/passenger", (r) => r.post("/api/ratings/passenger"), { viaje_id: TRIP_ID }],
  ];

  test.each(routes)("%s responde 201 para el conductor propietario", async (_name, call, extra) => {
    arrangeHappyPath();

    const res = await call(request(app))
      .set("Authorization", `Bearer ${driverToken()}`)
      .send({ ...extra, pasajero_id: PASSENGER_ID, puntuacion: 5 });

    expect(res.status).toBe(201);
    expect(res.body.rating).toMatchObject({ calificador_id: DRIVER_ID, calificado_id: PASSENGER_ID });
  });

  test.each(routes)("%s responde 401 sin token", async (_name, call, extra) => {
    arrangeHappyPath();
    const res = await call(request(app)).send({ ...extra, pasajero_id: PASSENGER_ID, puntuacion: 5 });
    expect(res.status).toBe(401);
    expect(ratingModel.create).not.toHaveBeenCalled();
  });

  test.each(routes)("%s responde 403 si el usuario solo tiene rol Pasajero", async (_name, call, extra) => {
    arrangeHappyPath();
    const res = await call(request(app))
      .set("Authorization", `Bearer ${passengerToken()}`)
      .send({ ...extra, pasajero_id: 3, puntuacion: 5 });
    expect(res.status).toBe(403);
    expect(tripModel.findById).not.toHaveBeenCalled();
  });

  test("403 ROLE_NOT_ACTIVE si el conductor está en modo Pasajero", async () => {
    arrangeHappyPath();
    const res = await request(app)
      .post(`/api/trips/${TRIP_ID}/rate-passenger`)
      .set("Authorization", `Bearer ${driverToken()}`)
      .set("X-Active-Role", "Pasajero")
      .send({ pasajero_id: PASSENGER_ID, puntuacion: 5 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ROLE_NOT_ACTIVE");
    expect(ratingModel.create).not.toHaveBeenCalled();
  });

  test("403 si otro conductor intenta calificar en un viaje ajeno", async () => {
    arrangeHappyPath();
    const res = await request(app)
      .post(`/api/trips/${TRIP_ID}/rate-passenger`)
      .set("Authorization", `Bearer ${driverToken(OTHER_DRIVER_ID)}`)
      .send({ pasajero_id: PASSENGER_ID, puntuacion: 5 });

    expect(res.status).toBe(403);
    expect(ratingModel.create).not.toHaveBeenCalled();
  });

  test("segundo intento responde 409", async () => {
    arrangeHappyPath({ existingRating: { id: 700 } });
    const res = await request(app)
      .post(`/api/trips/${TRIP_ID}/rate-passenger`)
      .set("Authorization", `Bearer ${driverToken()}`)
      .send({ pasajero_id: PASSENGER_ID, puntuacion: 5 });

    expect(res.status).toBe(409);
  });
});
