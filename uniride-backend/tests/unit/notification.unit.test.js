/**
 * Pruebas unitarias del #69. Sin BD: todos los modelos van mockeados.
 * Correr: npm run test:unit
 */

// config/db conecta a SQL Server al importarse; aquí se reemplaza entero.
jest.mock("../../config/db", () => ({
  sql: {},
  poolPromise: Promise.resolve({}),
}));
jest.mock("../../models/notificationModel", () => ({
  create: jest.fn(),
  findByUser: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
}));
jest.mock("../../models/tripModel", () => ({
  book: jest.fn(),
  findById: jest.fn(),
}));
jest.mock("../../models/vehicleModel", () => ({ findById: jest.fn() }));
jest.mock("../../models/reservationModel", () => ({
  respond: jest.fn(),
  cancel: jest.fn(),
  findByPassenger: jest.fn(),
}));

const notificationModel = require("../../models/notificationModel");
const tripModel = require("../../models/tripModel");
const reservationModel = require("../../models/reservationModel");
const notificationService = require("../../services/notificationService");
const tripService = require("../../services/tripService");
const reservationService = require("../../services/reservationService");
const notificationController = require("../../controllers/notificationController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let errorSpy;
beforeEach(() => {
  jest.clearAllMocks();
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

describe("notificationService", () => {
  describe("notifyReservationStatusChange", () => {
    const base = { id: 7, viaje_id: 3, pasajero_id: 9 };

    test("aceptada -> notifica al pasajero con tipo reserva_aceptada", async () => {
      notificationModel.create.mockResolvedValue({ id: 1 });
      await notificationService.notifyReservationStatusChange({ ...base, estado: "aceptada" });

      expect(notificationModel.create).toHaveBeenCalledTimes(1);
      expect(notificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: 9,
          solicitudId: 7,
          viajeId: 3,
          tipo: "reserva_aceptada",
        })
      );
    });

    test("rechazada -> notifica al pasajero con tipo reserva_rechazada", async () => {
      notificationModel.create.mockResolvedValue({ id: 2 });
      await notificationService.notifyReservationStatusChange({ ...base, estado: "rechazada" });

      expect(notificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 9, tipo: "reserva_rechazada" })
      );
    });

    test("estado sin plantilla -> null y no inserta", async () => {
      const out = await notificationService.notifyReservationStatusChange({ ...base, estado: "pendiente" });
      expect(out).toBeNull();
      expect(notificationModel.create).not.toHaveBeenCalled();
    });

    test("sin pasajero_id -> lanza error y no inserta", async () => {
      await expect(
        notificationService.notifyReservationStatusChange({ id: 7, viaje_id: 3, estado: "aceptada" })
      ).rejects.toThrow("destinatario");
      expect(notificationModel.create).not.toHaveBeenCalled();
    });

    test("error del modelo se propaga (no se traga aquí)", async () => {
      notificationModel.create.mockRejectedValue(new Error("Invalid column name 'solicitud_id'"));
      await expect(
        notificationService.notifyReservationStatusChange({ ...base, estado: "aceptada" })
      ).rejects.toThrow("Invalid column name");
    });
  });

  describe("notifyNewReservationRequest", () => {
    test("notifica al conductor del viaje", async () => {
      notificationModel.create.mockResolvedValue({ id: 3 });
      await notificationService.notifyNewReservationRequest(
        { id: 11, viaje_id: 4 },
        { conductor_id: 8, origen: "Campus Arteaga", destino: "Campus Central" }
      );

      expect(notificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: 8,
          solicitudId: 11,
          viajeId: 4,
          tipo: "reserva_solicitada",
          mensaje: expect.stringContaining("Campus Arteaga"),
        })
      );
    });

    test("mensaje nunca pasa de 500 caracteres", async () => {
      notificationModel.create.mockResolvedValue({ id: 3 });
      await notificationService.notifyNewReservationRequest(
        { id: 1, viaje_id: 1 },
        { conductor_id: 8, origen: "o".repeat(255), destino: "d".repeat(255) }
      );
      const { mensaje } = notificationModel.create.mock.calls[0][0];
      expect(mensaje.length).toBeLessThanOrEqual(500);
    });
  });

  describe("notifyReservationCancelled", () => {
    const trip = { conductor_id: 8, origen: "A", destino: "B" };

    test("cancela el pasajero -> avisa al conductor", async () => {
      notificationModel.create.mockResolvedValue({ id: 4 });
      await notificationService.notifyReservationCancelled(
        { id: 1, viaje_id: 2, pasajero_id: 9, cancelado_por: "pasajero" },
        trip
      );
      expect(notificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 8, tipo: "reserva_cancelada" })
      );
    });

    test("cancela el conductor -> avisa al pasajero", async () => {
      notificationModel.create.mockResolvedValue({ id: 5 });
      await notificationService.notifyReservationCancelled(
        { id: 1, viaje_id: 2, pasajero_id: 9, cancelado_por: "conductor" },
        trip
      );
      expect(notificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 9, tipo: "reserva_cancelada" })
      );
    });
  });

  describe("getUserNotifications", () => {
    test("delega al modelo con usuario y opciones", async () => {
      notificationModel.findByUser.mockResolvedValue([{ id: 1 }]);
      const out = await notificationService.getUserNotifications(9, { soloNoLeidas: true });
      expect(notificationModel.findByUser).toHaveBeenCalledWith(9, { soloNoLeidas: true });
      expect(out).toEqual([{ id: 1 }]);
    });
  });
});

