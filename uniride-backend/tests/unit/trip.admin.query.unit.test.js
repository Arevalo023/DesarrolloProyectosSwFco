/**
 * Pruebas unitarias para la consulta administrativa de viajes.
 * Issue #147: API de viajes (consulta) — GET /api/trips/admin y GET /api/trips/:id (Historia 27).
 *
 * Criterios de aceptación cubiertos:
 *  1. Permitir filtrar por estado, fecha y conductor, con paginación (20 por defecto, máximo 50).
 *  2. Devolver el detalle del viaje con sus reservaciones.
 *  3. Consultar viajes en cualquier estado sin modificarlos.
 *  4. Responder 401 sin token y 403 para roles distintos de Administrador.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const jwt = require("jsonwebtoken");

const db = require("../helpers/mockDb");
const app = require("../../app");
const tripModel = require("../../models/tripModel");
const tripService = require("../../services/tripService");

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "uniride_default_secret_key", {
    expiresIn: "1h",
  });

const adminToken = tokenFor({ id: 1, roles: ["Administrador"], rol: "Administrador" });
const conductorToken = tokenFor({ id: 2, roles: ["Conductor"], rol: "Conductor" });
const pasajeroToken = tokenFor({ id: 3, roles: ["Pasajero"], rol: "Pasajero" });

const mockTripRow = {
  id: 10,
  conductor_id: 5,
  vehiculo_id: 2,
  origen: "Campus Arteaga",
  destino: "Rectoría",
  fecha_salida: new Date("2026-11-01T08:00:00Z"),
  cupo_disponible: 3,
  costo_por_pasajero: 25.0,
  estado: "programado",
  motivo_cancelacion: null,
  conductor_nombre_pila: "Carlos",
  conductor_apellido: "Gómez",
  conductor_nombre: "Carlos Gómez",
  conductor_correo: "carlos.gomez@uadec.edu.mx",
  conductor_telefono: "8441112233",
  vehiculo_marca: "Nissan",
  vehiculo_modelo: "Versa",
  vehiculo_anio: 2022,
  vehiculo_color: "Rojo",
  vehiculo_placa: "ABC-123",
  total_reservaciones: 1,
};

const mockReservationRow = {
  id: 101,
  viaje_id: 10,
  pasajero_id: 8,
  estado: "aceptada",
  fecha_solicitud: new Date("2026-10-27T10:00:00Z"),
  pasajero_nombre_pila: "Laura",
  pasajero_apellido: "Sánchez",
  pasajero_nombre: "Laura Sánchez",
  pasajero_correo: "laura.sanchez@uadec.edu.mx",
  pasajero_telefono: "8449998877",
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe("GET /api/trips/admin — autenticación y autorización", () => {
  test("401 sin token", async () => {
    const res = await request(app).get("/api/trips/admin");

    expect(res.status).toBe(401);
    expect(db.requests).toHaveLength(0);
  });

  test("401 con token inválido", async () => {
    const res = await request(app)
      .get("/api/trips/admin")
      .set("Authorization", "Bearer token-invalido");

    expect(res.status).toBe(401);
  });

  test("403 para un usuario con rol Pasajero", async () => {
    const res = await request(app)
      .get("/api/trips/admin")
      .set("Authorization", `Bearer ${pasajeroToken}`);

    expect(res.status).toBe(403);
    expect(db.requests).toHaveLength(0);
  });

  test("403 para un usuario con rol Conductor", async () => {
    const res = await request(app)
      .get("/api/trips/admin")
      .set("Authorization", `Bearer ${conductorToken}`);

    expect(res.status).toBe(403);
    expect(db.requests).toHaveLength(0);
  });

  test("403 si el usuario es Administrador pero tiene activo otro rol", async () => {
    const token = tokenFor({ id: 4, roles: ["Pasajero", "Administrador"], rol: "Pasajero" });

    const res = await request(app)
      .get("/api/trips/admin")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Active-Role", "Pasajero");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ROLE_NOT_ACTIVE");
  });

  test("200 para usuario con rol Administrador", async () => {
    jest.spyOn(tripModel, "findAllAdmin").mockResolvedValue({ trips: [], total: 0 });

    const res = await request(app)
      .get("/api/trips/admin")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("viajes");
    expect(res.body).toHaveProperty("paginacion");
  });
});

describe("GET /api/trips/admin — validación de parámetros", () => {
  const invalidQueries = [
    ["page=0", "page"],
    ["page=-1", "page"],
    ["page=abc", "page"],
    ["limit=0", "limit"],
    ["limit=51", "limit"],
    ["limit=xyz", "limit"],
    ["fecha=2026-15-40", "fecha"],
    ["fecha=invalida", "fecha"],
    [`estado=${"e".repeat(51)}`, "estado"],
    [`conductor=${"c".repeat(101)}`, "conductor"],
  ];

  test.each(invalidQueries)("400 con %s", async (query, param) => {
    const spy = jest.spyOn(tripModel, "findAllAdmin");

    const res = await request(app)
      .get(`/api/trips/admin?${query}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(param);
    expect(spy).not.toHaveBeenCalled();
  });

  test("acepta limit=50 (máximo permitido)", async () => {
    jest.spyOn(tripModel, "findAllAdmin").mockResolvedValue({ trips: [], total: 0 });

    const res = await request(app)
      .get("/api/trips/admin?limit=50")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.paginacion.limite).toBe(50);
  });

  test("500 con mensaje genérico si falla la base de datos", async () => {
    jest.spyOn(tripModel, "findAllAdmin").mockRejectedValue(new Error("DB_TIMEOUT"));

    const res = await request(app)
      .get("/api/trips/admin")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body.message).not.toContain("DB_TIMEOUT");
    expect(res.body.message).toBe("Error interno del servidor al consultar los viajes.");
  });
});

describe("GET /api/trips/admin/:id y GET /api/trips/:id — Detalle del viaje", () => {
  test("401 sin token", async () => {
    const res = await request(app).get("/api/trips/admin/10");
    expect(res.status).toBe(401);

    const resAlias = await request(app).get("/api/trips/10");
    expect(resAlias.status).toBe(401);
  });

  test("403 para usuarios sin rol Administrador", async () => {
    const res = await request(app)
      .get("/api/trips/admin/10")
      .set("Authorization", `Bearer ${pasajeroToken}`);
    expect(res.status).toBe(403);

    const resAlias = await request(app)
      .get("/api/trips/10")
      .set("Authorization", `Bearer ${pasajeroToken}`);
    expect(resAlias.status).toBe(403);
  });

  test("400 si el ID no es un entero positivo", async () => {
    const res1 = await request(app)
      .get("/api/trips/admin/abc")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res1.status).toBe(400);
    expect(res1.body.message).toBe("El ID del viaje debe ser un número entero positivo.");

    const res2 = await request(app)
      .get("/api/trips/admin/0")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res2.status).toBe(400);

    const res3 = await request(app)
      .get("/api/trips/-4")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res3.status).toBe(400);
  });

  test("404 si el viaje no existe", async () => {
    jest.spyOn(tripModel, "findDetailWithReservations").mockResolvedValue(null);

    const res = await request(app)
      .get("/api/trips/admin/999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("El viaje no existe.");
  });

  test("200 devuelve detalle del viaje con sus reservaciones", async () => {
    const mockDetail = {
      id: 10,
      origen: "Campus Arteaga",
      destino: "Rectoría",
      fecha_salida: new Date("2026-11-01T08:00:00Z"),
      cupo_disponible: 3,
      asientos_disponibles: 3,
      costo_por_pasajero: 25.0,
      estado: "programado",
      motivo_cancelacion: null,
      conductor_id: 5,
      conductor_nombre: "Carlos Gómez",
      conductor: {
        id: 5,
        nombre: "Carlos",
        apellido: "Gómez",
        nombre_completo: "Carlos Gómez",
        correo: "carlos.gomez@uadec.edu.mx",
        telefono: "8441112233",
      },
      vehiculo_id: 2,
      vehiculo: {
        id: 2,
        marca: "Nissan",
        modelo: "Versa",
        anio: 2022,
        color: "Rojo",
        placa: "ABC-123",
      },
      reservaciones: [
        {
          id: 101,
          viaje_id: 10,
          pasajero_id: 8,
          estado: "aceptada",
          fecha_solicitud: new Date("2026-10-27T10:00:00Z"),
          pasajero_nombre: "Laura Sánchez",
          pasajero_correo: "laura.sanchez@uadec.edu.mx",
          pasajero_telefono: "8449998877",
          pasajero: {
            id: 8,
            nombre: "Laura",
            apellido: "Sánchez",
            nombre_completo: "Laura Sánchez",
            correo: "laura.sanchez@uadec.edu.mx",
            telefono: "8449998877",
          },
        },
      ],
    };

    jest.spyOn(tripModel, "findDetailWithReservations").mockResolvedValue(mockDetail);

    const res = await request(app)
      .get("/api/trips/admin/10")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.viaje.id).toBe(10);
    expect(res.body.viaje.conductor.nombre_completo).toBe("Carlos Gómez");
    expect(res.body.viaje.reservaciones).toHaveLength(1);
    expect(res.body.viaje.reservaciones[0].pasajero_nombre).toBe("Laura Sánchez");

    // Probar también a través del endpoint alias /api/trips/:id
    const resAlias = await request(app)
      .get("/api/trips/10")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(resAlias.status).toBe(200);
    expect(resAlias.body.viaje.id).toBe(10);
  });
});

describe("Servicio: tripService.listTripsAdmin y getTripDetailAdmin", () => {
  test("listTripsAdmin usa 20 por página y página 1 por defecto", async () => {
    const spy = jest.spyOn(tripModel, "findAllAdmin").mockResolvedValue({ trips: [], total: 0 });

    const result = await tripService.listTripsAdmin();

    expect(spy).toHaveBeenCalledWith({
      estado: "",
      fecha: "",
      conductor: "",
      limit: 20,
      offset: 0,
    });
    expect(result.paginacion).toEqual({
      pagina: 1,
      limite: 20,
      total: 0,
      total_paginas: 0,
    });
  });

  test("listTripsAdmin calcula offset y total_paginas", async () => {
    const spy = jest.spyOn(tripModel, "findAllAdmin").mockResolvedValue({ trips: [], total: 45 });

    const result = await tripService.listTripsAdmin({ page: "3", limit: "10" });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 20 }));
    expect(result.paginacion).toEqual({
      pagina: 3,
      limite: 10,
      total: 45,
      total_paginas: 5,
    });
  });

  test("getTripDetailAdmin lanza 404 si el viaje no existe", async () => {
    jest.spyOn(tripModel, "findDetailWithReservations").mockResolvedValue(null);

    await expect(tripService.getTripDetailAdmin(999)).rejects.toMatchObject({
      statusCode: 404,
      message: "El viaje no existe.",
    });
  });
});

describe("Modelo: tripModel.findAllAdmin y findDetailWithReservations", () => {
  test("findAllAdmin sin resultados ejecuta solo el conteo", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    const result = await tripModel.findAllAdmin({ limit: 20, offset: 0 });

    expect(result).toEqual({ trips: [], total: 0 });
    expect(db.requests).toHaveLength(1);
    expect(db.requests[0].text).toMatch(/SELECT\s+COUNT\(\*\)\s+AS\s+total\s+FROM\s+Viajes\s+v/i);
    expect(db.requests[0].text).not.toContain("WHERE");
  });

  test("findAllAdmin con filtros arma correctamente la cláusula WHERE y parámetros SQL", async () => {
    // 1. Conteo
    db.queueResult({ recordset: [{ total: 1 }] });
    // 2. Página
    db.queueResult({ recordset: [mockTripRow] });

    const result = await tripModel.findAllAdmin({
      estado: "programado",
      fecha: "2026-11-01",
      conductor: "carlos",
      limit: 20,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(result.trips).toHaveLength(1);
    expect(result.trips[0].conductor.nombre_completo).toBe("Carlos Gómez");
    expect(result.trips[0].vehiculo.placa).toBe("ABC-123");
    expect(result.trips[0].total_reservaciones).toBe(1);

    expect(db.requests).toHaveLength(2);
    const countReq = db.requests[0];
    expect(countReq.text).toContain("WHERE");
    expect(countReq.inputs.estadoFiltro.value).toBe("programado");
    expect(countReq.inputs.fechaFiltro.value).toBe("2026-11-01");
    expect(countReq.inputs.conductorFiltro.value).toBe("%carlos%");
  });

  test("findAllAdmin con conductor numérico filtra por ID", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await tripModel.findAllAdmin({ conductor: "5" });

    const countReq = db.requests[0];
    expect(countReq.text).toContain("v.conductor_id = @conductorIdFiltro");
    expect(countReq.inputs.conductorIdFiltro.value).toBe(5);
  });

  test("findDetailWithReservations devuelve viaje completo con reservaciones asociadas", async () => {
    // 1. Consulta del viaje
    db.queueResult({ recordset: [mockTripRow] });
    // 2. Consulta de reservaciones
    db.queueResult({ recordset: [mockReservationRow] });

    const result = await tripModel.findDetailWithReservations(10);

    expect(result).not.toBeNull();
    expect(result.id).toBe(10);
    expect(result.conductor.correo).toBe("carlos.gomez@uadec.edu.mx");
    expect(result.vehiculo.marca).toBe("Nissan");
    expect(result.reservaciones).toHaveLength(1);
    expect(result.reservaciones[0].pasajero.correo).toBe("laura.sanchez@uadec.edu.mx");

    expect(db.requests).toHaveLength(2);
    expect(db.requests[0].inputs.id.value).toBe(10);
    expect(db.requests[1].inputs.viaje_id.value).toBe(10);
  });

  test("findDetailWithReservations devuelve null si el viaje no existe", async () => {
    db.queueResult({ recordset: [] });

    const result = await tripModel.findDetailWithReservations(999);

    expect(result).toBeNull();
    expect(db.requests).toHaveLength(1);
  });
});
