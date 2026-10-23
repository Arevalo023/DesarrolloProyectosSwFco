/**
 * Issue #99: notificaciones de inicio y finalización de viaje.
 * Verifica contra BD real (*_test) que SOLO los pasajeros con reservación
 * 'aceptada' reciben la notificación, y que queda consultable desde /api/notifications.
 */

process.env.DB_NAME = process.env.DB_NAME_TEST || "uniride_test";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../app");
const { sql, poolPromise } = require("../../config/db");

jest.setTimeout(30000);

const SECRET = process.env.JWT_SECRET || "uniride_default_secret_key";
const tokenFor = (id, rol) => jwt.sign({ id, rol, roles: [rol] }, SECRET, { expiresIn: "1h" });

const RUN = Date.now();
const ctx = {};
let pool;

const createUser = async (nombre, rolId) => {
  const r = await pool.request()
    .input("correo", sql.VarChar(150), `n99.${nombre}.${RUN}@uadec.edu.mx`)
    .input("nombre", sql.VarChar(100), nombre)
    .input("rolId", sql.Int, rolId)
    .query(`
      INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash)
      OUTPUT INSERTED.id
      VALUES (@rolId, 1, @nombre, 'N99', @correo, 'hash123')
    `);
  const uid = r.recordset[0].id;
  await pool.request()
    .input("uid", sql.Int, uid)
    .input("rid", sql.Int, rolId)
    .query("INSERT INTO UsuariosRoles (usuario_id, rol_id) VALUES (@uid, @rid)");
  return uid;
};

const countNotifs = async (usuarioId, tipo) =>
  (await pool.request()
    .input("uid", sql.Int, usuarioId)
    .input("tipo", sql.VarChar(50), tipo)
    .input("viaje", sql.Int, ctx.tripId)
    .query(`
      SELECT COUNT(*) AS total FROM Notificaciones
      WHERE usuario_id = @uid AND tipo = @tipo AND viaje_id = @viaje
    `)).recordset[0].total;

const book = async (passengerId) => {
  const res = await request(app)
    .post(`/api/trips/${ctx.tripId}/book`)
    .set("Authorization", `Bearer ${tokenFor(passengerId, "Pasajero")}`)
    .set("X-Active-Role", "Pasajero");
  expect(res.status).toBe(201);
  return res.body.booking.id;
};

const respond = (reservationId, estado) =>
  request(app)
    .patch(`/api/reservations/${reservationId}`)
    .set("Authorization", `Bearer ${tokenFor(ctx.driverId, "Conductor")}`)
    .set("X-Active-Role", "Conductor")
    .send({ estado });

const driverPatch = (path) =>
  request(app)
    .patch(`/api/trips/${ctx.tripId}/${path}`)
    .set("Authorization", `Bearer ${tokenFor(ctx.driverId, "Conductor")}`)
    .set("X-Active-Role", "Conductor");

beforeAll(async () => {
  pool = await poolPromise;
  const { name } = (await pool.request().query("SELECT DB_NAME() AS name")).recordset[0];
  if (!/_test$/i.test(name)) {
    throw new Error(`Las pruebas de integración solo corren en una BD *_test (actual: ${name}).`);
  }

  ctx.driverId = await createUser("driver", 2);
  ctx.acceptedId = await createUser("accepted", 1);
  ctx.pendingId = await createUser("pending", 1);
  ctx.rejectedId = await createUser("rejected", 1);

  const v = await pool.request()
    .input("uid", sql.Int, ctx.driverId)
    .input("placa", sql.VarChar(20), `N99-${RUN}`.slice(0, 20))
    .query(`
      INSERT INTO Vehiculos (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles, activo)
      OUTPUT INSERTED.id
      VALUES (@uid, 'Mazda', 'CX-3', 2022, 'Rojo', @placa, 4, 1)
    `);
  ctx.vehicleId = v.recordset[0].id;

  const future = new Date();
  future.setDate(future.getDate() + 3);
  const trip = await request(app)
    .post("/api/trips")
    .set("Authorization", `Bearer ${tokenFor(ctx.driverId, "Conductor")}`)
    .set("X-Active-Role", "Conductor")
    .send({
      vehiculo_id: ctx.vehicleId,
      origen: "Campus Arteaga N99",
      destino: "Zona Universitaria N99",
      fecha_salida: future.toISOString(),
      cupo_disponible: 3,
      costo_por_pasajero: 30,
    });
  expect(trip.status).toBe(201);
  ctx.tripId = trip.body.trip.id;

  // Tres reservaciones: aceptada, pendiente (se deja así) y rechazada
  ctx.acceptedResId = await book(ctx.acceptedId);
  ctx.pendingResId = await book(ctx.pendingId);
  ctx.rejectedResId = await book(ctx.rejectedId);
  expect((await respond(ctx.acceptedResId, "aceptada")).status).toBe(200);
  expect((await respond(ctx.rejectedResId, "rechazada")).status).toBe(200);
});

