/**
 * Pruebas unitarias para vehicleService y vehicleController.
 * Issue #72: Pruebas unitarias de vehículos y roles.
 */

jest.mock("../../config/db", () => ({
  sql: {},
  poolPromise: Promise.resolve({}),
}));

jest.mock("../../models/vehicleModel", () => ({
  findByPlaca: jest.fn(),
  create: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  countActiveByUser: jest.fn(),
  hasUpcomingTrips: jest.fn(),
  hasTrips: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  remove: jest.fn(),
}));

jest.mock("../../models/userModel", () => ({
  findById: jest.fn(),
  findRoleIdByName: jest.fn(),
  addRole: jest.fn(),
  removeRole: jest.fn(),
}));

jest.mock("../../services/authService", () => ({
  createSession: jest.fn(),
}));

const vehicleModel = require("../../models/vehicleModel");
const userModel = require("../../models/userModel");
const authService = require("../../services/authService");
const vehicleService = require("../../services/vehicleService");
const vehicleController = require("../../controllers/vehicleController");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("vehicleService", () => {
  const sampleVehicleData = {
    marca: "Toyota",
    modelo: "Corolla",
    anio: 2021,
    color: "Gris",
    placa: "TOY-123",
    asientos_disponibles: 4,
  };

  describe("create", () => {
    test("rechaza con 409 Conflict si la placa ya se encuentra registrada", async () => {
      vehicleModel.findByPlaca.mockResolvedValue({ id: 1, placa: "TOY-123" });

      await expect(vehicleService.create(1, sampleVehicleData)).rejects.toMatchObject({
        statusCode: 409,
        message: "La placa ya está registrada",
      });
      expect(vehicleModel.create).not.toHaveBeenCalled();
    });

    test("crea vehículo y auto-asigna rol Conductor si el usuario solo tenía rol Pasajero", async () => {
      vehicleModel.findByPlaca.mockResolvedValue(null);
      const createdVehicle = { id: 5, usuario_id: 2, ...sampleVehicleData };
      vehicleModel.create.mockResolvedValue(createdVehicle);
      vehicleModel.countActiveByUser.mockResolvedValue(1);

      // El usuario solo tiene rol Pasajero
      userModel.findById.mockResolvedValue({ id: 2, roles: ["Pasajero"] });
      userModel.findRoleIdByName.mockResolvedValue(2); // Rol Conductor = ID 2
      const updatedUser = { id: 2, roles: ["Pasajero", "Conductor"] };
      userModel.addRole.mockResolvedValue(updatedUser);
      const newSession = { token: "new_jwt_conductor", user: updatedUser };
      authService.createSession.mockResolvedValue(newSession);

      const result = await vehicleService.create(2, sampleVehicleData);

      expect(vehicleModel.create).toHaveBeenCalledWith({ usuario_id: 2, ...sampleVehicleData });
      expect(userModel.addRole).toHaveBeenCalledWith(2, 2);
      expect(authService.createSession).toHaveBeenCalledWith(updatedUser);
      expect(result).toEqual({
        vehicle: createdVehicle,
        session: newSession,
      });
    });

    test("crea vehículo sin reasignar rol si el usuario ya contaba con rol Conductor", async () => {
      vehicleModel.findByPlaca.mockResolvedValue(null);
      const createdVehicle = { id: 6, usuario_id: 3, ...sampleVehicleData };
      vehicleModel.create.mockResolvedValue(createdVehicle);
      vehicleModel.countActiveByUser.mockResolvedValue(1);

      // El usuario ya es Conductor
      userModel.findById.mockResolvedValue({ id: 3, roles: ["Conductor", "Pasajero"] });

      const result = await vehicleService.create(3, sampleVehicleData);

      expect(vehicleModel.create).toHaveBeenCalled();
      expect(userModel.addRole).not.toHaveBeenCalled();
      expect(result).toEqual({
        vehicle: createdVehicle,
        session: null,
      });
    });
  });

  describe("listMine", () => {
    test("retorna los vehículos asociados al usuario autenticado", async () => {
      const vehicles = [{ id: 1, usuario_id: 1, marca: "Nissan" }];
      vehicleModel.findByUserId.mockResolvedValue(vehicles);

      const result = await vehicleService.listMine(1);

      expect(vehicleModel.findByUserId).toHaveBeenCalledWith(1);
      expect(result).toEqual(vehicles);
    });
  });

  describe("getById", () => {
    test("retorna 404 si el vehículo no existe", async () => {
      vehicleModel.findById.mockResolvedValue(null);

      await expect(vehicleService.getById(999)).rejects.toMatchObject({
        statusCode: 404,
        message: "Vehículo no encontrado",
      });
    });

    test("retorna el vehículo si existe", async () => {
      const v = { id: 1, marca: "Nissan" };
      vehicleModel.findById.mockResolvedValue(v);

      const result = await vehicleService.getById(1);
      expect(result).toEqual(v);
    });
  });

  describe("update", () => {
    test("retorna 404 si el vehículo a editar no existe", async () => {
      vehicleModel.findById.mockResolvedValue(null);

      await expect(vehicleService.update(999, 1, {})).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    test("retorna 403 Forbidden si el usuario intenta modificar un vehículo ajeno", async () => {
      vehicleModel.findById.mockResolvedValue({ id: 1, usuario_id: 10 }); // Pertenece a usuario 10

      await expect(vehicleService.update(1, 99, {})).rejects.toMatchObject({
        statusCode: 403,
        message: "No tienes permiso para modificar este vehículo",
      });
    });

    test("retorna 409 Conflict si intenta cambiar la placa por una ya existente", async () => {
      vehicleModel.findById.mockResolvedValue({ id: 1, usuario_id: 1, placa: "OLD-111" });
      vehicleModel.findByPlaca.mockResolvedValue({ id: 2, placa: "DUPLICADA" });

      await expect(
        vehicleService.update(1, 1, { placa: "DUPLICADA" })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "La placa ya está registrada",
      });
    });

    test("actualiza el vehículo exitosamente si es el dueño", async () => {
      const existing = { id: 1, usuario_id: 1, marca: "Nissan", placa: "ABC-123" };
      vehicleModel.findById.mockResolvedValue(existing);
      const updated = { ...existing, color: "Azul" };
      vehicleModel.update.mockResolvedValue(updated);

      const result = await vehicleService.update(1, 1, { color: "Azul" });

      expect(vehicleModel.update).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });
  });

  describe("changeStatus", () => {
    test("retorna 403 si el usuario no es el dueño del vehículo", async () => {
      vehicleModel.findById.mockResolvedValue({ id: 1, usuario_id: 5 });

      await expect(vehicleService.changeStatus(1, 99, false)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    test("actualiza el estado activo/inactivo correctamente si es el dueño", async () => {
      vehicleModel.findById.mockResolvedValue({
        id: 1,
        usuario_id: 5,
        activo: true,
        roles: ["Pasajero", "Conductor"],
      });
      const updated = { id: 1, usuario_id: 5, activo: false };
      vehicleModel.updateStatus.mockResolvedValue(updated);
      vehicleModel.hasUpcomingTrips.mockResolvedValue(false);
      vehicleModel.countActiveByUser.mockResolvedValue(0);
      userModel.findById.mockResolvedValue({ id: 5, roles: ["Pasajero", "Conductor"] });
      userModel.findRoleIdByName.mockImplementation((role) =>
        Promise.resolve(role === "Conductor" ? 2 : 1)
      );
      const updatedUser = { id: 5, roles: ["Pasajero"] };
      userModel.removeRole.mockResolvedValue(updatedUser);
      const session = { token: "passenger-token", user: updatedUser };
      authService.createSession.mockResolvedValue(session);

      const result = await vehicleService.changeStatus(1, 5, false);

      expect(vehicleModel.updateStatus).toHaveBeenCalledWith(1, false);
      expect(userModel.removeRole).toHaveBeenCalledWith(5, 2);
      expect(result).toEqual({ vehicle: updated, session });
    });

    test("bloquea desactivar un vehículo asociado a un viaje futuro", async () => {
      vehicleModel.findById.mockResolvedValue({ id: 1, usuario_id: 5, activo: true });
      vehicleModel.hasUpcomingTrips.mockResolvedValue(true);

      await expect(vehicleService.changeStatus(1, 5, false)).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(vehicleModel.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    test("bloquea la baja cuando el vehículo tiene viajes programados", async () => {
      vehicleModel.findById.mockResolvedValue({ id: 3, usuario_id: 5 });
      vehicleModel.hasUpcomingTrips.mockResolvedValue(true);

      await expect(vehicleService.remove(3, 5)).rejects.toMatchObject({ statusCode: 409 });
      expect(vehicleModel.remove).not.toHaveBeenCalled();
      expect(vehicleModel.updateStatus).not.toHaveBeenCalled();
    });

    test("conserva vehículos históricos y sincroniza la pérdida del rol Conductor", async () => {
      vehicleModel.findById.mockResolvedValue({ id: 3, usuario_id: 5 });
      vehicleModel.hasUpcomingTrips.mockResolvedValue(false);
      vehicleModel.hasTrips.mockResolvedValue(true);
      const inactiveVehicle = { id: 3, usuario_id: 5, activo: false };
      vehicleModel.updateStatus.mockResolvedValue(inactiveVehicle);
      vehicleModel.countActiveByUser.mockResolvedValue(0);
      userModel.findById.mockResolvedValue({ id: 5, roles: ["Pasajero", "Conductor"] });
      userModel.findRoleIdByName.mockImplementation((role) =>
        Promise.resolve(role === "Conductor" ? 2 : 1)
      );
      const passenger = { id: 5, roles: ["Pasajero"] };
      userModel.removeRole.mockResolvedValue(passenger);
      const session = { token: "passenger-token", user: passenger };
      authService.createSession.mockResolvedValue(session);

      const result = await vehicleService.remove(3, 5);

      expect(vehicleModel.updateStatus).toHaveBeenCalledWith(3, false);
      expect(vehicleModel.remove).not.toHaveBeenCalled();
      expect(result).toEqual({ vehicle: inactiveVehicle, session, softDeleted: true });
    });
  });
});

describe("vehicleController", () => {
  describe("create", () => {
    test("201 Created con nueva sesión cuando el usuario adquiere rol Conductor", async () => {
      const vehicle = { id: 1, marca: "Mazda" };
      const session = { token: "token_conductor", user: { id: 1, roles: ["Conductor"] } };
      jest.spyOn(vehicleService, "create").mockResolvedValue({ vehicle, session });

      const req = { user: { id: 1 }, body: { marca: "Mazda" } };
      const res = createMockRes();

      await vehicleController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/Ahora también eres Conductor/),
          token: "token_conductor",
          rolAgregado: "Conductor",
          vehicle,
        })
      );
    });

    test("201 Created sin cambio de rol cuando el usuario ya era Conductor", async () => {
      const vehicle = { id: 2, marca: "Ford" };
      jest.spyOn(vehicleService, "create").mockResolvedValue({ vehicle, session: null });

      const req = { user: { id: 1 }, body: { marca: "Ford" } };
      const res = createMockRes();

      await vehicleController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Vehículo registrado exitosamente.",
        vehicle,
      });
    });

    test("maneja error con statusCode correspondiente (ej. 409)", async () => {
      const err = new Error("La placa ya está registrada");
      err.statusCode = 409;
      jest.spyOn(vehicleService, "create").mockRejectedValue(err);

      const req = { user: { id: 1 }, body: {} };
      const res = createMockRes();

      await vehicleController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: "La placa ya está registrada" });
    });
  });

  describe("listMine", () => {
    test("200 OK con el listado de vehículos propios", async () => {
      const vehicles = [{ id: 1, marca: "Nissan" }];
      jest.spyOn(vehicleService, "listMine").mockResolvedValue(vehicles);

      const req = { user: { id: 1 } };
      const res = createMockRes();

      await vehicleController.listMine(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ vehicles });
    });
  });

  describe("getById", () => {
    test("200 OK con los datos del vehículo", async () => {
      const vehicle = { id: 3, marca: "Chevrolet" };
      jest.spyOn(vehicleService, "getById").mockResolvedValue(vehicle);

      const req = { params: { id: 3 } };
      const res = createMockRes();

      await vehicleController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ vehicle });
    });
  });

  describe("update", () => {
    test("200 OK al actualizar exitosamente el vehículo", async () => {
      const vehicle = { id: 3, color: "Negro" };
      jest.spyOn(vehicleService, "update").mockResolvedValue(vehicle);

      const req = { params: { id: 3 }, user: { id: 1 }, body: { color: "Negro" } };
      const res = createMockRes();

      await vehicleController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Vehículo actualizado correctamente.",
        vehicle,
      });
    });
  });

  describe("changeStatus", () => {
    test("200 OK al cambiar el estado del vehículo", async () => {
      const vehicle = { id: 3, activo: false };
      jest.spyOn(vehicleService, "changeStatus").mockResolvedValue({
        vehicle,
        session: null,
      });

      const req = { params: { id: 3 }, user: { id: 1 }, body: { activo: false } };
      const res = createMockRes();

      await vehicleController.changeStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Estado del vehículo actualizado correctamente.",
        vehicle,
      });
    });
  });
});
