/**
 * Pruebas para la consulta de calificaciones de un usuario.
 * Issue #116: GET /api/ratings/user/:id (Historia HU-20).
 *
 * Criterios de aceptación cubiertos:
 *  1. Devuelve la lista de calificaciones recibidas y el promedio.
 *  2. Disponible para cualquier usuario autenticado (cualquier rol).
 *  3. Respuesta estructurada cuando el usuario no tiene calificaciones.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const jwt = require("jsonwebtoken");

const db = require("../helpers/mockDb");
const app = require("../../app");
const ratingModel = require("../../models/ratingModel");
const ratingService = require("../../services/ratingService");

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "uniride_default_secret_key", {
    expiresIn: "1h",
  });

const sampleRating = {
  id: 1,
  viaje_id: 10,
  calificador_id: 2,
  calificado_id: 1,
  puntuacion: 5,
  comentario: "Excelente viaje, muy puntual y amable.",
  fecha_creacion: new Date("2026-10-16T15:40:00.000Z"),
  calificador_nombre: "Carlos Gómez",
  origen: "Campus Poniente",
  destino: "Zona Centro",
  fecha_salida: new Date("2026-10-15T08:00:00.000Z"),
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe("Servicio: ratingService.getUserRatings", () => {
  test("devuelve usuario_id, promedio, total y la lista de calificaciones", async () => {
    jest.spyOn(ratingModel, "findByUser").mockResolvedValue([sampleRating]);
    jest
      .spyOn(ratingModel, "getAverageScore")
      .mockResolvedValue({ promedio: 5, total_calificaciones: 1 });

    const result = await ratingService.getUserRatings("1");

    expect(ratingModel.findByUser).toHaveBeenCalledWith(1);
    expect(ratingModel.getAverageScore).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      usuario_id: 1,
      promedio: 5,
      total_calificaciones: 1,
      calificaciones: [sampleRating],
    });
  });

  test("usuario sin calificaciones: respuesta estructurada con lista vacía y total 0", async () => {
    jest.spyOn(ratingModel, "findByUser").mockResolvedValue([]);
    jest
      .spyOn(ratingModel, "getAverageScore")
      .mockResolvedValue({ promedio: 0, total_calificaciones: 0 });

    const result = await ratingService.getUserRatings(7);

    expect(result).toEqual({
      usuario_id: 7,
      promedio: 0,
      total_calificaciones: 0,
      calificaciones: [],
    });
  });

  test("normaliza a lista vacía si el modelo no devuelve arreglo", async () => {
    jest.spyOn(ratingModel, "findByUser").mockResolvedValue(undefined);
    jest
      .spyOn(ratingModel, "getAverageScore")
      .mockResolvedValue({ promedio: 0, total_calificaciones: 0 });

    const result = await ratingService.getUserRatings(7);

    expect(result.calificaciones).toEqual([]);
  });

  test("rechaza con 400 IDs inválidos sin consultar la base de datos", async () => {
    const findSpy = jest.spyOn(ratingModel, "findByUser");

    for (const invalid of ["abc", 0, -3, null, undefined, ""]) {
      await expect(ratingService.getUserRatings(invalid)).rejects.toMatchObject({
        statusCode: 400,
        message: /ID de usuario inválido/i,
      });
    }

    expect(findSpy).not.toHaveBeenCalled();
  });
});

describe("Ruta: GET /api/ratings/user/:id", () => {
  test("401 sin token de autenticación", async () => {
    const res = await request(app).get("/api/ratings/user/1");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Token no proporcionado/i);
  });

  test("401 con token inválido", async () => {
    const res = await request(app)
      .get("/api/ratings/user/1")
      .set("Authorization", "Bearer token-falso");

    expect(res.status).toBe(401);
  });

  test.each([
    ["Pasajero", { id: 2, rol: "Pasajero", roles: ["Pasajero"] }],
    ["Conductor", { id: 3, rol: "Conductor", roles: ["Conductor"] }],
    ["Administrador", { id: 4, rol: "Administrador", roles: ["Administrador"] }],
  ])("200 para cualquier usuario autenticado (%s)", async (_rol, payload) => {
    db.queueResult({ recordset: [sampleRating] }); // findByUser
    db.queueResult({ recordset: [{ promedio: 5, total_calificaciones: 1 }] }); // getAverageScore

    const res = await request(app)
      .get("/api/ratings/user/1")
      .set("Authorization", `Bearer ${tokenFor(payload)}`);

    expect(res.status).toBe(200);
    expect(res.body.usuario_id).toBe(1);
    expect(res.body.promedio).toBe(5);
    expect(res.body.total_calificaciones).toBe(1);
    expect(res.body.calificaciones).toHaveLength(1);
    expect(res.body.calificaciones[0]).toMatchObject({
      id: 1,
      puntuacion: 5,
      calificador_nombre: "Carlos Gómez",
    });
  });

  test("200 con respuesta estructurada cuando el usuario no tiene calificaciones", async () => {
    db.queueResult({ recordset: [] }); // findByUser
    db.queueResult({ recordset: [{ promedio: null, total_calificaciones: 0 }] }); // getAverageScore

    const res = await request(app)
      .get("/api/ratings/user/99")
      .set(
        "Authorization",
        `Bearer ${tokenFor({ id: 2, rol: "Pasajero", roles: ["Pasajero"] })}`
      );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      usuario_id: 99,
      promedio: 0,
      total_calificaciones: 0,
      calificaciones: [],
    });
  });

  test("400 cuando el ID de la ruta no es un entero positivo", async () => {
    const res = await request(app)
      .get("/api/ratings/user/abc")
      .set(
        "Authorization",
        `Bearer ${tokenFor({ id: 2, rol: "Pasajero", roles: ["Pasajero"] })}`
      );

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ID de usuario inválido/i);
    expect(db.requests).toHaveLength(0);
  });

  test("las consultas SQL filtran por calificado_id con el ID solicitado", async () => {
    db.queueResult({ recordset: [] });
    db.queueResult({ recordset: [{ promedio: null, total_calificaciones: 0 }] });

    await request(app)
      .get("/api/ratings/user/42")
      .set(
        "Authorization",
        `Bearer ${tokenFor({ id: 2, rol: "Pasajero", roles: ["Pasajero"] })}`
      );

    expect(db.requests).toHaveLength(2);
    for (const req of db.requests) {
      expect(req.text).toMatch(/WHERE c?\.?calificado_id = @usuario_id/i);
      expect(req.inputs.usuario_id.value).toBe(42);
    }
  });
});
