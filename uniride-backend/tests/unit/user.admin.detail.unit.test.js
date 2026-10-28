/**
 * Pruebas para el detalle de usuario del panel de administración.
 * Issue #145: API de detalle de usuario — GET /users/:id (HU-11).
 *
 * Criterios de aceptación cubiertos:
 *  1. Devuelve los datos básicos del usuario sin información sensible.
 *  2. Incluye el promedio y las calificaciones recibidas, reutilizando ratingService.
 *  3. Incluye los viajes publicados y las reservaciones del usuario.
 *  4. 404 si el usuario no existe, 401 sin token y 403 para roles distintos de Administrador.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const jwt = require("jsonwebtoken");

const db = require("../helpers/mockDb");
const app = require("../../app");
const userModel = require("../../models/userModel");
const tripModel = require("../../models/tripModel");
const reservationModel = require("../../models/reservationModel");
const ratingService = require("../../services/ratingService");

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "uniride_default_secret_key", {
    expiresIn: "1h",
  });

const adminToken = tokenFor({ id: 1, roles: ["Administrador"], rol: "Administrador" });
const pasajeroToken = tokenFor({ id: 2, roles: ["Pasajero"], rol: "Pasajero" });
const conductorToken = tokenFor({ id: 3, roles: ["Conductor"], rol: "Conductor" });

// Lo que devuelve userModel.findById (incluye campos sensibles a propósito).
const userFromModel = {
  id: 7,
  campus_id: 3,
  nombre: "Ana",
  apellido: "López",
  correo: "ana@uadec.edu.mx",
  password_hash: "hash-secreto",
  telefono: "8441234567",
  fecha_registro: new Date("2026-01-01T00:00:00Z"),
  campus_nombre: "Campus Arteaga",
  universidad_nombre: "UAdeC",
  roles: ["Pasajero", "Conductor"],
  roles_detalle: [
    { id: 1, nombre: "Pasajero" },
    { id: 2, nombre: "Conductor" },
  ],
  rol_id: 1,
  rol_nombre: "Pasajero",
};

const ratingsResult = {
  usuario_id: 7,
  promedio: 4.5,
  total_calificaciones: 2,
  calificaciones: [
    { id: 11, viaje_id: 20, calificador_id: 9, calificado_id: 7, puntuacion: 5, comentario: "Puntual" },
    { id: 12, viaje_id: 21, calificador_id: 10, calificado_id: 7, puntuacion: 4, comentario: null },
  ],
};

const tripsResult = [
  { id: 20, conductor_id: 7, origen: "Campus Arteaga", destino: "Centro", estado: "finalizado" },
];

const reservationsResult = [
  { id: 30, viaje_id: 40, pasajero_id: 7, estado: "aceptada", viaje_estado: "programado" },
];

const mockHappyPath = () => {
  const findById = jest.spyOn(userModel, "findById").mockResolvedValue({ ...userFromModel });
  const getUserRatings = jest.spyOn(ratingService, "getUserRatings").mockResolvedValue(ratingsResult);
  const findByDriver = jest.spyOn(tripModel, "findByDriver").mockResolvedValue(tripsResult);
  const findByPassenger = jest.spyOn(reservationModel, "findByPassenger").mockResolvedValue(reservationsResult);
  return { findById, getUserRatings, findByDriver, findByPassenger };
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe("GET /users/:id — autenticación y autorización", () => {
  test("401 sin token", async () => {
    const spy = jest.spyOn(userModel, "findById");

    const res = await request(app).get("/users/7");

    expect(res.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
    expect(db.requests).toHaveLength(0);
  });

  test("401 con token inválido", async () => {
    const res = await request(app)
      .get("/users/7")
      .set("Authorization", "Bearer token-falso");

    expect(res.status).toBe(401);
  });

  test.each([
    ["Pasajero", pasajeroToken],
    ["Conductor", conductorToken],
  ])("403 para rol %s", async (_rol, token) => {
    const spy = jest.spyOn(userModel, "findById");

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
    expect(db.requests).toHaveLength(0);
  });

  test("403 si el usuario es Administrador pero tiene activo otro rol", async () => {
    const token = tokenFor({ id: 4, roles: ["Pasajero", "Administrador"], rol: "Pasajero" });

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Active-Role", "Pasajero");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ROLE_NOT_ACTIVE");
  });

  test("200 para Administrador", async () => {
    mockHappyPath();

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

describe("GET /users/:id — validación del id", () => {
  test.each(["0", "-1", "abc", "1.5", "7x"])("400 con id %s", async (id) => {
    const spy = jest.spyOn(userModel, "findById");

    const res = await request(app)
      .get(`/users/${id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ID del usuario/);
    expect(spy).not.toHaveBeenCalled();
  });

  test("no captura las rutas /users/me ni /users/campuses", async () => {
    const spy = jest.spyOn(userModel, "findById");
    jest.spyOn(userModel, "findCampuses").mockResolvedValue([]);

    const res = await request(app)
      .get("/users/campuses")
      .set("Authorization", `Bearer ${pasajeroToken}`);

    expect(res.status).toBe(200);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("GET /users/:id — usuario inexistente", () => {
  test("404 y no consulta reputación, viajes ni reservaciones", async () => {
    jest.spyOn(userModel, "findById").mockResolvedValue(null);
    const ratings = jest.spyOn(ratingService, "getUserRatings");
    const trips = jest.spyOn(tripModel, "findByDriver");
    const reservations = jest.spyOn(reservationModel, "findByPassenger");

    const res = await request(app)
      .get("/users/999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("El usuario no existe.");
    expect(ratings).not.toHaveBeenCalled();
    expect(trips).not.toHaveBeenCalled();
    expect(reservations).not.toHaveBeenCalled();
  });
});

describe("GET /users/:id — contenido de la respuesta", () => {
  test("devuelve los datos básicos sin contraseña ni teléfono", async () => {
    mockHappyPath();

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.body.usuario).toEqual({
      id: 7,
      nombre: "Ana",
      apellido: "López",
      correo: "ana@uadec.edu.mx",
      fecha_registro: "2026-01-01T00:00:00.000Z",
      campus_id: 3,
      campus: "Campus Arteaga",
      universidad: "UAdeC",
      roles: ["Pasajero", "Conductor"],
      roles_detalle: [
        { id: 1, nombre: "Pasajero" },
        { id: 2, nombre: "Conductor" },
      ],
    });

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/password/i);
    expect(body).not.toContain("hash-secreto");
    expect(body).not.toContain("8441234567");
  });

  test("incluye la reputación reutilizando ratingService.getUserRatings", async () => {
    const { getUserRatings } = mockHappyPath();

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(getUserRatings).toHaveBeenCalledWith(7);
    expect(res.body.reputacion).toEqual({
      promedio: 4.5,
      total_calificaciones: 2,
      calificaciones: ratingsResult.calificaciones,
    });
  });

  test("incluye los viajes publicados y las reservaciones del usuario", async () => {
    const { findByDriver, findByPassenger } = mockHappyPath();

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(findByDriver).toHaveBeenCalledWith(7);
    expect(findByPassenger).toHaveBeenCalledWith(7, { order: "desc" });
    expect(res.body.viajes).toEqual(tripsResult);
    expect(res.body.reservaciones).toEqual(reservationsResult);
  });

  test("devuelve listas vacías y promedio 0 para un usuario sin actividad", async () => {
    jest.spyOn(userModel, "findById").mockResolvedValue({ ...userFromModel });
    jest.spyOn(ratingService, "getUserRatings").mockResolvedValue({
      usuario_id: 7,
      promedio: 0,
      total_calificaciones: 0,
      calificaciones: [],
    });
    jest.spyOn(tripModel, "findByDriver").mockResolvedValue([]);
    jest.spyOn(reservationModel, "findByPassenger").mockResolvedValue([]);

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reputacion).toEqual({ promedio: 0, total_calificaciones: 0, calificaciones: [] });
    expect(res.body.viajes).toEqual([]);
    expect(res.body.reservaciones).toEqual([]);
  });

  test("500 con mensaje genérico si falla la base de datos", async () => {
    jest.spyOn(userModel, "findById").mockRejectedValue(new Error("connection lost"));

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Error interno del servidor al consultar el detalle del usuario.");
  });
});