describe("tripService.book + notificación", () => {
  const reservation = { id: 11, viaje_id: 4, pasajero_id: 9, estado: "pendiente" };
  const trip = { id: 4, conductor_id: 8, origen: "A", destino: "B" };

  test("reserva ok -> notifica al conductor", async () => {
    tripModel.book.mockResolvedValue(reservation);
    tripModel.findById.mockResolvedValue(trip);
    notificationModel.create.mockResolvedValue({ id: 1 });

    const out = await tripService.book(4, 9);

    expect(out).toBe(reservation);
    expect(tripModel.findById).toHaveBeenCalledWith(4);
    expect(notificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 8, tipo: "reserva_solicitada" })
    );
  });

  test("si falla la notificación, la reserva igual se devuelve y el error se registra", async () => {
    tripModel.book.mockResolvedValue(reservation);
    tripModel.findById.mockResolvedValue(trip);
    notificationModel.create.mockRejectedValue(new Error("Invalid column name 'viaje_id'"));

    const out = await tripService.book(4, 9);

    expect(out).toBe(reservation);
    expect(errorSpy).toHaveBeenCalled(); // no debe fallar en silencio
  });

  test("si book falla, no se notifica y el error sube", async () => {
    const err = Object.assign(new Error("Cupo agotado"), { statusCode: 409 });
    tripModel.book.mockRejectedValue(err);

    await expect(tripService.book(4, 9)).rejects.toBe(err);
    expect(notificationModel.create).not.toHaveBeenCalled();
  });

  test("viaje no encontrado -> no notifica ni falla", async () => {
    tripModel.book.mockResolvedValue(reservation);
    tripModel.findById.mockResolvedValue(null);

    await expect(tripService.book(4, 9)).resolves.toBe(reservation);
    expect(notificationModel.create).not.toHaveBeenCalled();
  });
});

