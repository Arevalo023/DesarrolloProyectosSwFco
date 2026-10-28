/**
 * Prueba de integración del detalle de usuario para administración.
 * Issue #145: API de detalle de usuario — GET /users/:id (HU-11).
 *
 * Corre contra SQL Server real (BD *_test) para verificar que las consultas
 * reutilizadas arman la respuesta correcta con datos reales:
 *  - Datos básicos sin contraseña ni teléfono y con roles M:N.
 *  - Promedio y calificaciones RECIBIDAS (no las que el usuario emitió).
 *  - Solo los viajes que el usuario publicó como conductor.
 *  - Solo sus reservaciones como pasajero, de la más reciente a la más antigua.
 *  - 404 para un usuario inexistente y 403 para un rol distinto de Administrador.
 *
 * Escenario (el usuario objetivo es Pasajero y Conductor a la vez):
 *  - viajePropio:   lo conduce el objetivo (finalizado); otroPasajero lo califica con 5.
 *  - viajeAjeno:    lo conduce otroConductor (finalizado); el objetivo viajó
 *                   (reservación aceptada), otroConductor lo califica con 4 y el
 *                   objetivo califica a otroConductor con 2 (no debe contar).
 *  - viajeFuturo:   lo conduce otroConductor (programado); el objetivo tiene una
 *                   reservación pendiente.
 */

process.env.DB_NAME = process.env.DB_NAME_TEST || "uniride_test";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../app");
const { sql, poolPromise } = require("../../config/db");

jest.setTimeout(30000);

const SECRET = process.env.JWT_SECRET || "uniride_default_secret_key";
const tokenFor = (id, rol, roles = [rol]) =>
  jwt.sign({ id, rol, roles }, SECRET, { expiresIn: "1h" });

// El administrador solo necesita un token válido; no consulta su propio registro.
const adminToken = tokenFor(1, "Administrador");

const RUN = Date.now();
const TELEFONO_OBJETIVO = "8449990001";
const ctx = {};

let pool;

const createUser = async (nombre, rolIds, telefono = null) => {
  const r = await pool
    .request()
    .input("correo", sql.VarChar(150), `int.${nombre}.${RUN}@uadec.edu.mx`)
    .input("nombre", sql.VarChar(100), nombre)
    .input("rolId", sql.Int, rolIds[0])
    .input("telefono", sql.VarChar(20), telefono)
    .query(`
      INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
      OUTPUT INSERTED.id
      VALUES (@rolId, 1, @nombre, 'INT', @correo, 'hash-secreto-int', @telefono)
    `);
  const uid = r.recordset[0].id;

  for (const rid of rolIds) {
    await pool.request()
      .input("uid", sql.Int, uid)
      .input("rid", sql.Int, rid)
      .query(`INSERT INTO UsuariosRoles (usuario_id, rol_id) VALUES (@uid, @rid)`);
  }

  return uid;
};

const createVehicle = async (usuarioId, sufijo) => {
  const r = await pool
    .request()
    .input("uid", sql.Int, usuarioId)
    .input("placa", sql.VarChar(20), `I${sufijo}-${RUN}`.slice(0, 20))
    .query(`
      INSERT INTO Vehiculos (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles, activo)
      OUTPUT INSERTED.id
      VALUES (@uid, 'Nissan', 'Versa', 2021, 'Gris', @placa, 4, 1)
    `);
  return r.recordset[0].id;
};

const createTrip = async ({ conductorId, vehiculoId, origen, diasDesdeHoy, estado }) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasDesdeHoy);

  const r = await pool
    .request()
    .input("conductor_id", sql.Int, conductorId)
    .input("vehiculo_id", sql.Int, vehiculoId)
    .input("origen", sql.VarChar(255), origen)
    .input("fecha_salida", sql.DateTime, fecha)
    .input("estado", sql.VarChar(30), estado)
    .query(`
      INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida,
                          cupo_disponible, costo_por_pasajero, estado)
      OUTPUT INSERTED.id
      VALUES (@conductor_id, @vehiculo_id, @origen, 'Destino INT', @fecha_salida, 3, 30, @estado)
    `);
  return r.recordset[0].id;
};

