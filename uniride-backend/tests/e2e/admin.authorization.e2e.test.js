process.env.DB_NAME = process.env.DB_NAME_TEST || "uniride_admin_e2e_test";

const request = require("supertest");
const {
  startServer,
  stopServer,
  tokenFor,
} = require("./helpers/admin-e2e");

jest.setTimeout(30000);

let runtime;

beforeAll(async () => {
  runtime = await startServer();
});

afterAll(async () => {
  if (runtime) await stopServer(runtime);
});

describe("E2E HTTP: autorización del módulo administrativo", () => {
  test("rechaza sin token y con rol distinto, y permite consultar el resumen como Administrador", async () => {
    const anonymous = await request(runtime.baseUrl)
      .get("/api/admin/summary");
    const passenger = await request(runtime.baseUrl)
      .get("/api/admin/summary")
      .set("Authorization", `Bearer ${tokenFor(50, ["Pasajero"])}`);
    const administrator = await request(runtime.baseUrl)
      .get("/api/admin/summary")
      .set("Authorization", `Bearer ${tokenFor(51, ["Administrador"])}`);

    expect(anonymous.status).toBe(401);
    expect(anonymous.body.message).toMatch(/Token no proporcionado/i);
    expect(passenger.status).toBe(403);
    expect(passenger.body.message).toMatch(/permisos necesarios/i);
    expect(administrator.status).toBe(200);
    expect(administrator.body).toEqual({
      success: true,
      data: { metricas: expect.objectContaining({
        usuarios: expect.any(Number),
        viajes: expect.any(Number),
        reservaciones: expect.any(Number),
      }) },
      metricas: expect.objectContaining({
        usuarios: expect.any(Number),
        viajes: expect.any(Number),
        reservaciones: expect.any(Number),
      }),
    });
  });

  test.each([
    ["GET", "/users"],
    ["GET", "/users/1"],
    ["GET", "/api/trips/admin"],
    ["GET", "/api/trips/admin/1"],
    ["GET", "/api/trips/1"],
    ["PATCH", "/api/trips/admin/1/cancel"],
    ["PATCH", "/api/trips/1/cancel-admin"],
    ["PATCH", "/api/trips/1/cancel"],
  ])("%s %s requiere autenticación y rol Administrador", async (method, path) => {
    const anonymousRequest = request(runtime.baseUrl)[method.toLowerCase()](path);
    const passengerRequest = request(runtime.baseUrl)[method.toLowerCase()](path)
      .set("Authorization", `Bearer ${tokenFor(52, ["Pasajero"])}`);
    if (method === "PATCH") {
      anonymousRequest.send({ motivo: "Prueba de autorización E2E" });
      passengerRequest.send({ motivo: "Prueba de autorización E2E" });
    }

    const [anonymous, passenger] = await Promise.all([
      anonymousRequest,
      passengerRequest,
    ]);

    expect(anonymous.status).toBe(401);
    expect(passenger.status).toBe(403);
  });
});
