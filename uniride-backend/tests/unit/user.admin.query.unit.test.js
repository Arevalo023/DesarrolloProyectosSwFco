/**
 * Pruebas unitarias de la consulta de usuarios y del detalle de usuario.
 * Issue #155: Pruebas de usuarios y detalle (BE) — HU-09.
 *
 * Complementa user.admin.list.unit.test.js (#143) y user.admin.detail.unit.test.js (#145)
 * con los casos que aún no estaban cubiertos.
 *
 * Criterios de aceptación cubiertos:
 *  1. Búsqueda, filtros y paginación (combinados, de punta a punta y en el modelo).
 *  2. La respuesta no incluye contraseñas ni datos sensibles.
 *  3. Cálculo del promedio y la reputación en el detalle (sin mockear ratingService).
 *  4. Error 404 cuando el usuario no existe (pasando por el modelo real).
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const jwt = require("jsonwebtoken");

const db = require("../helpers/mockDb");
const app = require("../../app");
const userModel = require("../../models/userModel");
const tripModel = require("../../models/tripModel");
const reservationModel = require("../../models/reservationModel");
const ratingModel = require("../../models/ratingModel");
const ratingService = require("../../services/ratingService");
const userService = require("../../services/userService");

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "uniride_default_secret_key", {
    expiresIn: "1h",
  });

const adminToken = tokenFor({ id: 1, roles: ["Administrador"], rol: "Administrador" });

const SENSITIVE_HASH = "hash-super-secreto";
const SENSITIVE_PHONE = "8447654321";

// Fila de la consulta de página de userModel.findAll (incluye columnas
// sensibles a propósito, como si el driver las devolviera por error).
const listRow = (overrides = {}) => ({
  id: 7,
  nombre: "Ana",
  apellido: "López",
  correo: "ana@uadec.edu.mx",
  fecha_registro: new Date("2026-01-01T00:00:00Z"),
  campus_id: 3,
  campus_nombre: "Campus Arteaga",
  universidad_nombre: "UAdeC",
  legacy_rol_id: 1,
  legacy_rol_nombre: "Pasajero",
  password_hash: SENSITIVE_HASH,
  telefono: SENSITIVE_PHONE,
  ...overrides,
});

// Fila de la consulta de userModel.findById (sí trae password_hash y teléfono).
const detailRow = (overrides = {}) => ({
  id: 7,
  legacy_rol_id: 1,
  campus_id: 3,
  nombre: "Ana",
  apellido: "López",
  correo: "ana@uadec.edu.mx",
  password_hash: SENSITIVE_HASH,
  telefono: SENSITIVE_PHONE,
  fecha_registro: new Date("2026-01-01T00:00:00Z"),
  campus_nombre: "Campus Arteaga",
  universidad_nombre: "UAdeC",
  rol_id: 1,
  rol_nombre: "Pasajero",
  legacy_rol_nombre: "Pasajero",
  ...overrides,
});

const expectNoSensitiveData = (body) => {
  const json = JSON.stringify(body);
  expect(json).not.toMatch(/password/i);
  expect(json).not.toMatch(/telefono/i);
  expect(json).not.toContain(SENSITIVE_HASH);
  expect(json).not.toContain(SENSITIVE_PHONE);
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe("Consulta de usuarios — búsqueda y filtros combinados", () => {
  test("búsqueda y rol se combinan con AND y se envían en conteo y página", async () => {
    db.queueResult({ recordset: [{ total: 1 }] }); // conteo
    db.queueResult({ recordset: [listRow()] }); // página
    db.queueResult({ recordset: [{ usuario_id: 7, id: 2, nombre: "Conductor" }] }); // roles

    await userModel.findAll({ search: "ana", roleId: 2, limit: 20, offset: 0 });

    const [countQuery, pageQuery] = db.requests;
    expect(countQuery.text).toMatch(/WHERE[\s\S]*LIKE @search[\s\S]*\)\s*AND\s*\([\s\S]*@rol_id/);

    for (const query of [countQuery, pageQuery]) {
      expect(db.valuesOf(query)).toMatchObject({ search: "%ana%", rol_id: 2 });
    }
  });

  test("permite buscar por nombre completo (nombre + apellido)", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await userModel.findAll({ search: "Ana López", limit: 20, offset: 0 });

    const [countQuery] = db.requests;
    expect(countQuery.text).toMatch(/\(u\.nombre \+ ' ' \+ u\.apellido\) LIKE @search/);
    expect(countQuery.inputs.search.value).toBe("%Ana López%");
  });

  test("una búsqueda vacía o solo con espacios no filtra", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await userModel.findAll({ search: "   ", limit: 20, offset: 0 });

    const [countQuery] = db.requests;
    expect(countQuery.text).not.toMatch(/WHERE/);
    expect(countQuery.inputs).not.toHaveProperty("search");
  });

  test("busca el rol sin distinguir mayúsculas y devuelve null si no existe", async () => {
    db.queueResult({ recordset: [{ id: 2 }] });
    await expect(userModel.findRoleIdByName("CONDUCTOR")).resolves.toBe(2);
    expect(db.requests[0].text).toMatch(/LOWER\(nombre\) = LOWER\(@nombre\)/);
    expect(db.requests[0].inputs.nombre.value).toBe("CONDUCTOR");

    db.queueResult({ recordset: [] });
    await expect(userModel.findRoleIdByName("Piloto")).resolves.toBeNull();
  });

  test("GET /users con q y rol filtra de punta a punta", async () => {
    db.queueResult({ recordset: [{ id: 2 }] }); // findRoleIdByName
    db.queueResult({ recordset: [{ total: 1 }] }); // conteo
    db.queueResult({ recordset: [listRow()] }); // página
    db.queueResult({ recordset: [{ usuario_id: 7, id: 2, nombre: "Conductor" }] }); // roles

    const res = await request(app)
      .get("/users?q=%20ana%20&rol=conductor")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(db.requests[0].inputs.nombre.value).toBe("conductor");
    expect(db.valuesOf(db.requests[1])).toEqual({ search: "%ana%", rol_id: 2 });
    expect(res.body.usuarios).toHaveLength(1);
    expect(res.body.usuarios[0].roles).toEqual(["Conductor"]);
  });
});

describe("Consulta de usuarios — paginación", () => {
  test("GET /users?page=2&limit=5 calcula offset 5 y total de páginas", async () => {
    db.queueResult({ recordset: [{ total: 12 }] });
    db.queueResult({ recordset: [listRow({ id: 6 })] });
    db.queueResult({ recordset: [] });

    const res = await request(app)
      .get("/users?page=2&limit=5")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(db.valuesOf(db.requests[1])).toMatchObject({ offset: 5, limit: 5 });
    expect(res.body.paginacion).toEqual({ pagina: 2, limite: 5, total: 12, total_paginas: 3 });
  });

  test("una página posterior a la última devuelve lista vacía pero conserva el total", async () => {
    db.queueResult({ recordset: [{ total: 3 }] });
    db.queueResult({ recordset: [] });

    const res = await request(app)
      .get("/users?page=5&limit=20")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.usuarios).toEqual([]);
    expect(res.body.paginacion).toEqual({ pagina: 5, limite: 20, total: 3, total_paginas: 1 });
    // No se consultan roles cuando la página viene vacía
    expect(db.requests).toHaveLength(2);
  });

  test("total_paginas redondea hacia arriba", async () => {
    jest.spyOn(userModel, "findAll").mockResolvedValue({ users: [], total: 21 });

    const result = await userService.listUsers({ limit: "20" });

    expect(result.paginacion.total_paginas).toBe(2);
  });

  test("el servicio limita a 50 registros aunque se pida más", async () => {
    const spy = jest.spyOn(userModel, "findAll").mockResolvedValue({ users: [], total: 0 });

    const result = await userService.listUsers({ limit: 500 });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
    expect(result.paginacion.limite).toBe(50);
  });

  test("sin rol no consulta la tabla de roles", async () => {
    const roleSpy = jest.spyOn(userModel, "findRoleIdByName");
    jest.spyOn(userModel, "findAll").mockResolvedValue({ users: [], total: 0 });

    await userService.listUsers({ q: "ana", rol: "   " });

    expect(roleSpy).not.toHaveBeenCalled();
  });
});

describe("Detalle de usuario — sin datos sensibles", () => {
  const mockActivity = () => {
    jest.spyOn(tripModel, "findByDriver").mockResolvedValue([]);
    jest.spyOn(reservationModel, "findByPassenger").mockResolvedValue([]);
    jest.spyOn(ratingModel, "findByUser").mockResolvedValue([]);
  };

  test("aunque el modelo devuelva password_hash y teléfono, no se exponen", async () => {
    mockActivity();
    db.queueResult({ recordset: [detailRow()] }); // findById
    db.queueResult({ recordset: [{ promedio: null, total_calificaciones: 0 }] }); // promedio

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.usuario).not.toHaveProperty("password_hash");
    expect(res.body.usuario).not.toHaveProperty("telefono");
    expect(res.body.usuario).not.toHaveProperty("rol_id");
    expect(res.body.usuario).not.toHaveProperty("rol_nombre");
    expectNoSensitiveData(res.body);
  });

  test("tampoco expone datos sensibles de un usuario con varios roles", async () => {
    mockActivity();
    db.queueResult({
      recordset: [
        detailRow({ rol_id: 1, rol_nombre: "Pasajero" }),
        detailRow({ rol_id: 2, rol_nombre: "Conductor" }),
      ],
    });
    db.queueResult({ recordset: [{ promedio: null, total_calificaciones: 0 }] });

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.body.usuario.roles).toEqual(["Pasajero", "Conductor"]);
    expectNoSensitiveData(res.body);
  });
});

describe("Detalle de usuario — cálculo del promedio y reputación", () => {
  test("la consulta promedia las puntuaciones recibidas con un decimal", async () => {
    db.queueResult({ recordset: [{ promedio: 4.3, total_calificaciones: 3 }] });

    await ratingModel.getAverageScore(7);

    const [query] = db.requests;
    expect(query.text).toMatch(/ROUND\(AVG\(CAST\(puntuacion AS FLOAT\)\), 1\)/);
    expect(query.text).toMatch(/COALESCE\(/);
    expect(query.text).toMatch(/COUNT\(id\) AS total_calificaciones/);
    expect(query.text).toMatch(/WHERE calificado_id = @usuario_id/);
    expect(query.inputs.usuario_id).toEqual({ type: { name: "Int" }, value: 7 });
  });

  test.each([
    ["números", { promedio: 4.5, total_calificaciones: 2 }, { promedio: 4.5, total_calificaciones: 2 }],
    ["texto (decimal de SQL)", { promedio: "3.7", total_calificaciones: "6" }, { promedio: 3.7, total_calificaciones: 6 }],
    ["sin calificaciones (null)", { promedio: null, total_calificaciones: 0 }, { promedio: 0, total_calificaciones: 0 }],
  ])("convierte el resultado de la base de datos cuando llega como %s", async (_caso, row, expected) => {
    db.queueResult({ recordset: [row] });

    await expect(ratingModel.getAverageScore(7)).resolves.toEqual(expected);
  });

  test("devuelve 0 si la consulta no regresa filas", async () => {
    db.queueResult({ recordset: [] });

    await expect(ratingModel.getAverageScore(7)).resolves.toEqual({
      promedio: 0,
      total_calificaciones: 0,
    });
  });

  test("GET /users/:id arma la reputación con el promedio, el total y las calificaciones", async () => {
    const calificaciones = [
      { id: 11, viaje_id: 20, calificador_id: 9, calificado_id: 7, puntuacion: 5 },
      { id: 12, viaje_id: 21, calificador_id: 10, calificado_id: 7, puntuacion: 4 },
      { id: 13, viaje_id: 22, calificador_id: 11, calificado_id: 7, puntuacion: 4 },
    ];
    jest.spyOn(tripModel, "findByDriver").mockResolvedValue([]);
    jest.spyOn(reservationModel, "findByPassenger").mockResolvedValue([]);
    const findByUser = jest.spyOn(ratingModel, "findByUser").mockResolvedValue(calificaciones);

    db.queueResult({ recordset: [detailRow()] }); // findById
    db.queueResult({ recordset: [{ promedio: "4.3", total_calificaciones: "3" }] }); // promedio

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(findByUser).toHaveBeenCalledWith(7);
    expect(res.body.reputacion).toEqual({
      promedio: 4.3,
      total_calificaciones: 3,
      calificaciones,
    });
    // El promedio y el total salen del usuario consultado
    expect(db.requests[1].inputs.usuario_id.value).toBe(7);
  });

  test("un usuario sin calificaciones tiene reputación 0 y lista vacía", async () => {
    jest.spyOn(tripModel, "findByDriver").mockResolvedValue([]);
    jest.spyOn(reservationModel, "findByPassenger").mockResolvedValue([]);
    jest.spyOn(ratingModel, "findByUser").mockResolvedValue([]);

    db.queueResult({ recordset: [detailRow()] });
    db.queueResult({ recordset: [{ promedio: null, total_calificaciones: 0 }] });

    const res = await request(app)
      .get("/users/7")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.body.reputacion).toEqual({ promedio: 0, total_calificaciones: 0, calificaciones: [] });
  });

  test("ratingService.getUserRatings combina promedio y lista de calificaciones", async () => {
    jest.spyOn(ratingModel, "findByUser").mockResolvedValue(null);
    jest
      .spyOn(ratingModel, "getAverageScore")
      .mockResolvedValue({ promedio: 2.5, total_calificaciones: 2 });

    await expect(ratingService.getUserRatings("7")).resolves.toEqual({
      usuario_id: 7,
      promedio: 2.5,
      total_calificaciones: 2,
      calificaciones: [],
    });
  });
});

describe("Detalle de usuario — usuario inexistente", () => {
  test("GET /users/:id responde 404 cuando la base de datos no encuentra al usuario", async () => {
    db.queueResult({ recordset: [] }); // findById sin filas
    const ratings = jest.spyOn(ratingService, "getUserRatings");
    const trips = jest.spyOn(tripModel, "findByDriver");
    const reservations = jest.spyOn(reservationModel, "findByPassenger");

    const res = await request(app)
      .get("/users/999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "El usuario no existe." });
    expect(db.requests).toHaveLength(1);
    expect(db.requests[0].inputs.id.value).toBe(999);
    expect(ratings).not.toHaveBeenCalled();
    expect(trips).not.toHaveBeenCalled();
    expect(reservations).not.toHaveBeenCalled();
  });

  test("userService.getUserDetail lanza un error con statusCode 404", async () => {
    jest.spyOn(userModel, "findById").mockResolvedValue(null);

    await expect(userService.getUserDetail("999")).rejects.toMatchObject({
      statusCode: 404,
      message: "El usuario no existe.",
    });
    expect(userModel.findById).toHaveBeenCalledWith(999);
  });

  test("userModel.findById devuelve null si no hay filas", async () => {
    db.queueResult({ recordset: [] });

    await expect(userModel.findById(999)).resolves.toBeNull();
  });
});