const createReservation = async (viajeId, pasajeroId, estado) => {
  const r = await pool
    .request()
    .input("viaje_id", sql.Int, viajeId)
    .input("pasajero_id", sql.Int, pasajeroId)
    .input("estado", sql.VarChar(30), estado)
    .query(`
      INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
      OUTPUT INSERTED.id
      VALUES (@viaje_id, @pasajero_id, @estado)
    `);
  return r.recordset[0].id;
};

const createRating = async (viajeId, calificadorId, calificadoId, puntuacion) => {
  await pool
    .request()
    .input("viaje_id", sql.Int, viajeId)
    .input("calificador_id", sql.Int, calificadorId)
    .input("calificado_id", sql.Int, calificadoId)
    .input("puntuacion", sql.Int, puntuacion)
    .query(`
      INSERT INTO Calificaciones (viaje_id, calificador_id, calificado_id, puntuacion, comentario)
      VALUES (@viaje_id, @calificador_id, @calificado_id, @puntuacion, 'Prueba de integración')
    `);
};

beforeAll(async () => {
  pool = await poolPromise;

  const { name } = (
    await pool.request().query("SELECT DB_NAME() AS name")
  ).recordset[0];
  if (!/_test$/i.test(name)) {
    throw new Error(
      `Las pruebas de integración solo corren en una BD *_test (actual: ${name}).`
    );
  }

  // Rol 1 = Pasajero, Rol 2 = Conductor
  ctx.targetId = await createUser("objetivoINT", [1, 2], TELEFONO_OBJETIVO);
  ctx.otherDriverId = await createUser("conductorINT", [2]);
  ctx.otherPassengerId = await createUser("pasajeroINT", [1]);

  const targetVehicle = await createVehicle(ctx.targetId, "A");
  const otherVehicle = await createVehicle(ctx.otherDriverId, "B");

  ctx.ownTripId = await createTrip({
    conductorId: ctx.targetId,
    vehiculoId: targetVehicle,
    origen: "Viaje propio INT",
    diasDesdeHoy: -5,
    estado: "finalizado",
  });
  ctx.pastTripId = await createTrip({
    conductorId: ctx.otherDriverId,
    vehiculoId: otherVehicle,
    origen: "Viaje ajeno INT",
    diasDesdeHoy: -3,
    estado: "finalizado",
  });
  ctx.futureTripId = await createTrip({
    conductorId: ctx.otherDriverId,
    vehiculoId: otherVehicle,
    origen: "Viaje futuro INT",
    diasDesdeHoy: 4,
    estado: "programado",
  });

  await createReservation(ctx.ownTripId, ctx.otherPassengerId, "aceptada");
  ctx.pastReservationId = await createReservation(ctx.pastTripId, ctx.targetId, "aceptada");
  ctx.futureReservationId = await createReservation(ctx.futureTripId, ctx.targetId, "pendiente");

  // Calificaciones recibidas por el objetivo: 5 y 4 -> promedio 4.5
  await createRating(ctx.ownTripId, ctx.otherPassengerId, ctx.targetId, 5);
  await createRating(ctx.pastTripId, ctx.otherDriverId, ctx.targetId, 4);
  // Calificación EMITIDA por el objetivo: no debe aparecer en su reputación
  await createRating(ctx.pastTripId, ctx.targetId, ctx.otherDriverId, 2);
});

