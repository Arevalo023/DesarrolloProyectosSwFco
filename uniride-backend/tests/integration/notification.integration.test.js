/**
 * Pruebas de integración del #69: Express + servicios + modelos + SQL Server REAL.
 *
 * Usan una BD aparte (uniride_test) para no ensuciar los datos demo.
 * Preparar una vez (y cada vez que cambie uniride.sql):
 *     npm run db:init:test
 * Correr:
 *     npm run test:integration
 */

// Debe ir ANTES de cargar app/config: dotenv no sobrescribe variables ya definidas.
process.env.DB_NAME = process.env.DB_NAME_TEST || "uniride_test";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../app");
const { sql, poolPromise } = require("../../config/db");

jest.setTimeout(30000);

const SECRET = process.env.JWT_SECRET || "uniride_default_secret_key";
const tokenFor = (id, rol) => jwt.sign({ id, rol, roles: [rol] }, SECRET, { expiresIn: "1h" });

const RUN = Date.now();
const ctx = {}; // ids creados por la prueba

let pool;
const q = (text, params = {}) => {
  const r = pool.request();
  for (const [k, v] of Object.entries(params)) r.input(k, sql.Int, v);
  return r.query(text);
};

const createUser = async (nombre) => {
  const r = await pool.request()
    .input("correo", sql.VarChar(150), `it69.${nombre}.${RUN}@test.local`)
    .input("nombre", sql.VarChar(100), nombre)
    .query(`
      INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash)
      OUTPUT INSERTED.id
      VALUES (1, 1, @nombre, 'IT69', @correo, 'no-login')
    `);
  return r.recordset[0].id;
};

const getNotifications = (userId, rol, query = "") =>
  request(app).get(`/api/notifications${query}`).set("Authorization", `Bearer ${tokenFor(userId, rol)}`);

const byTipo = (list, tipo) => list.filter((n) => n.tipo === tipo);

// POST /api/trips/:id/book  (solo rol Pasajero) -> { message, booking }
const bookTrip = (tripId, passengerId) =>
  request(app)
    .post(`/api/trips/${tripId}/book`)
    .set("Authorization", `Bearer ${tokenFor(passengerId, "Pasajero")}`);

beforeAll(async () => {
  pool = await poolPromise;

  // Seguro anti-desastre: jamás correr contra la BD real
  const { name } = (await q("SELECT DB_NAME() AS name")).recordset[0];
  if (!/_test$/i.test(name)) {
    throw new Error(`Las pruebas de integración solo corren en una BD *_test (actual: ${name}).`);
  }

  ctx.driver = await createUser("driver");
  ctx.p1 = await createUser("pasajero1");
  ctx.p2 = await createUser("pasajero2");

  const v = await pool.request()
    .input("uid", sql.Int, ctx.driver)
    .input("placa", sql.VarChar(20), `T69-${RUN}`.slice(0, 20))
    .query(`
      INSERT INTO Vehiculos (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles)
      OUTPUT INSERTED.id
      VALUES (@uid, 'Test', 'Model', 2020, 'Gris', @placa, 5)
    `);
  ctx.vehicle = v.recordset[0].id;

  const t = await pool.request()
    .input("cid", sql.Int, ctx.driver)
    .input("vid", sql.Int, ctx.vehicle)
    .query(`
      INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
      OUTPUT INSERTED.id
      VALUES (@cid, @vid, 'Campus Arteaga', 'Campus Central', DATEADD(day, 2, GETDATE()), 3, 20, 'programado')
    `);
  ctx.trip = t.recordset[0].id;
});

