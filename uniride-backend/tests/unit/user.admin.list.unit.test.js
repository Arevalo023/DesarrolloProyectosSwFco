/**
 * Pruebas para la consulta de usuarios del panel de administración.
 * Issue #143: API de usuarios (consulta) — GET /users (Historia 24).
 *
 * Criterios de aceptación cubiertos:
 *  1. Búsqueda por nombre o correo y filtro por rol.
 *  2. Paginación (20 por defecto, máximo 50) con validación de parámetros.
 *  3. No se devuelven contraseñas ni datos sensibles.
 *  4. 401 sin token y 403 para roles distintos de Administrador.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const jwt = require("jsonwebtoken");

const db = require("../helpers/mockDb");
const app = require("../../app");
const userModel = require("../../models/userModel");
const userService = require("../../services/userService");

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "uniride_default_secret_key", {
    expiresIn: "1h",
  });

const adminToken = tokenFor({ id: 1, roles: ["Administrador"], rol: "Administrador" });
const pasajeroToken = tokenFor({ id: 2, roles: ["Pasajero"], rol: "Pasajero" });

const pageRow = {
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
  // Columnas sensibles que nunca deben llegar a la respuesta aunque el
  // driver las devolviera por error.
  password_hash: "hash-secreto",
  telefono: "8441234567",
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe("GET /users — autenticación y autorización", () => {
  test("401 sin token", async () => {
    const res = await request(app).get("/users");

    expect(res.status).toBe(401);
    expect(db.requests).toHaveLength(0);
  });

  test("401 con token inválido", async () => {
    const res = await request(app)
      .get("/users")
      .set("Authorization", "Bearer token-falso");

    expect(res.status).toBe(401);
  });

  test("403 para un usuario sin rol Administrador", async () => {
    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${pasajeroToken}`);

    expect(res.status).toBe(403);
    expect(db.requests).toHaveLength(0);
  });

  test("403 si el usuario es Administrador pero tiene activo otro rol", async () => {
    const token = tokenFor({ id: 3, roles: ["Pasajero", "Administrador"], rol: "Pasajero" });

    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Active-Role", "Pasajero");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ROLE_NOT_ACTIVE");
  });

  test("200 para Administrador", async () => {
    jest.spyOn(userModel, "findAll").mockResolvedValue({ users: [], total: 0 });

    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

describe("GET /users — validación de parámetros", () => {
  const invalidQueries = [
    ["page=0", "page"],
    ["page=-1", "page"],
    ["page=abc", "page"],
    ["page=1.5", "page"],
    ["limit=0", "limit"],
    ["limit=51", "limit"],
    ["limit=10x", "limit"],
    ["page=1&page=2", "page"],
    [`q=${"a".repeat(101)}`, "q"],
    [`rol=${"r".repeat(51)}`, "rol"],
  ];

  test.each(invalidQueries)("400 con %s", async (query, param) => {
    const spy = jest.spyOn(userModel, "findAll");

    const res = await request(app)
      .get(`/users?${query}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(param);
    expect(spy).not.toHaveBeenCalled();
  });

  test("400 si el rol no existe", async () => {
    jest.spyOn(userModel, "findRoleIdByName").mockResolvedValue(null);
    const spy = jest.spyOn(userModel, "findAll");

    const res = await request(app)
      .get("/users?rol=Piloto")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('El rol "Piloto" no existe.');
    expect(spy).not.toHaveBeenCalled();
  });

  test("acepta limit=50 (máximo permitido)", async () => {
    jest.spyOn(userModel, "findAll").mockResolvedValue({ users: [], total: 0 });

    const res = await request(app)
      .get("/users?limit=50")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.paginacion.limite).toBe(50);
  });

  test("500 con mensaje genérico si falla la base de datos", async () => {
    jest.spyOn(userModel, "findAll").mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body.message).not.toContain("ECONNREFUSED");
  });
});

describe("Servicio: userService.listUsers", () => {
  test("usa 20 por página y la página 1 por defecto", async () => {
    const spy = jest.spyOn(userModel, "findAll").mockResolvedValue({ users: [], total: 0 });

    const result = await userService.listUsers();

    expect(spy).toHaveBeenCalledWith({ search: "", roleId: null, limit: 20, offset: 0 });
    expect(result.paginacion).toEqual({ pagina: 1, limite: 20, total: 0, total_paginas: 0 });
  });

  test("calcula offset y total_paginas", async () => {
    const spy = jest.spyOn(userModel, "findAll").mockResolvedValue({ users: [], total: 45 });

    const result = await userService.listUsers({ page: "3", limit: "10" });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 20 }));
    expect(result.paginacion).toEqual({ pagina: 3, limite: 10, total: 45, total_paginas: 5 });
  });

  test("resuelve el rol por nombre y filtra por su id", async () => {
    jest.spyOn(userModel, "findRoleIdByName").mockResolvedValue(2);
    const spy = jest.spyOn(userModel, "findAll").mockResolvedValue({ users: [], total: 0 });

    await userService.listUsers({ q: "  ana ", rol: "conductor" });

    expect(userModel.findRoleIdByName).toHaveBeenCalledWith("conductor");
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ search: "ana", roleId: 2 }));
  });
});

describe("Modelo: userModel.findAll", () => {
  test("sin resultados no ejecuta la consulta de página", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    const result = await userModel.findAll({ limit: 20, offset: 0 });

    expect(result).toEqual({ users: [], total: 0 });
    expect(db.requests).toHaveLength(1);
    expect(db.requests[0].text).not.toMatch(/WHERE/);
  });

  test("busca por nombre, apellido o correo escapando comodines de LIKE", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await userModel.findAll({ search: "50%_[x]", limit: 20, offset: 0 });

    const [countQuery] = db.requests;
    expect(countQuery.text).toMatch(/u\.nombre LIKE @search/);
    expect(countQuery.text).toMatch(/u\.apellido LIKE @search/);
    expect(countQuery.text).toMatch(/u\.correo LIKE @search/);
    expect(countQuery.inputs.search.value).toBe("%50\\%\\_\\[x]%");
  });

  test("filtra por rol usando UsuariosRoles y el rol principal heredado", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await userModel.findAll({ roleId: 2, limit: 20, offset: 0 });

    const [countQuery] = db.requests;
    expect(countQuery.text).toMatch(/UsuariosRoles/);
    expect(countQuery.inputs.rol_id).toEqual({ type: { name: "Int" }, value: 2 });
  });

  test("pagina con OFFSET/FETCH y no selecciona columnas sensibles", async () => {
    db.queueResult({ recordset: [{ total: 1 }] });
    db.queueResult({ recordset: [pageRow] });
    db.queueResult({ recordset: [] });

    await userModel.findAll({ limit: 10, offset: 30 });

    const pageQuery = db.requests[1];
    expect(pageQuery.text).toMatch(/OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY/);
    expect(db.valuesOf(pageQuery)).toMatchObject({ offset: 30, limit: 10 });
    expect(pageQuery.text).not.toMatch(/password_hash/);
    expect(pageQuery.text).not.toMatch(/telefono/);
  });

  test("agrupa los roles M:N y no expone contraseña ni teléfono", async () => {
    db.queueResult({ recordset: [{ total: 2 }] });
    db.queueResult({ recordset: [pageRow, { ...pageRow, id: 8, correo: "luis@uadec.edu.mx" }] });
    db.queueResult({
      recordset: [
        { usuario_id: 7, id: 1, nombre: "Pasajero" },
        { usuario_id: 7, id: 2, nombre: "Conductor" },
      ],
    });

    const { users, total } = await userModel.findAll({ limit: 20, offset: 0 });

    expect(total).toBe(2);
    expect(db.valuesOf(db.requests[2])).toEqual({ id0: 7, id1: 8 });
    expect(users[0]).toEqual({
      id: 7,
      nombre: "Ana",
      apellido: "López",
      correo: "ana@uadec.edu.mx",
      fecha_registro: pageRow.fecha_registro,
      campus_id: 3,
      campus: "Campus Arteaga",
      universidad: "UAdeC",
      roles: ["Pasajero", "Conductor"],
      roles_detalle: [
        { id: 1, nombre: "Pasajero" },
        { id: 2, nombre: "Conductor" },
      ],
    });
    // Sin filas en UsuariosRoles se usa el rol principal heredado
    expect(users[1].roles).toEqual(["Pasajero"]);
    for (const user of users) {
      expect(user).not.toHaveProperty("password_hash");
      expect(user).not.toHaveProperty("telefono");
    }
  });
});

describe("GET /users — respuesta completa", () => {
  test("devuelve usuarios y paginación sin datos sensibles", async () => {
    db.queueResult({ recordset: [{ total: 1 }] });
    db.queueResult({ recordset: [pageRow] });
    db.queueResult({ recordset: [{ usuario_id: 7, id: 1, nombre: "Pasajero" }] });

    const res = await request(app)
      .get("/users?q=ana&page=1&limit=20")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.paginacion).toEqual({ pagina: 1, limite: 20, total: 1, total_paginas: 1 });
    expect(res.body.usuarios).toHaveLength(1);
    expect(res.body.usuarios[0].correo).toBe("ana@uadec.edu.mx");
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash-secreto|8441234567/);
  });
});
