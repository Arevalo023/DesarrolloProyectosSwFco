/**
 * Pruebas unitarias para la documentación interactiva Swagger / OpenAPI.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const app = require("../../app");
const swaggerDocument = require("../../swagger.json");

describe("Documentación interactiva Swagger / OpenAPI (/api-docs)", () => {
  test("GET /api-docs.json responde 200 con la especificación OpenAPI 3.0", async () => {
    const res = await request(app).get("/api-docs.json");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
    expect(res.body.info.title).toBe("UniRide API - Documentación Oficial");
    expect(res.body.paths).toBeDefined();
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(20);
    expect(res.body.components.securitySchemes.bearerAuth).toBeDefined();
    expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
  });

  test("GET /api-docs/ responde 200 y sirve la interfaz HTML de Swagger UI", async () => {
    const res = await request(app).get("/api-docs/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain("Swagger UI");
  });

  test("GET /api-docs redirige a /api-docs/ con código 301", async () => {
    const res = await request(app).get("/api-docs");

    expect([200, 301]).toContain(res.status);
  });

  test("la especificación cubre todos los módulos esenciales de UniRide", () => {
    const tags = swaggerDocument.tags.map((t) => t.name);

    expect(tags).toContain("Health Check");
    expect(tags).toContain("Usuarios y Autenticación");
    expect(tags).toContain("Vehículos");
    expect(tags).toContain("Viajes");
    expect(tags).toContain("Reservaciones y Solicitudes");
    expect(tags).toContain("Notificaciones");
    expect(tags).toContain("Calificaciones");
    expect(tags).toContain("Administración");
  });

  test("la especificación incluye los endpoints administrativos sensibles", () => {
    const paths = Object.keys(swaggerDocument.paths);

    expect(paths).toContain("/api/admin/summary");
    expect(paths).toContain("/users");
    expect(paths).toContain("/users/{id}");
    expect(paths).toContain("/api/trips/admin");
    expect(paths).toContain("/api/trips/admin/{id}");
    expect(paths).toContain("/api/trips/admin/{id}/cancel");
  });
});