describe("reservationService + notificación", () => {
  test("respond aceptada -> notifica al pasajero", async () => {
    const reservation = { id: 7, viaje_id: 3, pasajero_id: 9, estado: "aceptada" };
    reservationModel.respond.mockResolvedValue(reservation);
    notificationModel.create.mockResolvedValue({ id: 1 });

    const out = await reservationService.respond(7, 8, " Aceptada ");

    expect(reservationModel.respond).toHaveBeenCalledWith(7, 8, "aceptada");
    expect(out).toBe(reservation);
    expect(notificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 9, tipo: "reserva_aceptada" })
    );
  });

  test("respond: fallo al notificar no rompe la respuesta y se registra", async () => {
    const reservation = { id: 7, viaje_id: 3, pasajero_id: 9, estado: "rechazada" };
    reservationModel.respond.mockResolvedValue(reservation);
    notificationModel.create.mockRejectedValue(new Error("boom"));

    await expect(reservationService.respond(7, 8, "rechazada")).resolves.toBe(reservation);
    expect(errorSpy).toHaveBeenCalled();
  });

  test("respond con estado inválido -> 400 y no toca modelos", async () => {
    await expect(reservationService.respond(7, 8, "otra")).rejects.toMatchObject({ statusCode: 400 });
    expect(reservationModel.respond).not.toHaveBeenCalled();
    expect(notificationModel.create).not.toHaveBeenCalled();
  });

  test("respond: si el modelo falla (403/409) no se notifica", async () => {
    reservationModel.respond.mockRejectedValue(Object.assign(new Error("no"), { statusCode: 403 }));
    await expect(reservationService.respond(7, 8, "aceptada")).rejects.toMatchObject({ statusCode: 403 });
    expect(notificationModel.create).not.toHaveBeenCalled();
  });

  test("cancel por pasajero -> notifica al conductor", async () => {
    const reservation = { id: 7, viaje_id: 3, pasajero_id: 9, estado: "cancelada", cancelado_por: "pasajero" };
    reservationModel.cancel.mockResolvedValue(reservation);
    tripModel.findById.mockResolvedValue({ conductor_id: 8, origen: "A", destino: "B" });
    notificationModel.create.mockResolvedValue({ id: 1 });

    const out = await reservationService.cancel(7, 9);

    expect(out).toBe(reservation);
    expect(notificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 8, tipo: "reserva_cancelada" })
    );
  });

  test("cancel: fallo al notificar no rompe la cancelación", async () => {
    const reservation = { id: 7, viaje_id: 3, pasajero_id: 9, cancelado_por: "conductor" };
    reservationModel.cancel.mockResolvedValue(reservation);
    tripModel.findById.mockRejectedValue(new Error("db caída"));

    await expect(reservationService.cancel(7, 8)).resolves.toBe(reservation);
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("notificationController.list", () => {
  test("200 con las notificaciones del usuario autenticado", async () => {
    notificationModel.findByUser.mockResolvedValue([{ id: 1 }]);
    const res = mockRes();

    await notificationController.list({ user: { id: 9 }, query: {} }, res);

    expect(notificationModel.findByUser).toHaveBeenCalledWith(9, { soloNoLeidas: false });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ notifications: [{ id: 1 }] });
  });

  test("?noLeidas=true filtra solo no leídas", async () => {
    notificationModel.findByUser.mockResolvedValue([]);
    await notificationController.list({ user: { id: 9 }, query: { noLeidas: "true" } }, mockRes());
    expect(notificationModel.findByUser).toHaveBeenCalledWith(9, { soloNoLeidas: true });
  });

  test("marca una notificación propia como leída", async () => {
    notificationModel.markRead.mockResolvedValue({ id: 4, leida: true });
    const res = mockRes();

    await notificationController.markRead({ params: { id: "4" }, user: { id: 9 } }, res);

    expect(notificationModel.markRead).toHaveBeenCalledWith(4, 9);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ notification: { id: 4, leida: true } });
  });

  test("no permite IDs inválidos ni expone notificaciones de otro usuario", async () => {
    const invalidRes = mockRes();
    await notificationController.markRead({ params: { id: "0" }, user: { id: 9 } }, invalidRes);
    expect(invalidRes.status).toHaveBeenCalledWith(400);
    expect(notificationModel.markRead).not.toHaveBeenCalled();

    notificationModel.markRead.mockResolvedValue(null);
    const missingRes = mockRes();
    await notificationController.markRead({ params: { id: "4" }, user: { id: 9 } }, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  test("marca todas las notificaciones del usuario como leídas", async () => {
    notificationModel.markAllRead.mockResolvedValue(3);
    const res = mockRes();

    await notificationController.markAllRead({ user: { id: 9 } }, res);

    expect(notificationModel.markAllRead).toHaveBeenCalledWith(9);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ updated: 3 });
  });

  test("error -> 500 con mensaje", async () => {
    notificationModel.findByUser.mockRejectedValue(new Error("db"));
    const res = mockRes();

    await notificationController.list({ user: { id: 9 }, query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "db" });
  });
});
