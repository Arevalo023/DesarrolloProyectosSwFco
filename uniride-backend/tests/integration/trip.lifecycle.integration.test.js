/**
 * Pruebas funcionales E2E del ciclo de vida de un viaje e integridad de base de datos.
 * Issue #86: Ejecutar pruebas funcionales y corregir errores.
 *
 * Flujo validado:
 *   Publicar viaje -> Búsqueda -> Reserva (pendiente) -> Mis reservaciones ->
 *   Aceptación (decremento de cupo) -> Notificación -> Cancelación (restauración de cupo).
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

const RUN = Date.now();
const ctx = {};

let pool;

const createUser = async (nombre, rolId = 1) => {
  const r = await pool
    .request()
    .input("correo", sql.VarChar(150), `e2e.${nombre}.${RUN}@uadec.edu.mx`)
    .input("nombre", sql.VarChar(100), nombre)
    .input("rolId", sql.Int, rolId)
    .query(`
      INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash)
      OUTPUT INSERTED.id
      VALUES (@rolId, 1, @nombre, 'E2E', @correo, 'hash123')
    `);
  const uid = r.recordset[0].id;

  // Insertar en UsuariosRoles para consistencia M:N
  await pool.request()
    .input("uid", sql.Int, uid)
    .input("rid", sql.Int, rolId)
    .query(`INSERT INTO UsuariosRoles (usuario_id, rol_id) VALUES (@uid, @rid)`);

  return uid;
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

  // Rol 2 = Conductor, Rol 1 = Pasajero
  ctx.driverId = await createUser("driverE2E", 2);
  ctx.passengerId = await createUser("passengerE2E", 1);

  // Crear vehículo activo para el conductor
  const v = await pool
    .request()
    .input("uid", sql.Int, ctx.driverId)
    .input("placa", sql.VarChar(20), `E2E-${RUN}`.slice(0, 20))
    .query(`
      INSERT INTO Vehiculos (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles, activo)
      OUTPUT INSERTED.id
      VALUES (@uid, 'Mazda', 'CX-3', 2022, 'Rojo', @placa, 4, 1)
    `);
  ctx.vehicleId = v.recordset[0].id;
});

afterAll(async () => {
  if (!pool || !ctx.driverId) return;
  const ids = [ctx.driverId, ctx.passengerId].filter(Boolean).join(",");
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

describe("Flujo funcional E2E: Ciclo completo de viaje e integridad de base de datos", () => {
  let tripId;
  let reservationId;

  test("1. Conductor publica un nuevo viaje con cupo para 2 personas", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const res = await request(app)
      .post("/api/trips")
      .set("Authorization", `Bearer ${tokenFor(ctx.driverId, "Conductor")}`)
      .set("X-Active-Role", "Conductor")
      .send({
        vehiculo_id: ctx.vehicleId,
        origen: "Campus Arteaga E2E",
        destino: "Zona Universitaria Saltillo",
        fecha_salida: futureDate.toISOString(),
        cupo_disponible: 2,
        costo_por_pasajero: 30,
      });

    expect(res.status).toBe(201);
    expect(res.body.trip).toBeDefined();
    expect(res.body.trip.cupo_disponible).toBe(2);
    expect(res.body.trip.estado).toBe("programado");
    tripId = res.body.trip.id;
  });

  test("2. Pasajero busca viajes disponibles y encuentra el viaje publicado", async () => {
    const res = await request(app)
      .get("/api/trips?origen=Arteaga")
      .set("Authorization", `Bearer ${tokenFor(ctx.passengerId, "Pasajero")}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.trips)).toBe(true);
    const found = res.body.trips.find((t) => t.id === tripId);
    expect(found).toBeDefined();
    expect(found.origen).toContain("Campus Arteaga E2E");
    expect(found.cupo_disponible).toBe(2);
  });

  test("3. Pasajero solicita una reserva (queda en estado 'pendiente' y NO reduce cupo anticipadamente)", async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/book`)
      .set("Authorization", `Bearer ${tokenFor(ctx.passengerId, "Pasajero")}`)
      .set("X-Active-Role", "Pasajero");

    expect(res.status).toBe(201);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.estado).toBe("pendiente");
    reservationId = res.body.booking.id;

    // Verificar en BD que el cupo en Viajes sigue siendo 2
    const tripInDb = (
      await pool.request().input("id", sql.Int, tripId).query("SELECT cupo_disponible FROM Viajes WHERE id = @id")
    ).recordset[0];
    expect(tripInDb.cupo_disponible).toBe(2);
  });

  test("4. Pasajero consulta 'Mis Reservaciones' y visualiza la solicitud pendiente", async () => {
    const res = await request(app)
      .get("/api/trips/reservations")
      .set("Authorization", `Bearer ${tokenFor(ctx.passengerId, "Pasajero")}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reservations)).toBe(true);
    const myRes = res.body.reservations.find((r) => r.id === reservationId);
    expect(myRes).toBeDefined();
    expect(myRes.estado).toBe("pendiente");
    expect(myRes.origen).toContain("Campus Arteaga E2E");
    expect(myRes.conductor_id).toBe(ctx.driverId);
  });

  test("5. Conductor acepta la solicitud -> cambia a 'aceptada' y descuenta 1 asiento atómicamente", async () => {
    const res = await request(app)
      .patch(`/api/reservations/${reservationId}`)
      .set("Authorization", `Bearer ${tokenFor(ctx.driverId, "Conductor")}`)
      .set("X-Active-Role", "Conductor")
      .send({ estado: "aceptada" });

    expect(res.status).toBe(200);
    expect(res.body.reservation.estado).toBe("aceptada");
    expect(res.body.reservation.asientos_restantes).toBe(1);

    // Verificar en BD que el cupo en Viajes ahora es 1
    const tripInDb = (
      await pool.request().input("id", sql.Int, tripId).query("SELECT cupo_disponible FROM Viajes WHERE id = @id")
    ).recordset[0];
    expect(tripInDb.cupo_disponible).toBe(1);
  });

  test("6. Pasajero recibe la notificación de que su solicitud fue aceptada", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${tokenFor(ctx.passengerId, "Pasajero")}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    const notif = res.body.notifications.find((n) => n.solicitud_id === reservationId);
    expect(notif).toBeDefined();
    expect(notif.tipo).toBe("reserva_aceptada");
  });

  test("7. Pasajero cancela su reserva -> estado pasa a 'cancelada' y se restituye el cupo a 2", async () => {
    const res = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set("Authorization", `Bearer ${tokenFor(ctx.passengerId, "Pasajero")}`);

    expect(res.status).toBe(200);
    expect(res.body.reservation.estado).toBe("cancelada");
    expect(res.body.reservation.cancelado_por).toBe("pasajero");
    expect(res.body.reservation.asientos_restantes).toBe(2);

    // Verificar en BD que el cupo en Viajes regresó a 2
    const tripInDb = (
      await pool.request().input("id", sql.Int, tripId).query("SELECT cupo_disponible FROM Viajes WHERE id = @id")
    ).recordset[0];
    expect(tripInDb.cupo_disponible).toBe(2);

    // Verificar estado de la solicitud en BD
    const reqInDb = (
      await pool.request().input("id", sql.Int, reservationId).query("SELECT estado FROM SolicitudesViaje WHERE id = @id")
    ).recordset[0];
    expect(reqInDb.estado).toBe("cancelada");
  });

  test("8. Confirmar integridad: intentar cancelar de nuevo arroja 409 Conflict", async () => {
    const res = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set("Authorization", `Bearer ${tokenFor(ctx.passengerId, "Pasajero")}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ya se encuentra cancelada/);
  });

  test("9. Un viaje cancelado por su conductor deja de aparecer en la búsqueda", async () => {
    const cancellation = await request(app)
      .patch(`/api/trips/${tripId}/cancel`)
      .set("Authorization", `Bearer ${tokenFor(ctx.driverId, "Conductor")}`)
      .set("X-Active-Role", "Conductor")
      .send({ motivo_cancelacion: "Cambio de planes" });

    expect(cancellation.status).toBe(200);
    expect(cancellation.body.trip.estado).toBe("cancelado");
    expect(cancellation.body.trip.motivo_cancelacion).toBe("Cambio de planes");

    const search = await request(app)
      .get("/api/trips?origen=Arteaga")
      .set("Authorization", `Bearer ${tokenFor(ctx.passengerId, "Pasajero")}`);

    expect(search.status).toBe(200);
    expect(search.body.trips.some((trip) => trip.id === tripId)).toBe(false);
  });
});