afterAll(async () => {
  if (!pool || !ctx.driverId) return;
  const ids = [ctx.driverId, ctx.acceptedId, ctx.pendingId, ctx.rejectedId].filter(Boolean).join(",");
  await pool.request().query(`
    DELETE FROM Notificaciones WHERE usuario_id IN (${ids});
    DELETE FROM SolicitudesViaje WHERE pasajero_id IN (${ids});
    DELETE FROM Viajes WHERE conductor_id IN (${ids});
    DELETE FROM Vehiculos WHERE usuario_id IN (${ids});
    DELETE FROM UsuariosRoles WHERE usuario_id IN (${ids});
    DELETE FROM Usuarios WHERE id IN (${ids});
  `);
  await pool.close();
});

describe("#99 Notificaciones de inicio y finalización", () => {
  test("1. Iniciar viaje -> solo el pasajero con reservación aceptada recibe 'viaje_iniciado'", async () => {
    const res = await driverPatch("start");
    expect(res.status).toBe(200);

    expect(await countNotifs(ctx.acceptedId, "viaje_iniciado")).toBe(1);
    expect(await countNotifs(ctx.pendingId, "viaje_iniciado")).toBe(0);
    expect(await countNotifs(ctx.rejectedId, "viaje_iniciado")).toBe(0);
    expect(await countNotifs(ctx.driverId, "viaje_iniciado")).toBe(0);
  });

  test("2. La notificación es consultable desde el módulo de Notificaciones", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${tokenFor(ctx.acceptedId, "Pasajero")}`);

    expect(res.status).toBe(200);
    expect(res.body.notifications).toContainEqual(
      expect.objectContaining({
        viaje_id: ctx.tripId,
        solicitud_id: ctx.acceptedResId,
        tipo: "viaje_iniciado",
        leida: false,
      })
    );
  });

  test("3. Rechazar un segundo inicio y no duplicar la notificación", async () => {
    const res = await driverPatch("start");
    expect(res.status).toBe(400);
    expect(await countNotifs(ctx.acceptedId, "viaje_iniciado")).toBe(1);
  });

  test("4. Finalizar viaje -> solo el aceptado recibe 'viaje_finalizado'", async () => {
    const res = await driverPatch("finish");
    expect(res.status).toBe(200);

    expect(await countNotifs(ctx.acceptedId, "viaje_finalizado")).toBe(1);
    expect(await countNotifs(ctx.pendingId, "viaje_finalizado")).toBe(0);
    expect(await countNotifs(ctx.rejectedId, "viaje_finalizado")).toBe(0);
    expect(await countNotifs(ctx.driverId, "viaje_finalizado")).toBe(0);
  });

  test("5. Rechazar una segunda finalización y no duplicar la notificación", async () => {
    const res = await driverPatch("finish");
    expect(res.status).toBe(400);
    expect(await countNotifs(ctx.acceptedId, "viaje_finalizado")).toBe(1);
  });
});