afterAll(async () => {
  if (!pool || !ctx.driver) return;
  const ids = [ctx.driver, ctx.p1, ctx.p2].filter(Boolean).join(",");
  // Orden por llaves foráneas
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

describe("esquema (regresión del bug original)", () => {
  test("Notificaciones tiene solicitud_id y viaje_id", async () => {
    const r = await q(`
      SELECT COL_LENGTH('dbo.Notificaciones','solicitud_id') AS solicitud_id,
             COL_LENGTH('dbo.Notificaciones','viaje_id') AS viaje_id
    `);
    expect(r.recordset[0].solicitud_id).not.toBeNull();
    expect(r.recordset[0].viaje_id).not.toBeNull();
  });

  test("existen las llaves foráneas a Usuarios, SolicitudesViaje y Viajes", async () => {
    const r = await q(`
      SELECT OBJECT_NAME(referenced_object_id) AS padre
      FROM sys.foreign_keys
      WHERE parent_object_id = OBJECT_ID('dbo.Notificaciones')
    `);
    const padres = r.recordset.map((x) => x.padre);
    expect(padres).toEqual(expect.arrayContaining(["Usuarios", "SolicitudesViaje", "Viajes"]));
  });
});

describe("GET /api/notifications", () => {
  test("sin token -> 401", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  test("usuario sin notificaciones -> lista vacía", async () => {
    const res = await getNotifications(ctx.p1, "Pasajero");
    expect(res.status).toBe(200);
    expect(res.body.notifications).toEqual([]);
  });
});

describe("flujo completo de reserva", () => {
  test("pasajero solicita lugar -> conductor recibe reserva_solicitada", async () => {
    const book = await bookTrip(ctx.trip, ctx.p1);
    expect(book.status).toBe(201);
    ctx.req1 = book.body.booking.id;

    // Fila realmente guardada en BD
    const row = (await q("SELECT * FROM Notificaciones WHERE solicitud_id = @id", { id: ctx.req1 })).recordset;
    expect(row).toHaveLength(1);
    expect(row[0]).toMatchObject({
      usuario_id: ctx.driver,
      viaje_id: ctx.trip,
      tipo: "reserva_solicitada",
      leida: false,
    });

    const res = await getNotifications(ctx.driver, "Conductor");
    expect(res.status).toBe(200);
    expect(byTipo(res.body.notifications, "reserva_solicitada")).toHaveLength(1);

    // El pasajero NO ve la notificación del conductor
    const mine = await getNotifications(ctx.p1, "Pasajero");
    expect(mine.body.notifications).toEqual([]);
  });

  test("reserva rechazada por reglas (duplicada) -> 409 y no se crea otra notificación", async () => {
    const before = (await q("SELECT COUNT(*) AS n FROM Notificaciones")).recordset[0].n;
    const dup = await bookTrip(ctx.trip, ctx.p1);
    const after = (await q("SELECT COUNT(*) AS n FROM Notificaciones")).recordset[0].n;

    expect(dup.status).toBe(409);
    expect(after).toBe(before);
  });

  test("conductor acepta -> pasajero recibe reserva_aceptada", async () => {
    const patch = await request(app)
      .patch(`/api/reservations/${ctx.req1}`)
      .set("Authorization", `Bearer ${tokenFor(ctx.driver, "Conductor")}`)
      .send({ estado: "aceptada" });
    expect(patch.status).toBe(200);

    const res = await getNotifications(ctx.p1, "Pasajero");
    const list = byTipo(res.body.notifications, "reserva_aceptada");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ usuario_id: ctx.p1, solicitud_id: ctx.req1, viaje_id: ctx.trip });
  });

  test("conductor rechaza otra solicitud -> pasajero 2 recibe reserva_rechazada", async () => {
    const book = await bookTrip(ctx.trip, ctx.p2);
    expect(book.status).toBe(201);
    ctx.req2 = book.body.booking.id;

    const patch = await request(app)
      .patch(`/api/reservations/${ctx.req2}`)
      .set("Authorization", `Bearer ${tokenFor(ctx.driver, "Conductor")}`)
      .send({ estado: "rechazada" });
    expect(patch.status).toBe(200);

    const res = await getNotifications(ctx.p2, "Pasajero");
    expect(byTipo(res.body.notifications, "reserva_rechazada")).toHaveLength(1);
  });

  test("pasajero cancela su reserva aceptada -> conductor recibe reserva_cancelada", async () => {
    const patch = await request(app)
      .patch(`/api/reservations/${ctx.req1}/cancel`)
      .set("Authorization", `Bearer ${tokenFor(ctx.p1, "Pasajero")}`);
    expect(patch.status).toBe(200);

    const res = await getNotifications(ctx.driver, "Conductor");
    expect(byTipo(res.body.notifications, "reserva_cancelada")).toHaveLength(1);
  });

  test("solicitud inválida (estado desconocido) -> 400 y no se crea notificación", async () => {
    const before = (await q("SELECT COUNT(*) AS n FROM Notificaciones")).recordset[0].n;
    const patch = await request(app)
      .patch(`/api/reservations/${ctx.req2}`)
      .set("Authorization", `Bearer ${tokenFor(ctx.driver, "Conductor")}`)
      .send({ estado: "otra" });
    const after = (await q("SELECT COUNT(*) AS n FROM Notificaciones")).recordset[0].n;

    expect(patch.status).toBe(400);
    expect(after).toBe(before);
  });
});

describe("consulta por usuario", () => {
  test("orden: la más reciente primero", async () => {
    const res = await getNotifications(ctx.driver, "Conductor");
    const fechas = res.body.notifications.map((n) => new Date(n.fecha_creacion).getTime());
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
  });

  test("?noLeidas=true excluye las leídas", async () => {
    const all = (await getNotifications(ctx.driver, "Conductor")).body.notifications;
    expect(all.length).toBeGreaterThanOrEqual(2);

    await q("UPDATE Notificaciones SET leida = 1 WHERE id = @id", { id: all[0].id });

    const unread = (await getNotifications(ctx.driver, "Conductor", "?noLeidas=true")).body.notifications;
    expect(unread).toHaveLength(all.length - 1);
    expect(unread.find((n) => n.id === all[0].id)).toBeUndefined();
  });
});
