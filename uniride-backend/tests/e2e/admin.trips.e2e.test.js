process.env.DB_NAME = process.env.DB_NAME_TEST || "uniride_admin_e2e_test";

const request = require("supertest");
const { sql } = require("../../config/db");
const {
  createReservation,
  createTrip,
  createUser,
  createVehicle,
  removeFixtures,
  startServer,
  stopServer,
  tokenFor,
} = require("./helpers/admin-e2e");

jest.setTimeout(30000);

let runtime;
let admin;
let driver;
let passenger;
let vehicleId;
let tripId;
let reservationId;

beforeAll(async () => {
  runtime = await startServer();
  admin = await createUser(runtime.pool, { name: "AdminViajesE2E", role: "Administrador" });
  driver = await createUser(runtime.pool, { name: "ConductorAdminE2E", role: "Conductor" });
  passenger = await createUser(runtime.pool, { name: "PasajeroAdminE2E" });
  vehicleId = await createVehicle(runtime.pool, driver.id);
  tripId = await createTrip(runtime.pool, {
    driverId: driver.id,
    vehicleId,
    origin: `Origen E2E ${Date.now()}`,
  });
  reservationId = await createReservation(runtime.pool, {
    tripId,
    passengerId: passenger.id,
  });
});

afterAll(async () => {
  if (runtime) {
    await removeFixtures(runtime.pool, {
      userIds: [admin.id, driver.id, passenger.id],
      vehicleIds: [vehicleId],
      tripIds: [tripId],
    });
    await stopServer(runtime);
  }
});

describe("E2E HTTP: administración y persistencia de viajes", () => {
  test("lista, inspecciona, cancela y vuelve a leer un viaje; protege la cancelación", async () => {
    const adminToken = `Bearer ${tokenFor(admin.id, ["Administrador"])}`;
    const passengerToken = `Bearer ${tokenFor(passenger.id, ["Pasajero"])}`;

    const noToken = await request(runtime.baseUrl)
      .patch(`/api/trips/admin/${tripId}/cancel`)
      .send({ motivo: "Prueba E2E" });
    const forbidden = await request(runtime.baseUrl)
      .patch(`/api/trips/admin/${tripId}/cancel`)
      .set("Authorization", passengerToken)
      .send({ motivo: "Prueba E2E" });
    const listing = await request(runtime.baseUrl)
      .get(`/api/trips/admin?conductor=${encodeURIComponent("ConductorAdminE2E")}&page=1&limit=10`)
      .set("Authorization", adminToken);
    const detailBefore = await request(runtime.baseUrl)
      .get(`/api/trips/admin/${tripId}`)
      .set("Authorization", adminToken);

    expect(noToken.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(listing.status).toBe(200);
    expect(listing.body.success).toBe(true);
    expect(listing.body.data.viajes.some((trip) => trip.id === tripId)).toBe(true);
    expect(detailBefore.status).toBe(200);
    expect(detailBefore.body.data.viaje.estado).toBe("programado");

    const cancelled = await request(runtime.baseUrl)
      .patch(`/api/trips/admin/${tripId}/cancel`)
      .set("Authorization", adminToken)
      .send({ motivo: "Cancelación administrativa E2E" });

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.success).toBe(true);
    expect(cancelled.body.data.viaje.estado).toBe("cancelado");
    expect(cancelled.body.data.viaje.motivo_cancelacion).toBe("Cancelación administrativa E2E");

    const detailAfter = await request(runtime.baseUrl)
      .get(`/api/trips/admin/${tripId}`)
      .set("Authorization", adminToken);
    const persistedReservation = await runtime.pool.request()
      .input("reservationId", sql.Int, reservationId)
      .query("SELECT estado FROM SolicitudesViaje WHERE id = @reservationId");

    expect(detailAfter.status).toBe(200);
    expect(detailAfter.body.data.viaje.estado).toBe("cancelado");
    expect(detailAfter.body.viaje.motivo_cancelacion).toBe("Cancelación administrativa E2E");
    expect(persistedReservation.recordset[0].estado).toBe("cancelada");
  });

  test("no permite repetir una cancelación ya persistida", async () => {
    const response = await request(runtime.baseUrl)
      .patch(`/api/trips/admin/${tripId}/cancel`)
      .set("Authorization", `Bearer ${tokenFor(admin.id, ["Administrador"])}`)
      .send({ motivo: "Cancelación repetida E2E" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("El viaje ya se encuentra cancelado.");
  });
});
