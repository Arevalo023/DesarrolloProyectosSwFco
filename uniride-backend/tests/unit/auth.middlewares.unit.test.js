/**
 * Pruebas unitarias de authMiddleware, roleMiddleware y validateMiddleware.
 * Issue #70: Pruebas unitarias de middlewares y autenticación.
 */

jest.mock("../../config/db", () => ({
  sql: {},
  poolPromise: Promise.resolve({}),
}));

const jwt = require("jsonwebtoken");
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const validateMiddleware = require("../../middlewares/validateMiddleware");

const JWT_SECRET = process.env.JWT_SECRET || "uniride_default_secret_key";

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("authMiddleware.verifyToken", () => {
  test("rechaza con 401 si no se envía header Authorization", () => {
    const req = { headers: {} };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware.verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/Token no proporcionado/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("rechaza con 401 si Authorization no inicia con 'Bearer '", () => {
    const req = { headers: { authorization: "Basic 123456" } };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware.verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rechaza con 401 si el token es inválido o alterado", () => {
    const req = { headers: { authorization: "Bearer token_falso_invalido" } };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware.verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/Token de autenticación no válido/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("rechaza con 401 y mensaje específico si el token ha expirado", () => {
    const expiredToken = jwt.sign(
      { id: 1, correo: "ana@uadec.edu.mx", roles: ["Pasajero"] },
      JWT_SECRET,
      { expiresIn: "-1s" }
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware.verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "La sesión ha expirado. Por favor inicia sesión nuevamente.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("autentica correctamente y asigna rol por defecto cuando no se envía X-Active-Role", () => {
    const token = jwt.sign(
      { id: 1, correo: "ana@uadec.edu.mx", roles: ["Pasajero", "Conductor"], rol: "Pasajero" },
      JWT_SECRET
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware.verifyToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(1);
    expect(req.activeRole).toBe("Pasajero");
  });

  test("asigna rol activo cuando coincide con los roles del usuario vía X-Active-Role", () => {
    const token = jwt.sign(
      { id: 2, correo: "luis@uadec.edu.mx", roles: ["Pasajero", "Conductor"], rol: "Pasajero" },
      JWT_SECRET
    );
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
        "x-active-role": "Conductor",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware.verifyToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.activeRole).toBe("Conductor");
  });

  test("rechaza con 403 si X-Active-Role solicita un rol que el usuario no tiene", () => {
    const token = jwt.sign(
      { id: 3, correo: "pedro@uadec.edu.mx", roles: ["Pasajero"], rol: "Pasajero" },
      JWT_SECRET
    );
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
        "x-active-role": "Administrador",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware.verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "El rol activo no corresponde a tu cuenta.",
      code: "INVALID_ACTIVE_ROLE",
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("roleMiddleware", () => {
  test("rechaza con 401 si no existe req.user", () => {
    const middleware = roleMiddleware("Conductor");
    const req = {};
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/No se encontró sesión/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("permite acceso con next() si el rol activo coincide", () => {
    const middleware = roleMiddleware("Conductor");
    const req = {
      user: { id: 1, roles: ["Conductor"] },
      activeRole: "Conductor",
    };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test("permite acceso con alias conocidos (ej. admin <-> administrador)", () => {
    const middleware = roleMiddleware("Administrador");
    const req = {
      user: { id: 1, roles: ["Admin"] },
      activeRole: "admin",
    };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test("rechaza con 403 y ROLE_NOT_ACTIVE si el usuario posee el rol pero no está activo", () => {
    const middleware = roleMiddleware("Conductor");
    const req = {
      user: { id: 1, roles: ["Pasajero", "Conductor"] },
      activeRole: "Pasajero",
    };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Cambia a modo Conductor para realizar esta acción.",
      code: "ROLE_NOT_ACTIVE",
      requiredRole: "Conductor",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("rechaza con 403 genérico si el usuario no cuenta con el rol en su cuenta", () => {
    const middleware = roleMiddleware("Conductor");
    const req = {
      user: { id: 1, roles: ["Pasajero"] },
      activeRole: "Pasajero",
    };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/No cuentas con los permisos necesarios/) })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe("validateMiddleware (Validación de Registro y Login)", () => {
  describe("validateRegister", () => {
    test("rechaza nombre de menos de 2 caracteres", () => {
      const req = {
        body: {
          name: "A",
          email: "test@uadec.edu.mx",
          password: "Password123!",
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      validateMiddleware.validateRegister(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/nombre es requerido/) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("rechaza correo no institucional (ej. gmail.com)", () => {
      const req = {
        body: {
          name: "Juan Perez",
          email: "juan.perez@gmail.com",
          password: "Password123!",
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      validateMiddleware.validateRegister(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/correo debe ser institucional/) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("acepta correos con dominio educativo (.edu.mx, .edu, .mx)", () => {
      const validEmails = [
        "alumno@uadec.edu.mx",
        "docente@universidad.edu",
        "investigador@itesm.mx",
      ];

      for (const email of validEmails) {
        const req = {
          body: {
            name: "Maria Lopez",
            email,
            password: "StrongPassword123!",
          },
        };
        const res = createMockRes();
        const next = jest.fn();

        validateMiddleware.validateRegister(req, res, next);

        expect(next).toHaveBeenCalled();
      }
    });

    test("rechaza contraseñas débiles (menos de 8 caracteres, sin mayúscula, sin número o sin símbolo)", () => {
      const weakPasswords = [
        "Sho1!",         // menos de 8 chars (longitud 5)
        "alllowercase1!", // sin mayúscula
        "NoSpecialChar1", // sin carácter especial
        "NoDigitsSpecial!", // sin dígito
        "",              // vacía
      ];

      for (const password of weakPasswords) {
        const req = {
          body: {
            name: "Juan Perez",
            email: "juan@uadec.edu.mx",
            password,
          },
        };
        const res = createMockRes();
        const next = jest.fn();

        validateMiddleware.validateRegister(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      }
    });

    test("rechaza teléfono con formato inválido (< 10 dígitos o > 15 dígitos)", () => {
      const req = {
        body: {
          name: "Juan Perez",
          email: "juan@uadec.edu.mx",
          password: "Password123!",
          telefono: "12345", // muy corto
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      validateMiddleware.validateRegister(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/teléfono debe contener entre 10 y 15/) })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("validateLogin", () => {
    test("rechaza si falta email o password", () => {
      const req = { body: { email: "test@uadec.edu.mx" } };
      const res = createMockRes();
      const next = jest.fn();

      validateMiddleware.validateLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/correo electrónico y la contraseña son requeridos/) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("permite paso con next() si email y password están presentes", () => {
      const req = { body: { email: "test@uadec.edu.mx", password: "Password123!" } };
      const res = createMockRes();
      const next = jest.fn();

      validateMiddleware.validateLogin(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
