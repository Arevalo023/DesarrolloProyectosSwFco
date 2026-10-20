/**
 * Pruebas unitarias de las reglas de negocio de Calificaciones (Backend).
 * Issue #120: Pruebas unitarias de calificaciones (BE). Historias HU-18, HU-19 y HU-20.
 *
 * Criterios de aceptación cubiertos:
 *  1. Solo se califican viajes finalizados.
 *  2. Permisos por rol y restricción de una calificación por participante.
 *  3. Cálculo del promedio.
 *
 * Las pruebas de servicio aíslan los modelos con spies; las pruebas de ruta
 * recorren el flujo completo (JWT -> rol activo -> controlador -> servicio)
 * con supertest y la base de datos simulada de `tests/helpers/mockDb`.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const jwt = require("jsonwebtoken");

const db = require("../helpers/mockDb");
const app = require("../../app");
const ratingModel = require("../../models/ratingModel");
const ratingService = require("../../services/ratingService");
const tripModel = require("../../models/tripModel");

const DRIVER_ID = 1;
const PASSENGER_ID = 2;
const OTHER_PASSENGER_ID = 3;
const TRIP_ID = 10;

const baseTrip = {
  id: TRIP_ID,
  conductor_id: DRIVER_ID,
  estado: "finalizado",
  origen: "Campus Norte",
  destino: "Centro",
};

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "uniride_default_secret_key", {
    expiresIn: "1h",
  });

const passengerToken = (id = PASSENGER_ID) =>
  tokenFor({ id, rol: "Pasajero", roles: ["Pasajero"] });

/** Configura los modelos para el "camino feliz" y permite sobrescribir piezas. */
const arrangeHappyPath = ({
  trip = baseTrip,
  hasReservation = true,
  existingRating = null,
} = {}) => {
  jest.spyOn(tripModel, "findById").mockResolvedValue(trip);
  jest.spyOn(ratingModel, "hasAcceptedReservation").mockResolvedValue(hasReservation);
  jest.spyOn(ratingModel, "findByTripAndParticipants").mockResolvedValue(existingRating);
  // Imita el OUTPUT inserted.* del modelo real (columnas en snake_case)
  jest.spyOn(ratingModel, "create").mockImplementation(
    async ({ viajeId, calificadorId, calificadoId, puntuacion, comentario = null }) => ({
      id: 500,
      viaje_id: viajeId,
      calificador_id: calificadorId,
      calificado_id: calificadoId,
      puntuacion,
      comentario,
      fecha_creacion: new Date("2026-10-20T12:00:00Z"),
    })
  );
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Solo se califican viajes finalizados
// ---------------------------------------------------------------------------
describe("Regla: solo se califican viajes finalizados", () => {
  test.each(["finalizado", "completado", "FINALIZADO", "  Finalizado  "])(
    "permite calificar cuando el estado del viaje es '%s'",
    async (estado) => {
      arrangeHappyPath({ trip: { ...baseTrip, estado } });

      const result = await ratingService.rateDriver({
        viajeId: TRIP_ID,
        calificadorId: PASSENGER_ID,
        puntuacion: 5,
      });

      expect(result.rating.viaje_id).toBe(TRIP_ID);
      expect(ratingModel.create).toHaveBeenCalledTimes(1);
    }
  );

  test.each(["programado", "activo", "en_curso", "cancelado", "", null, undefined])(
    "rechaza con 400 cuando el estado del viaje es %p y no registra nada",
    async (estado) => {
      arrangeHappyPath({ trip: { ...baseTrip, estado } });

      await expect(
        ratingService.rateDriver({
          viajeId: TRIP_ID,
          calificadorId: PASSENGER_ID,
          puntuacion: 5,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: /Solo se puede calificar al conductor cuando el viaje ha finalizado/i,
      });

      expect(ratingModel.hasAcceptedReservation).not.toHaveBeenCalled();
      expect(ratingModel.create).not.toHaveBeenCalled();
    }
  );

  test("la validación de estado ocurre antes que la de permisos (viaje no finalizado + sin reservación -> 400)", async () => {
    arrangeHappyPath({
      trip: { ...baseTrip, estado: "en_curso" },
      hasReservation: false,
    });

    await expect(
      ratingService.rateDriver({
        viajeId: TRIP_ID,
        calificadorId: 99,
        puntuacion: 4,
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("responde 404 si el viaje no existe, sin evaluar el resto de reglas", async () => {
    jest.spyOn(tripModel, "findById").mockResolvedValue(null);
    const reservationSpy = jest.spyOn(ratingModel, "hasAcceptedReservation");

    await expect(
      ratingService.rateDriver({ viajeId: 999, calificadorId: PASSENGER_ID, puntuacion: 5 })
    ).rejects.toMatchObject({ statusCode: 404, message: /Viaje no encontrado/i });

    expect(reservationSpy).not.toHaveBeenCalled();
  });

  test("POST /api/ratings/driver devuelve 400 para un viaje en curso", async () => {
    arrangeHappyPath({ trip: { ...baseTrip, estado: "en_curso" } });

    const res = await request(app)
      .post("/api/ratings/driver")
      .set("Authorization", `Bearer ${passengerToken()}`)
      .send({ viaje_id: TRIP_ID, puntuacion: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/viaje ha finalizado/i);
    expect(ratingModel.create).not.toHaveBeenCalled();
  });

  test("POST /api/trips/:id/rate-driver devuelve 201 para un viaje finalizado", async () => {
    arrangeHappyPath();

    const res = await request(app)
      .post(`/api/trips/${TRIP_ID}/rate-driver`)
      .set("Authorization", `Bearer ${passengerToken()}`)
      .send({ puntuacion: 5, comentario: "Todo bien" });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registrada exitosamente/i);
    expect(res.body.rating).toMatchObject({
      viaje_id: TRIP_ID,
      calificador_id: PASSENGER_ID,
      calificado_id: DRIVER_ID,
      puntuacion: 5,
    });
  });
});

// ---------------------------------------------------------------------------
// 2a. Permisos por rol
// ---------------------------------------------------------------------------
describe("Regla: permisos por rol al calificar", () => {
  test("401 sin token en ambas rutas de calificación", async () => {
    const a = await request(app)
      .post("/api/ratings/driver")
      .send({ viaje_id: TRIP_ID, puntuacion: 5 });
    const b = await request(app)
      .post(`/api/trips/${TRIP_ID}/rate-driver`)
      .send({ puntuacion: 5 });

    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
  });

  test("401 con token inválido", async () => {
    const res = await request(app)
      .post("/api/ratings/driver")
      .set("Authorization", "Bearer token-falso")
      .send({ viaje_id: TRIP_ID, puntuacion: 5 });

    expect(res.status).toBe(401);
  });

  test("403 si el rol activo enviado no pertenece a la cuenta", async () => {
    arrangeHappyPath();

    const res = await request(app)
      .post("/api/ratings/driver")
      .set("Authorization", `Bearer ${passengerToken()}`)
      .set("X-Active-Role", "Conductor")
      .send({ viaje_id: TRIP_ID, puntuacion: 5 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("INVALID_ACTIVE_ROLE");
    expect(ratingModel.create).not.toHaveBeenCalled();
  });

  test("el pasajero con reservación aceptada puede calificar (201)", async () => {
    arrangeHappyPath();

    const res = await request(app)
      .post("/api/ratings/driver")
      .set("Authorization", `Bearer ${passengerToken()}`)
      .send({ viaje_id: TRIP_ID, puntuacion: 4 });

    expect(res.status).toBe(201);
    expect(ratingModel.hasAcceptedReservation).toHaveBeenCalledWith({
      viajeId: TRIP_ID,
      pasajeroId: PASSENGER_ID,
    });
  });

  test("un usuario sin reservación aceptada en el viaje recibe 403", async () => {
    arrangeHappyPath({ hasReservation: false });

    const res = await request(app)
      .post("/api/ratings/driver")
      .set("Authorization", `Bearer ${passengerToken(OTHER_PASSENGER_ID)}`)
      .send({ viaje_id: TRIP_ID, puntuacion: 5 });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/reservación confirmada/i);
    expect(ratingModel.create).not.toHaveBeenCalled();
  });

  test("el administrador sin reservación en el viaje también recibe 403", async () => {
    arrangeHappyPath({ hasReservation: false });

    const res = await request(app)
      .post("/api/ratings/driver")
      .set(
        "Authorization",
        `Bearer ${tokenFor({ id: 4, rol: "Administrador", roles: ["Administrador"] })}`
      )
      .send({ viaje_id: TRIP_ID, puntuacion: 5 });

    expect(res.status).toBe(403);
    expect(ratingModel.create).not.toHaveBeenCalled();
  });

  test("el conductor del viaje no puede calificarse a sí mismo (400)", async () => {
    arrangeHappyPath();

    const res = await request(app)
      .post("/api/ratings/driver")
      .set(
        "Authorization",
        `Bearer ${tokenFor({ id: DRIVER_ID, rol: "Conductor", roles: ["Conductor"] })}`
      )
      .send({ viaje_id: TRIP_ID, puntuacion: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No puedes calificarte a ti mismo/i);
    expect(ratingModel.hasAcceptedReservation).not.toHaveBeenCalled();
    expect(ratingModel.create).not.toHaveBeenCalled();
  });

  test("un usuario con roles Pasajero y Conductor califica como pasajero en un viaje ajeno", async () => {
    arrangeHappyPath();

    const res = await request(app)
      .post("/api/ratings/driver")
      .set(
        "Authorization",
        `Bearer ${tokenFor({
          id: PASSENGER_ID,
          rol: "Pasajero",
          roles: ["Pasajero", "Conductor"],
        })}`
      )
      .set("X-Active-Role", "Pasajero")
      .send({ viaje_id: TRIP_ID, puntuacion: 5 });

    expect(res.status).toBe(201);
  });
});

describe("Modelo: ratingModel.hasAcceptedReservation (solo reservaciones aceptadas)", () => {
  test("la consulta SQL filtra por viaje, pasajero y estado 'aceptada'", async () => {
    db.queueResult({ recordset: [{ id: 7 }] });

    const has = await ratingModel.hasAcceptedReservation({
      viajeId: TRIP_ID,
      pasajeroId: PASSENGER_ID,
    });

    const [query] = db.requests;
    expect(has).toBe(true);
    expect(query.text).toMatch(/viaje_id = @viaje_id/i);
    expect(query.text).toMatch(/pasajero_id = @pasajero_id/i);
    expect(query.text).toMatch(/LOWER\(estado\) = 'aceptada'/i);
    expect(db.valuesOf(query)).toEqual({ viaje_id: TRIP_ID, pasajero_id: PASSENGER_ID });
  });

  test("devuelve false si no hay filas (pendiente, rechazada o cancelada no coinciden con el filtro)", async () => {
    db.queueResult({ recordset: [] });

    await expect(
      ratingModel.hasAcceptedReservation({ viajeId: TRIP_ID, pasajeroId: PASSENGER_ID })
    ).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2b. Una calificación por participante
// ---------------------------------------------------------------------------
describe("Regla: una sola calificación por participante y viaje", () => {
  test("rechaza con 409 si el pasajero ya calificó al conductor en el viaje", async () => {
    arrangeHappyPath({ existingRating: { id: 50, puntuacion: 4 } });

    await expect(
      ratingService.rateDriver({
        viajeId: TRIP_ID,
        calificadorId: PASSENGER_ID,
        puntuacion: 5,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: /Ya has calificado al conductor de este viaje/i,
    });

    expect(ratingModel.create).not.toHaveBeenCalled();
  });

  test("la duplicidad se busca por viaje + calificador + conductor del viaje", async () => {
    arrangeHappyPath();

    await ratingService.rateDriver({
      viajeId: TRIP_ID,
      calificadorId: PASSENGER_ID,
      puntuacion: 5,
    });

    expect(ratingModel.findByTripAndParticipants).toHaveBeenCalledWith({
      viajeId: TRIP_ID,
      calificadorId: PASSENGER_ID,
      calificadoId: DRIVER_ID,
    });
  });

  test("segundo intento por la ruta HTTP responde 409", async () => {
    arrangeHappyPath();

    const first = await request(app)
      .post("/api/ratings/driver")
      .set("Authorization", `Bearer ${passengerToken()}`)
      .send({ viaje_id: TRIP_ID, puntuacion: 5 });
    expect(first.status).toBe(201);

    // A partir de ahora la calificación ya existe
    ratingModel.findByTripAndParticipants.mockResolvedValue(first.body.rating);

    const second = await request(app)
      .post("/api/ratings/driver")
      .set("Authorization", `Bearer ${passengerToken()}`)
      .send({ viaje_id: TRIP_ID, puntuacion: 1 });

    expect(second.status).toBe(409);
    expect(ratingModel.create).toHaveBeenCalledTimes(1);
  });

  test("otro pasajero del mismo viaje sí puede calificar al conductor", async () => {
    arrangeHappyPath();

    await ratingService.rateDriver({
      viajeId: TRIP_ID,
      calificadorId: OTHER_PASSENGER_ID,
      puntuacion: 3,
    });

    expect(ratingModel.findByTripAndParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ calificadorId: OTHER_PASSENGER_ID })
    );
    expect(ratingModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ calificadorId: OTHER_PASSENGER_ID, calificadoId: DRIVER_ID })
    );
  });

  test("el mismo pasajero puede calificar al conductor en un viaje distinto", async () => {
    arrangeHappyPath({ trip: { ...baseTrip, id: 11 } });

    await ratingService.rateDriver({
      viajeId: 11,
      calificadorId: PASSENGER_ID,
      puntuacion: 4,
    });

    expect(ratingModel.findByTripAndParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ viajeId: 11 })
    );
    expect(ratingModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ viajeId: 11, calificadorId: PASSENGER_ID })
    );
  });

  test("ratingModel.findByTripAndParticipants consulta con los tres identificadores", async () => {
    db.queueResult({ recordset: [{ id: 50, puntuacion: 4 }] });

    const found = await ratingModel.findByTripAndParticipants({
      viajeId: TRIP_ID,
      calificadorId: PASSENGER_ID,
      calificadoId: DRIVER_ID,
    });

    const [query] = db.requests;
    expect(found).toMatchObject({ id: 50 });
    expect(query.text).toMatch(/viaje_id = @viaje_id/i);
    expect(query.text).toMatch(/calificador_id = @calificador_id/i);
    expect(query.text).toMatch(/calificado_id = @calificado_id/i);
    expect(db.valuesOf(query)).toEqual({
      viaje_id: TRIP_ID,
      calificador_id: PASSENGER_ID,
      calificado_id: DRIVER_ID,
    });
  });

  test("ratingModel.findByTripAndParticipants devuelve null si no existe calificación previa", async () => {
    db.queueResult({ recordset: [] });

    await expect(
      ratingModel.findByTripAndParticipants({
        viajeId: TRIP_ID,
        calificadorId: PASSENGER_ID,
        calificadoId: DRIVER_ID,
      })
    ).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Cálculo del promedio
// ---------------------------------------------------------------------------
describe("Regla: cálculo del promedio de calificaciones", () => {
  test("la consulta promedia puntuaciones como FLOAT, redondea a 1 decimal y filtra por calificado", async () => {
    db.queueResult({ recordset: [{ promedio: 4.5, total_calificaciones: 4 }] });

    await ratingModel.getAverageScore(DRIVER_ID);

    const [query] = db.requests;
    expect(query.text).toMatch(/ROUND\(AVG\(CAST\(puntuacion AS FLOAT\)\),\s*1\)/i);
    expect(query.text).toMatch(/COALESCE\(/i);
    expect(query.text).toMatch(/COUNT\(id\)/i);
    expect(query.text).toMatch(/WHERE calificado_id = @usuario_id/i);
    expect(db.valuesOf(query)).toEqual({ usuario_id: DRIVER_ID });
  });

  test("devuelve promedio y total como números", async () => {
    db.queueResult({ recordset: [{ promedio: "4.3", total_calificaciones: "7" }] });

    const stats = await ratingModel.getAverageScore(DRIVER_ID);

    expect(stats).toEqual({ promedio: 4.3, total_calificaciones: 7 });
  });

  test("usuario sin calificaciones: promedio 0 y total 0 (AVG nulo o sin filas)", async () => {
    db.queueResult({ recordset: [{ promedio: null, total_calificaciones: 0 }] });
    db.queueResult({ recordset: [] });

    await expect(ratingModel.getAverageScore(DRIVER_ID)).resolves.toEqual({
      promedio: 0,
      total_calificaciones: 0,
    });
    await expect(ratingModel.getAverageScore(DRIVER_ID)).resolves.toEqual({
      promedio: 0,
      total_calificaciones: 0,
    });
  });

  test.each([
    [[5], 5],
    [[5, 4], 4.5],
    [[5, 4, 4], 4.3],
    [[1, 2, 2], 1.7],
    [[1, 1, 1, 1, 1], 1],
    [[5, 5, 5, 5, 5], 5],
  ])(
    "la fórmula AVG + ROUND(,1) sobre %j equivale a %f y se refleja en getUserRatings",
    async (puntuaciones, esperado) => {
      // Misma fórmula que ejecuta SQL Server: AVG(CAST(p AS FLOAT)) redondeado a 1 decimal.
      const promedioSql =
        Math.round((puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length) * 10) / 10;
      expect(promedioSql).toBeCloseTo(esperado, 1);

      db.queueResult({
        recordset: puntuaciones.map((puntuacion, i) => ({ id: i + 1, puntuacion })),
      }); // findByUser
      db.queueResult({
        recordset: [{ promedio: promedioSql, total_calificaciones: puntuaciones.length }],
      }); // getAverageScore

      const result = await ratingService.getUserRatings(DRIVER_ID);

      expect(result.promedio).toBeCloseTo(esperado, 1);
      expect(result.total_calificaciones).toBe(puntuaciones.length);
      expect(result.calificaciones).toHaveLength(puntuaciones.length);
    }
  );

  test("el promedio solo considera calificaciones recibidas por el usuario consultado", async () => {
    db.queueResult({ recordset: [] });
    db.queueResult({ recordset: [{ promedio: null, total_calificaciones: 0 }] });

    await ratingService.getUserRatings("42");

    expect(db.requests).toHaveLength(2);
    for (const query of db.requests) {
      expect(db.valuesOf(query)).toEqual({ usuario_id: 42 });
    }
  });

  test("GET /api/ratings/user/:id expone el promedio calculado", async () => {
    db.queueResult({
      recordset: [
        { id: 1, calificado_id: DRIVER_ID, puntuacion: 5 },
        { id: 2, calificado_id: DRIVER_ID, puntuacion: 4 },
        { id: 3, calificado_id: DRIVER_ID, puntuacion: 4 },
      ],
    });
    db.queueResult({ recordset: [{ promedio: 4.3, total_calificaciones: 3 }] });

    const res = await request(app)
      .get(`/api/ratings/user/${DRIVER_ID}`)
      .set("Authorization", `Bearer ${passengerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      usuario_id: DRIVER_ID,
      promedio: 4.3,
      total_calificaciones: 3,
    });
    expect(res.body.calificaciones).toHaveLength(3);
  });
});