afterAll(async () => {
  if (!pool) return;
  const ids = [ctx.targetId, ctx.otherDriverId, ctx.otherPassengerId].filter(Boolean);
  if (ids.length > 0) {
    const list = ids.join(",");
    await pool.request().query(`
      DELETE FROM Calificaciones WHERE calificador_id IN (${list}) OR calificado_id IN (${list});
      DELETE FROM Notificaciones WHERE usuario_id IN (${list});
      DELETE FROM SolicitudesViaje WHERE pasajero_id IN (${list});
      DELETE FROM Viajes WHERE conductor_id IN (${list});
      DELETE FROM Vehiculos WHERE usuario_id IN (${list});
      DELETE FROM UsuariosRoles WHERE usuario_id IN (${list});
      DELETE FROM Usuarios WHERE id IN (${list});
    `);
  }
  await pool.close();
});

describe("GET /users/:id — integración con SQL Server", () => {
  let body;

  beforeAll(async () => {
    const res = await request(app)
      .get(`/users/${ctx.targetId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    body = res.body;
  });

  test("devuelve los datos básicos con sus dos roles y sin información sensible", () => {
    expect(body.usuario).toEqual(
      expect.objectContaining({
        id: ctx.targetId,
        nombre: "objetivoINT",
        apellido: "INT",
        correo: `int.objetivoINT.${RUN}@uadec.edu.mx`,
        campus_id: 1,
      })
    );
    expect(body.usuario.roles).toEqual(expect.arrayContaining(["Pasajero", "Conductor"]));
    expect(body.usuario.roles).toHaveLength(2);

    const raw = JSON.stringify(body);
    expect(raw).not.toMatch(/password/i);
    expect(raw).not.toContain("hash-secreto-int");
    expect(raw).not.toContain(TELEFONO_OBJETIVO);
  });

  test("calcula la reputación solo con las calificaciones recibidas", () => {
    expect(body.reputacion.promedio).toBe(4.5);
    expect(body.reputacion.total_calificaciones).toBe(2);
    expect(body.reputacion.calificaciones).toHaveLength(2);
    expect(body.reputacion.calificaciones.every((c) => c.calificado_id === ctx.targetId)).toBe(true);
    expect(body.reputacion.calificaciones.map((c) => c.puntuacion).sort()).toEqual([4, 5]);
  });

  test("incluye solo los viajes publicados por el usuario", () => {
    expect(body.viajes.map((v) => v.id)).toEqual([ctx.ownTripId]);
    expect(body.viajes[0].conductor_id).toBe(ctx.targetId);
    expect(body.viajes[0].estado).toBe("finalizado");
  });

  test("incluye sus reservaciones como pasajero, la más reciente primero", () => {
    expect(body.reservaciones.map((r) => r.id)).toEqual([
      ctx.futureReservationId,
      ctx.pastReservationId,
    ]);
    expect(body.reservaciones.every((r) => r.pasajero_id === ctx.targetId)).toBe(true);
    expect(body.reservaciones[0]).toEqual(
      expect.objectContaining({ estado: "pendiente", viaje_estado: "programado" })
    );
    expect(body.reservaciones[1]).toEqual(
      expect.objectContaining({ estado: "aceptada", viaje_estado: "finalizado" })
    );
  });

  test("usuario sin viajes publicados ni calificaciones: viajes vacío y promedio 0", async () => {
    const res = await request(app)
      .get(`/users/${ctx.otherPassengerId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.viajes).toEqual([]);
    // Su única reservación es en el viaje propio del objetivo
    expect(res.body.reservaciones).toHaveLength(1);
    expect(res.body.reputacion).toEqual({ promedio: 0, total_calificaciones: 0, calificaciones: [] });
  });

  test("404 para un usuario que no existe", async () => {
    const { maxId } = (
      await pool.request().query("SELECT ISNULL(MAX(id), 0) AS maxId FROM Usuarios")
    ).recordset[0];

    const res = await request(app)
      .get(`/users/${maxId + 1000}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("El usuario no existe.");
  });

  test("403 si quien consulta no es Administrador", async () => {
    const res = await request(app)
      .get(`/users/${ctx.targetId}`)
      .set("Authorization", `Bearer ${tokenFor(ctx.otherPassengerId, "Pasajero")}`);

    expect(res.status).toBe(403);
  });
});
