/**
 * Pruebas unitarias de autorización por rol y registro de acciones administrativas.
 * Issue #153: Pruebas de autorización y registro (BE) — HU-09.
 *
 * Criterios de aceptación cubiertos:
 *  1. Probar 401, 403 y acceso permitido en todas las rutas administrativas:
 *     - GET /users
 *     - GET /users/:id
 *     - GET /api/trips/admin
 *     - GET /api/trips/admin/:id
 *     - GET /api/trips/:id (alias)
 *     - PATCH /api/trips/admin/:id/cancel
 *     - PATCH /api/trips/:id/cancel-admin (alias)
 *     - PATCH /api/trips/:id/cancel (con rol Administrador)
 *  2. Probar el acceso directo a la API con un usuario que no es administrador:
 *     - Usuarios con rol exclusivo 'Pasajero' o 'Conductor' (403 Acceso denegado).
 *     - Usuarios con rol Administrador pero en estado inactivo (403 ROLE_NOT_ACTIVE).
 *     - Intentos de forzar rol Administrador mediante X-Active-Role sin poseerlo (403 INVALID_ACTIVE_ROLE).
 *  3. Probar que las acciones sensibles generan su registro:
 *     - La cancelación administrativa invoca auditService.logAction con los parámetros esperados.
 *     - Se emite el registro estructurado [AUDIT] en el log del servidor con fecha ISO, admin, entidad, acción y motivo.
 *     - Peticiones rechazadas (401, 403, 400, 404) y cancelaciones de conductor no generan registros de auditoría.
 *     - Pruebas unitarias directas de auditService (parseo, normalización de IDs, formato y manejo de fechas).
 *  4. Las pruebas se ejecutan correctamente con npm test en uniride-backend.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const jwt = require("jsonwebtoken");

const db = require("../helpers/mockDb");
const app = require("../../app");
const auditService = require("../../services/auditService");
const notificationService = require("../../services/notificationService");
const userService = require("../../services/userService");
const tripService = require("../../services/tripService");
const tripModel = require("../../models/tripModel");
const tripController = require("../../controllers/tripController");

const JWT_SECRET = process.env.JWT_SECRET || "uniride_default_secret_key";

const tokenFor = (payload, options = {}) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1h", ...options });

// Tokens de prueba para diferentes perfiles y escenarios
const adminToken = tokenFor({ id: 1, roles: ["Administrador"], rol: "Administrador" });
const adminAliasToken = tokenFor({ id: 1, roles: ["admin"], rol: "admin" });
const multiRoleAdminToken = tokenFor({
  id: 2,
  roles: ["Pasajero", "Administrador"],
  rol: "Pasajero",
});
const passengerToken = tokenFor({ id: 3, roles: ["Pasajero"], rol: "Pasajero" });
const driverToken = tokenFor({ id: 4, roles: ["Conductor"], rol: "Conductor" });
const expiredAdminToken = jwt.sign(
  { id: 1, roles: ["Administrador"], rol: "Administrador" },
  JWT_SECRET,
  { expiresIn: "-1s" }
);

// Mocks de respuestas exitosas para comprobar acceso permitido (200)
const mockUserListResponse = {
  usuarios: [
    {
      id: 10,
      nombre: "Ana",
      apellido: "García",
      correo: "ana.garcia@uadec.edu.mx",
      roles: ["Pasajero"],
    },
  ],
  paginacion: { pagina: 1, limite: 20, total: 1, total_paginas: 1 },
};

const mockUserDetailResponse = {
  usuario: {
    id: 5,
    nombre: "Carlos",
    apellido: "López",
    correo: "carlos.lopez@uadec.edu.mx",
  },
  reputacion: { promedio: 4.8, total_calificaciones: 10, calificaciones: [] },
  viajes: [],
  reservaciones: [],
};

const mockTripListResponse = {
  viajes: [
    {
      id: 25,
      origen: "Campus Arteaga",
      destino: "Rectoría",
      estado: "programado",
      conductor: { id: 4, nombre: "Roberto", apellido: "Soto" },
    },
  ],
  total: 1,
  totalPaginas: 1,
  paginaActual: 1,
};

const mockTripDetailResponse = {
  id: 10,
  origen: "Campus Arteaga",
  destino: "Rectoría",
  estado: "programado",
  cupo_disponible: 3,
  conductor: { id: 4, nombre: "Roberto", apellido: "Soto" },
  vehiculo: { marca: "Nissan", modelo: "Versa", placas: "ABC-123" },
  reservaciones: [],
};

const mockCancelledTripEntity = {
  id: 10,
  estado: "cancelado",
  motivo_cancelacion: "Cierre temporal de vialidad universitaria",
};

// Rutas administrativas que requieren rol Administrador
const adminRoutes = [
  { method: "get", path: "/users", description: "GET /users (Listar usuarios)" },
  { method: "get", path: "/users/5", description: "GET /users/:id (Detalle de usuario)" },
  { method: "get", path: "/api/trips/admin", description: "GET /api/trips/admin (Listar viajes admin)" },
  { method: "get", path: "/api/trips/admin/10", description: "GET /api/trips/admin/:id (Detalle de viaje admin)" },
  { method: "get", path: "/api/trips/10", description: "GET /api/trips/:id (Alias detalle de viaje admin)" },
  {
    method: "patch",
    path: "/api/trips/admin/10/cancel",
    body: { motivo: "Cierre de vialidad" },
    description: "PATCH /api/trips/admin/:id/cancel (Cancelación admin)",
  },
  {
    method: "patch",
    path: "/api/trips/10/cancel-admin",
    body: { motivo: "Cierre de vialidad" },
    description: "PATCH /api/trips/:id/cancel-admin (Alias cancelación admin)",
  },
];

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe("Issue #153: Pruebas de autorización y registro (BE) — HU-09", () => {
  describe("1. Respuestas 401 Unauthorized en todas las rutas administrativas", () => {
    adminRoutes.forEach(({ method, path, body, description }) => {
      describe(description, () => {
        test("rechaza con 401 si no se envía cabecera Authorization", async () => {
          const req = request(app)[method](path);
          if (body) req.send(body);
          const res = await req;

          expect(res.status).toBe(401);
          expect(res.body).toEqual({
            message: "Acceso no autorizado: Token no proporcionado.",
          });
          expect(db.requests).toHaveLength(0);
        });

        test("rechaza con 401 si la cabecera no tiene prefijo 'Bearer '", async () => {
          const req = request(app)[method](path).set("Authorization", "Basic tokeninvalido123");
          if (body) req.send(body);
          const res = await req;

          expect(res.status).toBe(401);
          expect(res.body.message).toMatch(/Token no proporcionado/i);
          expect(db.requests).toHaveLength(0);
        });

        test("rechaza con 401 si el token es inválido o fue alterado", async () => {
          const req = request(app)[method](path).set("Authorization", "Bearer token_falso_invalido");
          if (body) req.send(body);
          const res = await req;

          expect(res.status).toBe(401);
          expect(res.body).toEqual({
            message: "Token de autenticación no válido.",
          });
          expect(db.requests).toHaveLength(0);
        });

        test("rechaza con 401 si el token ha expirado", async () => {
          const req = request(app)[method](path).set("Authorization", `Bearer ${expiredAdminToken}`);
          if (body) req.send(body);
          const res = await req;

          expect(res.status).toBe(401);
          expect(res.body).toEqual({
            message: "La sesión ha expirado. Por favor inicia sesión nuevamente.",
          });
          expect(db.requests).toHaveLength(0);
        });
      });
    });

    test("PATCH /api/trips/:id/cancel rechaza con 401 si no se envía token", async () => {
      const res = await request(app)
        .patch("/api/trips/10/cancel")
        .send({ motivo: "Cancelación sin sesión" });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Token no proporcionado/i);
      expect(db.requests).toHaveLength(0);
    });
  });

  describe("2. Acceso directo a la API con usuarios no administradores (403 Forbidden y RBAC)", () => {
    describe("2.1 Intentos de acceso directo con usuario de rol 'Pasajero'", () => {
      adminRoutes.forEach(({ method, path, body, description }) => {
        test(`rechaza ${description} con 403 y mensaje de permisos insuficientes`, async () => {
          const req = request(app)[method](path).set("Authorization", `Bearer ${passengerToken}`);
          if (body) req.send(body);
          const res = await req;

          expect(res.status).toBe(403);
          expect(res.body).toEqual({
            message: "Acceso denegado: No cuentas con los permisos necesarios para realizar esta acción.",
          });
          expect(db.requests).toHaveLength(0);
        });
      });

      test("PATCH /api/trips/:id/cancel rechaza con 403 si el rol activo es 'Pasajero'", async () => {
        const res = await request(app)
          .patch("/api/trips/10/cancel")
          .set("Authorization", `Bearer ${passengerToken}`)
          .send({ motivo: "Pasajero intentando cancelar" });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({
          message: "Acceso denegado: No cuentas con los permisos necesarios para realizar esta acción.",
        });
        expect(db.requests).toHaveLength(0);
      });
    });

    describe("2.2 Intentos de acceso directo con usuario de rol 'Conductor'", () => {
      adminRoutes.forEach(({ method, path, body, description }) => {
        test(`rechaza ${description} con 403 y mensaje de permisos insuficientes`, async () => {
          const req = request(app)[method](path).set("Authorization", `Bearer ${driverToken}`);
          if (body) req.send(body);
          const res = await req;

          expect(res.status).toBe(403);
          expect(res.body).toEqual({
            message: "Acceso denegado: No cuentas con los permisos necesarios para realizar esta acción.",
          });
          expect(db.requests).toHaveLength(0);
        });
      });
    });

    describe("2.3 Intentos de falsificación mediante cabecera X-Active-Role", () => {
      test("rechaza con 403 INVALID_ACTIVE_ROLE si un no-administrador envía X-Active-Role: Administrador", async () => {
        const res = await request(app)
          .get("/users")
          .set("Authorization", `Bearer ${passengerToken}`)
          .set("X-Active-Role", "Administrador");

        expect(res.status).toBe(403);
        expect(res.body).toEqual({
          message: "El rol activo no corresponde a tu cuenta.",
          code: "INVALID_ACTIVE_ROLE",
        });
        expect(db.requests).toHaveLength(0);
      });

      test("rechaza con 403 INVALID_ACTIVE_ROLE en rutas de viajes admin si se suplanta el rol", async () => {
        const res = await request(app)
          .get("/api/trips/admin")
          .set("Authorization", `Bearer ${driverToken}`)
          .set("X-Active-Role", "Administrador");

        expect(res.status).toBe(403);
        expect(res.body).toEqual({
          message: "El rol activo no corresponde a tu cuenta.",
          code: "INVALID_ACTIVE_ROLE",
        });
        expect(db.requests).toHaveLength(0);
      });

      test("rechaza con 403 INVALID_ACTIVE_ROLE en cancelación admin si se suplanta el rol", async () => {
        const res = await request(app)
          .patch("/api/trips/admin/10/cancel")
          .set("Authorization", `Bearer ${passengerToken}`)
          .set("X-Active-Role", "Administrador")
          .send({ motivo: "Intento de cancelación no autorizada" });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe("INVALID_ACTIVE_ROLE");
        expect(db.requests).toHaveLength(0);
      });
    });

    describe("2.4 Usuario con rol Administrador en la cuenta pero con rol activo inactivo (ROLE_NOT_ACTIVE)", () => {
      test("rechaza con 403 y ROLE_NOT_ACTIVE si el rol por defecto en el token es 'Pasajero'", async () => {
        const res = await request(app)
          .get("/users")
          .set("Authorization", `Bearer ${multiRoleAdminToken}`);

        expect(res.status).toBe(403);
        expect(res.body).toEqual({
          message: "Cambia a modo Administrador para realizar esta acción.",
          code: "ROLE_NOT_ACTIVE",
          requiredRole: "Administrador",
        });
        expect(db.requests).toHaveLength(0);
      });

      test("rechaza con 403 y ROLE_NOT_ACTIVE en /api/trips/admin si el rol activo es 'Pasajero'", async () => {
        const res = await request(app)
          .get("/api/trips/admin")
          .set("Authorization", `Bearer ${multiRoleAdminToken}`)
          .set("X-Active-Role", "Pasajero");

        expect(res.status).toBe(403);
        expect(res.body).toEqual({
          message: "Cambia a modo Administrador para realizar esta acción.",
          code: "ROLE_NOT_ACTIVE",
          requiredRole: "Administrador",
        });
      });

      test("rechaza con 403 y ROLE_NOT_ACTIVE en cancelación administrativa si el rol activo no es admin", async () => {
        const res = await request(app)
          .patch("/api/trips/admin/10/cancel")
          .set("Authorization", `Bearer ${multiRoleAdminToken}`)
          .set("X-Active-Role", "Pasajero")
          .send({ motivo: "Cancelación con rol inactivo" });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe("ROLE_NOT_ACTIVE");
        expect(res.body.requiredRole).toBe("Administrador");
      });
    });
  });

  describe("3. Acceso permitido (200 OK) en todas las rutas administrativas", () => {
    describe("3.1 Acceso permitido con token de Administrador puro", () => {
      test("GET /users responde 200 para Administrador", async () => {
        jest.spyOn(userService, "listUsers").mockResolvedValue(mockUserListResponse);

        const res = await request(app)
          .get("/users")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockUserListResponse);
      });

      test("GET /users/:id responde 200 con detalle de usuario para Administrador", async () => {
        jest.spyOn(userService, "getUserDetail").mockResolvedValue(mockUserDetailResponse);

        const res = await request(app)
          .get("/users/5")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockUserDetailResponse);
      });

      test("GET /api/trips/admin responde 200 con listado de viajes para Administrador", async () => {
        jest.spyOn(tripService, "listTripsAdmin").mockResolvedValue(mockTripListResponse);

        const res = await request(app)
          .get("/api/trips/admin")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockTripListResponse);
      });

      test("GET /api/trips/admin/:id responde 200 con detalle de viaje para Administrador", async () => {
        jest.spyOn(tripService, "getTripDetailAdmin").mockResolvedValue(mockTripDetailResponse);

        const res = await request(app)
          .get("/api/trips/admin/10")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.viaje).toEqual(mockTripDetailResponse);
        expect(res.body.trip).toEqual(mockTripDetailResponse);
      });

      test("GET /api/trips/:id (alias) responde 200 con detalle de viaje para Administrador", async () => {
        jest.spyOn(tripService, "getTripDetailAdmin").mockResolvedValue(mockTripDetailResponse);

        const res = await request(app)
          .get("/api/trips/10")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.viaje).toEqual(mockTripDetailResponse);
        expect(res.body.trip).toEqual(mockTripDetailResponse);
      });

      test("PATCH /api/trips/admin/:id/cancel responde 200 para Administrador", async () => {
        jest.spyOn(tripService, "cancelAdmin").mockResolvedValue(mockCancelledTripEntity);

        const res = await request(app)
          .patch("/api/trips/admin/10/cancel")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ motivo: "Cierre temporal de vialidad universitaria" });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Viaje cancelado correctamente por administración.");
        expect(res.body.viaje).toEqual(mockCancelledTripEntity);
      });

      test("PATCH /api/trips/:id/cancel-admin (alias) responde 200 para Administrador", async () => {
        jest.spyOn(tripService, "cancelAdmin").mockResolvedValue(mockCancelledTripEntity);

        const res = await request(app)
          .patch("/api/trips/10/cancel-admin")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ motivo: "Cierre temporal de vialidad universitaria" });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Viaje cancelado correctamente por administración.");
        expect(res.body.viaje).toEqual(mockCancelledTripEntity);
      });

      test("PATCH /api/trips/:id/cancel canaliza a cancelación administrativa cuando el rol activo es Administrador", async () => {
        jest.spyOn(tripService, "cancelAdmin").mockResolvedValue(mockCancelledTripEntity);

        const res = await request(app)
          .patch("/api/trips/10/cancel")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ motivo: "Cierre temporal de vialidad universitaria" });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Viaje cancelado correctamente por administración.");
        expect(res.body.viaje).toEqual(mockCancelledTripEntity);
      });
    });

    describe("3.2 Acceso permitido con usuario multi-rol activando modo Administrador", () => {
      test("permite acceso a GET /users enviando X-Active-Role: Administrador", async () => {
        jest.spyOn(userService, "listUsers").mockResolvedValue(mockUserListResponse);

        const res = await request(app)
          .get("/users")
          .set("Authorization", `Bearer ${multiRoleAdminToken}`)
          .set("X-Active-Role", "Administrador");

        expect(res.status).toBe(200);
        expect(res.body.usuarios).toHaveLength(1);
      });

      test("permite acceso con alias de rol en minúsculas (admin <-> administrador)", async () => {
        jest.spyOn(tripService, "listTripsAdmin").mockResolvedValue(mockTripListResponse);

        const res = await request(app)
          .get("/api/trips/admin")
          .set("Authorization", `Bearer ${adminAliasToken}`)
          .set("X-Active-Role", "admin");

        expect(res.status).toBe(200);
        expect(res.body.viajes).toHaveLength(1);
      });

      test("permite cancelación administrativa a multi-rol con X-Active-Role: Administrador", async () => {
        jest.spyOn(tripService, "cancelAdmin").mockResolvedValue(mockCancelledTripEntity);

        const res = await request(app)
          .patch("/api/trips/admin/10/cancel")
          .set("Authorization", `Bearer ${multiRoleAdminToken}`)
          .set("X-Active-Role", "Administrador")
          .send({ motivo: "Cierre temporal de vialidad universitaria" });

        expect(res.status).toBe(200);
        expect(res.body.viaje.estado).toBe("cancelado");
      });
    });
  });

  describe("4. Registro de acciones sensibles en el log del servidor (Auditoría / auditService)", () => {
    const mockTripInDb = {
      id: 15,
      conductor_id: 4,
      vehiculo_id: 2,
      origen: "Campus Poniente",
      destino: "Campus Arteaga",
      fecha_salida: new Date("2026-11-05T08:00:00Z"),
      cupo_disponible: 2,
      costo_por_pasajero: 30.0,
      estado: "programado",
      motivo_cancelacion: null,
    };

    describe("4.1 Generación confiable de logs en cancelaciones administrativas exitosas", () => {
      test("genera registro de auditoría completo y estructurado al cancelar vía /admin/:id/cancel", async () => {
        // Mock de base de datos para la transacción de cancelación
        db.queueResult({ recordset: [mockTripInDb] }); // SELECT viaje con lock
        db.queueResult({
          recordset: [{ id: 50, viaje_id: 15, pasajero_id: 9, estado: "aceptada" }],
        }); // SELECT reservaciones aceptadas
        db.queueResult({
          recordset: [
            {
              ...mockTripInDb,
              estado: "cancelado",
              motivo_cancelacion: "Suspensión de clases por contingencia",
            },
          ],
        }); // UPDATE Viajes
        db.queueResult({ recordset: [] }); // UPDATE SolicitudesViaje

        jest.spyOn(notificationService, "notifyTripCancelledByAdmin").mockResolvedValue({});
        const auditSpy = jest.spyOn(auditService, "logAction");
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        const res = await request(app)
          .patch("/api/trips/admin/15/cancel")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ motivo: "Suspensión de clases por contingencia" });

        expect(res.status).toBe(200);

        // 1. Verificación de llamada al servicio de auditoría
        expect(auditSpy).toHaveBeenCalledTimes(1);
        expect(auditSpy).toHaveBeenCalledWith({
          adminId: 1,
          entidad: "Viajes",
          entidadId: 15,
          accion: "CANCELAR_VIAJE",
          motivo: "Suspensión de clases por contingencia",
        });

        // 2. Verificación de emisión estructurada en el log de la consola
        expect(consoleSpy).toHaveBeenCalled();
        const auditLogCall = consoleSpy.mock.calls.find((args) =>
          typeof args[0] === "string" && args[0].startsWith("[AUDIT]")
        );
        expect(auditLogCall).toBeDefined();

        const jsonString = auditLogCall[0].replace("[AUDIT] ", "");
        const parsedEntry = JSON.parse(jsonString);

        expect(parsedEntry).toMatchObject({
          tipo: "ACCION_ADMINISTRATIVA",
          administrador_id: 1,
          entidad: "Viajes",
          entidad_id: 15,
          accion: "CANCELAR_VIAJE",
          motivo: "Suspensión de clases por contingencia",
        });
        expect(new Date(parsedEntry.fecha).toString()).not.toBe("Invalid Date");
      });

      test("genera registro de auditoría al cancelar vía alias /:id/cancel-admin", async () => {
        db.queueResult({ recordset: [mockTripInDb] });
        db.queueResult({ recordset: [] });
        db.queueResult({
          recordset: [{ ...mockTripInDb, estado: "cancelado", motivo_cancelacion: "Vialidad colapsada" }],
        });
        db.queueResult({ recordset: [] });

        const auditSpy = jest.spyOn(auditService, "logAction");
        jest.spyOn(console, "log").mockImplementation(() => {});

        const res = await request(app)
          .patch("/api/trips/15/cancel-admin")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ motivo: "Vialidad colapsada" });

        expect(res.status).toBe(200);
        expect(auditSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            adminId: 1,
            entidad: "Viajes",
            entidadId: 15,
            accion: "CANCELAR_VIAJE",
            motivo: "Vialidad colapsada",
          })
        );
      });

      test("genera registro de auditoría en /api/trips/:id/cancel cuando el usuario es Administrador", async () => {
        db.queueResult({ recordset: [mockTripInDb] });
        db.queueResult({ recordset: [] });
        db.queueResult({
          recordset: [{ ...mockTripInDb, estado: "cancelado", motivo_cancelacion: "Evento institucional" }],
        });
        db.queueResult({ recordset: [] });

        const auditSpy = jest.spyOn(auditService, "logAction");
        jest.spyOn(console, "log").mockImplementation(() => {});

        const res = await request(app)
          .patch("/api/trips/15/cancel")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ motivo: "Evento institucional" });

        expect(res.status).toBe(200);
        expect(auditSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            adminId: 1,
            entidad: "Viajes",
            entidadId: 15,
            accion: "CANCELAR_VIAJE",
            motivo: "Evento institucional",
          })
        );
      });
    });

    describe("4.2 Operaciones rechazadas o no administrativas NO deben generar registros de auditoría", () => {
      test("NO genera auditoría si la petición es rechazada por falta de autenticación (401)", async () => {
        const auditSpy = jest.spyOn(auditService, "logAction");

        const res = await request(app)
          .patch("/api/trips/admin/15/cancel")
          .send({ motivo: "Intento anónimo" });

        expect(res.status).toBe(401);
        expect(auditSpy).not.toHaveBeenCalled();
      });

      test("NO genera auditoría si la petición es rechazada por falta de rol (403)", async () => {
        const auditSpy = jest.spyOn(auditService, "logAction");

        const res = await request(app)
          .patch("/api/trips/admin/15/cancel")
          .set("Authorization", `Bearer ${passengerToken}`)
          .send({ motivo: "Pasajero intentando cancelar admin" });

        expect(res.status).toBe(403);
        expect(auditSpy).not.toHaveBeenCalled();
      });

      test("NO genera auditoría si la validación de entrada falla por motivo vacío o ausente (400)", async () => {
        const auditSpy = jest.spyOn(auditService, "logAction");

        const res = await request(app)
          .patch("/api/trips/admin/15/cancel")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ motivo: "   " });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/El motivo de cancelación es obligatorio/i);
        expect(auditSpy).not.toHaveBeenCalled();
      });

      test("NO genera auditoría si la validación falla por ID de viaje no numérico (400)", async () => {
        const auditSpy = jest.spyOn(auditService, "logAction");

        const res = await request(app)
          .patch("/api/trips/admin/abc/cancel")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ motivo: "Motivo válido" });

        expect(res.status).toBe(400);
        expect(auditSpy).not.toHaveBeenCalled();
      });

      test("NO genera auditoría si el viaje a cancelar no existe en base de datos (404)", async () => {
        db.queueResult({ recordset: [] }); // No encuentra el viaje
        const auditSpy = jest.spyOn(auditService, "logAction");

        const res = await request(app)
          .patch("/api/trips/admin/999/cancel")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ motivo: "Viaje inexistente" });

        expect(res.status).toBe(404);
        expect(auditSpy).not.toHaveBeenCalled();
      });

      test("NO genera auditoría si el viaje ya se encuentra cancelado (400)", async () => {
        db.queueResult({ recordset: [{ ...mockTripInDb, estado: "cancelado" }] });
        const auditSpy = jest.spyOn(auditService, "logAction");

        const res = await request(app)
          .patch("/api/trips/admin/15/cancel")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ motivo: "Doble cancelación" });

        expect(res.status).toBe(400);
        expect(auditSpy).not.toHaveBeenCalled();
      });

      test("NO genera auditoría si un conductor cancela su propio viaje por la vía ordinaria", async () => {
        // En PATCH /api/trips/:id/cancel con rol Conductor se usa la cancelación ordinaria de conductor
        const auditSpy = jest.spyOn(auditService, "logAction");
        jest.spyOn(tripController, "cancel").mockImplementation((req, res) =>
          res.status(200).json({ message: "Viaje cancelado por conductor." })
        );

        const res = await request(app)
          .patch("/api/trips/15/cancel")
          .set("Authorization", `Bearer ${driverToken}`)
          .send({ motivo: "Problema mecánico particular" });

        expect(res.status).toBe(200);
        expect(auditSpy).not.toHaveBeenCalled();
      });
    });

    describe("4.3 Robustez y contrato unitario del servicio auditService", () => {
      test("auditService.logAction normaliza IDs numéricos y maneja fecha automática", () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        const entry = auditService.logAction({
          adminId: "42",
          entidad: "Viajes",
          entidadId: "105",
          accion: "CANCELAR_VIAJE",
          motivo: "  Motivo con espacios alrededor  ",
        });

        expect(entry).toEqual({
          tipo: "ACCION_ADMINISTRATIVA",
          fecha: expect.any(String),
          administrador_id: 42,
          entidad: "Viajes",
          entidad_id: 105,
          accion: "CANCELAR_VIAJE",
          motivo: "Motivo con espacios alrededor",
        });

        expect(consoleSpy).toHaveBeenCalledWith(`[AUDIT] ${JSON.stringify(entry)}`);
      });

      test("auditService.logAction respeta fecha personalizada provista como Date o string", () => {
        jest.spyOn(console, "log").mockImplementation(() => {});
        const explicitDate = new Date("2026-10-30T12:00:00Z");

        const entryDateObj = auditService.logAction({
          adminId: 1,
          entidad: "Usuarios",
          entidadId: 99,
          accion: "SUSPENDER_USUARIO",
          motivo: "Violación de términos",
          fecha: explicitDate,
        });

        expect(entryDateObj.fecha).toBe("2026-10-30T12:00:00.000Z");

        const entryDateStr = auditService.logAction({
          adminId: 1,
          entidad: "Usuarios",
          entidadId: 99,
          accion: "SUSPENDER_USUARIO",
          motivo: "Violación de términos",
          fecha: "2026-10-30T15:30:00Z",
        });

        expect(entryDateStr.fecha).toBe("2026-10-30T15:30:00.000Z");
      });

      test("auditService.logAction maneja motivo vacío o nulo sin arrojar error", () => {
        jest.spyOn(console, "log").mockImplementation(() => {});

        const entryNull = auditService.logAction({
          adminId: 1,
          entidad: "Viajes",
          entidadId: 10,
          accion: "CANCELAR_VIAJE",
          motivo: null,
        });
        expect(entryNull.motivo).toBe("");

        const entryUndefined = auditService.logAction({
          adminId: 1,
          entidad: "Viajes",
          entidadId: 10,
          accion: "CANCELAR_VIAJE",
        });
        expect(entryUndefined.motivo).toBe("");
      });
    });
  });
});
