process.env.DB_NAME = process.env.DB_NAME_TEST || "uniride_admin_e2e_test";

const request = require("supertest");
const {
  createUser,
  removeFixtures,
  startServer,
  stopServer,
  tokenFor,
} = require("./helpers/admin-e2e");

jest.setTimeout(30000);

let runtime;
let admin;
let target;

beforeAll(async () => {
  runtime = await startServer();
  admin = await createUser(runtime.pool, { name: "AdminUsuariosE2E", role: "Administrador" });
  target = await createUser(runtime.pool, { name: "UsuarioConsultaE2E" });
});

afterAll(async () => {
  if (runtime) {
    await removeFixtures(runtime.pool, { userIds: [admin.id, target.id] });
    await stopServer(runtime);
  }
});

describe("E2E HTTP: consulta administrativa de usuarios", () => {
  test("lista y consulta de nuevo un usuario persistido; bloquea accesos anónimos y no administradores", async () => {
    const noToken = await request(runtime.baseUrl).get("/users");
    const forbidden = await request(runtime.baseUrl)
      .get("/users")
      .set("Authorization", `Bearer ${tokenFor(target.id, ["Pasajero"])}`);
    const listing = await request(runtime.baseUrl)
      .get(`/users?q=${encodeURIComponent(target.email)}&page=1&limit=10`)
      .set("Authorization", `Bearer ${tokenFor(admin.id, ["Administrador"])}`);

    expect(noToken.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(listing.status).toBe(200);
    expect(listing.body.success).toBe(true);
    expect(listing.body.data.usuarios).toHaveLength(1);
    expect(listing.body.usuarios[0].correo).toBe(target.email);
    expect(listing.body.data.paginacion.total).toBe(1);

    const detail = await request(runtime.baseUrl)
      .get(`/users/${target.id}`)
      .set("Authorization", `Bearer ${tokenFor(admin.id, ["Administrador"])}`);

    expect(detail.status).toBe(200);
    expect(detail.body.success).toBe(true);
    expect(detail.body.data.usuario.id).toBe(target.id);
    expect(detail.body.usuario.correo).toBe(target.email);
    expect(detail.body.usuario).not.toHaveProperty("password_hash");
    expect(detail.body.usuario).not.toHaveProperty("telefono");
  });

  test("reporta 404 al consultar un usuario inexistente con credenciales administrativas válidas", async () => {
    const response = await request(runtime.baseUrl)
      .get("/users/2147483000")
      .set("Authorization", `Bearer ${tokenFor(admin.id, ["Administrador"])}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "El usuario no existe." });
  });
});
