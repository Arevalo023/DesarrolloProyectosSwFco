/**
 * Pruebas unitarias para authController.
 * Issue #70: Pruebas unitarias de middlewares y autenticación.
 */

jest.mock("../../config/db", () => ({
  sql: {},
  poolPromise: Promise.resolve({}),
}));

jest.mock("../../services/authService", () => ({
  register: jest.fn(),
  login: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  getCampuses: jest.fn(),
}));

const authService = require("../../services/authService");
const authController = require("../../controllers/authController");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("authController.register", () => {
  test("201 Created al registrar un usuario exitosamente", async () => {
    const mockUser = {
      id: 10,
      nombre: "Ana",
      apellido: "García",
      correo: "ana.garcia@uadec.edu.mx",
      roles: ["Pasajero"],
    };
    authService.register.mockResolvedValue(mockUser);

    const req = {
      body: {
        name: "Ana García",
        email: "ana.garcia@uadec.edu.mx",
        password: "Password123!",
      },
    };
    const res = createMockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Usuario registrado exitosamente.",
      user: mockUser,
    });
  });

  test("retorna el statusCode del error si authService arroja excepción (ej. 409 duplicado)", async () => {
    const error = new Error("El correo institucional ya se encuentra registrado");
    error.statusCode = 409;
    authService.register.mockRejectedValue(error);

    const req = { body: { email: "duplicado@uadec.edu.mx" } };
    const res = createMockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "El correo institucional ya se encuentra registrado",
    });
  });

  test("retorna 500 por defecto ante errores inesperados sin statusCode", async () => {
    authService.register.mockRejectedValue(new Error("Falla de conexión a base de datos"));

    const req = { body: {} };
    const res = createMockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Falla de conexión a base de datos",
    });
  });
});

describe("authController.login", () => {
  test("200 OK al iniciar sesión exitosamente con token y user", async () => {
    const mockSession = {
      token: "jwt_token_valido",
      user: { id: 1, correo: "luis@uadec.edu.mx", roles: ["Conductor"] },
    };
    authService.login.mockResolvedValue(mockSession);

    const req = {
      body: { email: "luis@uadec.edu.mx", password: "Demo1234!" },
    };
    const res = createMockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Inicio de sesión exitoso.",
      token: mockSession.token,
      user: mockSession.user,
    });
  });

  test("401 Unauthorized ante credenciales incorrectas", async () => {
    const error = new Error("Credenciales incorrectas");
    error.statusCode = 401;
    authService.login.mockRejectedValue(error);

    const req = {
      body: { email: "luis@uadec.edu.mx", password: "WrongPassword" },
    };
    const res = createMockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Credenciales incorrectas",
    });
  });
});

describe("authController.me", () => {
  test("200 OK con los datos del perfil del usuario autenticado", async () => {
    const mockProfile = { id: 5, nombre: "María", roles: ["Pasajero"] };
    authService.getProfile.mockResolvedValue(mockProfile);

    const req = { user: { id: 5 } };
    const res = createMockRes();

    await authController.me(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: mockProfile });
  });

  test("404 si el usuario no existe", async () => {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    authService.getProfile.mockRejectedValue(error);

    const req = { user: { id: 999 } };
    const res = createMockRes();

    await authController.me(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Usuario no encontrado" });
  });
});

describe("authController.updateMe", () => {
  test("200 OK al actualizar el perfil correctamente", async () => {
    const updated = { id: 1, nombre: "Juan Modificado" };
    authService.updateProfile.mockResolvedValue(updated);

    const req = {
      user: { id: 1 },
      body: { nombre: "Juan Modificado", campus_id: 2 },
    };
    const res = createMockRes();

    await authController.updateMe(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Perfil actualizado correctamente.",
      user: updated,
    });
  });
});

describe("authController.campuses", () => {
  test("200 OK con la lista de campus universitarios", async () => {
    const mockCampuses = [
      { id: 1, nombre: "Campus Arteaga" },
      { id: 2, nombre: "Campus Central" },
    ];
    authService.getCampuses.mockResolvedValue(mockCampuses);

    const req = {};
    const res = createMockRes();

    await authController.campuses(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ campuses: mockCampuses });
  });
});
