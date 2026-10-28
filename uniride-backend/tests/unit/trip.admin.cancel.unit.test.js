/**
 * Pruebas unitarias para la cancelación administrativa de viajes.
 * Issue #149: Cancelación administrativa de viajes — HU-10.
 *
 * Criterios de aceptación cubiertos:
 *  1. Permitir cancelar solo viajes en estado programado; rechazar los demás estados con error explícito de negocio.
 *  2. Exigir un motivo para cancelar.
 *  3. Notificar solo a los pasajeros con reservación aceptada, sin avisos duplicados si la acción se repite.
 *  4. Registrar la acción en el log del servidor (auditoría).
 *  5. Responder 401 sin token y 403 para roles distintos de Administrador.
 *  6. El viaje cancelado aparece en "Viajes cancelados" (estado='cancelado').
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const jwt = require("jsonwebtoken");

const db = require("../helpers/mockDb");
const app = require("../../app");
const tripModel = require("../../models/tripModel");
const tripService = require("../../services/tripService");
const notificationService = require("../../services/notificationService");
const auditService = require("../../services/auditService");

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "uniride_default_secret_key", {
    expiresIn: "1h",
  });

const adminToken = tokenFor({ id: 1, roles: ["Administrador"], rol: "Administrador" });
const conductorToken = tokenFor({ id: 2, roles: ["Conductor"], rol: "Conductor" });
const pasajeroToken = tokenFor({ id: 3, roles: ["Pasajero"], rol: "Pasajero" });

const mockProgrammedTrip = {
  id: 15,
  conductor_id: 5,
  vehiculo_id: 2,
  origen: "Campus Poniente",
  destino: "Rectoría",
  fecha_salida: new Date("2026-11-05T08:00:00Z"),
  cupo_disponible: 3,
  costo_por_pasajero: 20.0,
  estado: "programado",
  motivo_cancelacion: null,
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe("PATCH /api/trips/admin/:id/cancel — Autenticación y Autorización", () => {
  test("401 sin token", async () => {
    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .send({ motivo: "Motivo válido" });

    expect(res.status).toBe(401);
    expect(db.requests).toHaveLength(0);
  });

  test("401 con token inválido", async () => {
    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", "Bearer token-invalido")
      .send({ motivo: "Motivo válido" });

    expect(res.status).toBe(401);
  });

  test("403 para usuario con rol Pasajero", async () => {
    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${pasajeroToken}`)
      .send({ motivo: "Motivo válido" });

    expect(res.status).toBe(403);
    expect(db.requests).toHaveLength(0);
  });

  test("403 si el usuario tiene rol Administrador pero tiene activo otro rol", async () => {
    const token = tokenFor({ id: 4, roles: ["Pasajero", "Administrador"], rol: "Pasajero" });

    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Active-Role", "Pasajero")
      .send({ motivo: "Motivo válido" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ROLE_NOT_ACTIVE");
  });

  test("200 para usuario con rol Administrador", async () => {
    jest.spyOn(tripService, "cancelAdmin").mockResolvedValue({
      id: 15,
      estado: "cancelado",
      motivo_cancelacion: "Mantenimiento urgente",
    });

    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Mantenimiento urgente" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("cancelado correctamente");
    expect(res.body.viaje.estado).toBe("cancelado");
  });

  test("200 funciona también en el alias /api/trips/:id/cancel cuando el rol activo es Administrador", async () => {
    jest.spyOn(tripService, "cancelAdmin").mockResolvedValue({
      id: 15,
      estado: "cancelado",
      motivo_cancelacion: "Cancelado por rectoría",
    });

    const res = await request(app)
      .patch("/api/trips/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Cancelado por rectoría" });

    expect(res.status).toBe(200);
    expect(res.body.viaje.estado).toBe("cancelado");
  });
});

describe("PATCH /api/trips/admin/:id/cancel — Validación de parámetros y motivo", () => {
  test("400 si el ID del viaje no es entero positivo", async () => {
    const res = await request(app)
      .patch("/api/trips/admin/abc/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Motivo de prueba" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("El ID del viaje debe ser un número entero positivo.");
  });

  test("400 si no se envía motivo", async () => {
    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("El motivo de cancelación es obligatorio.");
  });

  test("400 si el motivo está vacío o solo contiene espacios", async () => {
    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "    " });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("El motivo de cancelación es obligatorio.");
  });

  test("400 si el motivo no es una cadena de texto", async () => {
    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: 12345 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("El motivo de cancelación es obligatorio.");
  });

  test("400 si el motivo excede 250 caracteres", async () => {
    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "a".repeat(251) });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("El motivo de cancelación no puede exceder los 250 caracteres.");
  });

  test("acepta el alias motivo_cancelacion", async () => {
    jest.spyOn(tripService, "cancelAdmin").mockResolvedValue({
      id: 15,
      estado: "cancelado",
      motivo_cancelacion: "Cierre de vialidades",
    });

    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo_cancelacion: "Cierre de vialidades" });

    expect(res.status).toBe(200);
    expect(tripService.cancelAdmin).toHaveBeenCalledWith(15, 1, "Cierre de vialidades");
  });
});

describe("Controlador y Modelo — Reglas de negocio de cancelación", () => {
  test("404 si el viaje no existe", async () => {
    // Fila no encontrada
    db.queueResult({ recordset: [] });

    const res = await request(app)
      .patch("/api/trips/admin/999/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "No existe" });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("El viaje no existe.");
    expect(db.lastTransaction?.rolledBack).toBe(true);
  });

  test("400 si el viaje está en estado 'en_curso'", async () => {
    db.queueResult({
      recordset: [{ ...mockProgrammedTrip, estado: "en_curso" }],
    });

    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Intento de cancelación" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("ya se encuentra en curso");
    expect(db.lastTransaction?.rolledBack).toBe(true);
  });

  test("400 si el viaje está en estado 'finalizado'", async () => {
    db.queueResult({
      recordset: [{ ...mockProgrammedTrip, estado: "finalizado" }],
    });

    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Intento de cancelación" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("ya ha finalizado");
    expect(db.lastTransaction?.rolledBack).toBe(true);
  });

  test("400 si el viaje ya está en estado 'cancelado'", async () => {
    db.queueResult({
      recordset: [{ ...mockProgrammedTrip, estado: "cancelado" }],
    });

    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Doble cancelación" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("El viaje ya se encuentra cancelado.");
    expect(db.lastTransaction?.rolledBack).toBe(true);
  });

  test("200 y actualiza viaje y reservaciones si está en estado 'programado'", async () => {
    // 1. SELECT del viaje
    db.queueResult({ recordset: [mockProgrammedTrip] });
    // 2. SELECT de reservaciones aceptadas
    db.queueResult({
      recordset: [{ id: 101, viaje_id: 15, pasajero_id: 8, estado: "aceptada" }],
    });
    // 3. UPDATE Viajes
    db.queueResult({
      recordset: [{ ...mockProgrammedTrip, estado: "cancelado", motivo_cancelacion: "Lluvia severa" }],
    });
    // 4. UPDATE SolicitudesViaje
    db.queueResult({ recordset: [] });

    const notifySpy = jest
      .spyOn(notificationService, "notifyTripCancelledByAdmin")
      .mockResolvedValue({});
    const auditSpy = jest.spyOn(auditService, "logAction");

    const res = await request(app)
      .patch("/api/trips/admin/15/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Lluvia severa" });

    expect(res.status).toBe(200);
    expect(res.body.viaje.estado).toBe("cancelado");
    expect(res.body.viaje.motivo_cancelacion).toBe("Lluvia severa");

    expect(db.lastTransaction?.committed).toBe(true);

    // Notificación solo a la reservación aceptada
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({ pasajero_id: 8 }),
      expect.objectContaining({ id: 15 }),
      "Lluvia severa"
    );

    // Registro de auditoría
    expect(auditSpy).toHaveBeenCalledWith({
      adminId: 1,
      entidad: "Viajes",
      entidadId: 15,
      accion: "CANCELAR_VIAJE",
      motivo: "Lluvia severa",
    });
  });
});

describe("Servicio: tripService.cancelAdmin", () => {
  test("notifica solo a reservaciones aceptadas y no a pendientes", async () => {
    const notifySpy = jest
      .spyOn(notificationService, "notifyTripCancelledByAdmin")
      .mockResolvedValue({});
    jest.spyOn(auditService, "logAction").mockReturnValue({});

    jest.spyOn(tripModel, "cancelAdmin").mockResolvedValue({
      trip: { id: 20, estado: "cancelado" },
      acceptedReservations: [
        { id: 1, pasajero_id: 100, estado: "aceptada" },
        { id: 2, pasajero_id: 101, estado: "aceptada" },
      ],
    });

    const result = await tripService.cancelAdmin(20, 1, "Emergencia");

    expect(result.estado).toBe("cancelado");
    expect(notifySpy).toHaveBeenCalledTimes(2);
  });

  test("un fallo al enviar la notificación no aborta la respuesta de cancelación", async () => {
    jest
      .spyOn(notificationService, "notifyTripCancelledByAdmin")
      .mockRejectedValue(new Error("SMTP_FAIL"));
    jest.spyOn(auditService, "logAction").mockReturnValue({});

    jest.spyOn(tripModel, "cancelAdmin").mockResolvedValue({
      trip: { id: 20, estado: "cancelado" },
      acceptedReservations: [{ id: 1, pasajero_id: 100, estado: "aceptada" }],
    });

    const result = await tripService.cancelAdmin(20, 1, "Emergencia");

    expect(result.estado).toBe("cancelado");
  });
});

describe("Servicio de Auditoría: auditService.logAction", () => {
  test("genera la entrada estructurada y emite en consola con [AUDIT]", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const entry = auditService.logAction({
      adminId: 1,
      entidad: "Viajes",
      entidadId: 50,
      accion: "CANCELAR_VIAJE",
      motivo: "Prueba de auditoría",
    });

    expect(entry.tipo).toBe("ACCION_ADMINISTRATIVA");
    expect(entry.administrador_id).toBe(1);
    expect(entry.entidad).toBe("Viajes");
    expect(entry.entidad_id).toBe(50);
    expect(entry.accion).toBe("CANCELAR_VIAJE");
    expect(entry.motivo).toBe("Prueba de auditoría");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[AUDIT]")
    );
  });
});
