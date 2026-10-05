const test = require("node:test");
const assert = require("node:assert/strict");
const reservationService = require("../services/reservationService");
const reservationController = require("../controllers/reservationController");

test("reservationService.respond valida que el estado sea 'aceptada' o 'rechazada'", async () => {
  await assert.rejects(
    () => reservationService.respond(1, 1, "invalido"),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /El estado debe ser 'aceptada' o 'rechazada'/);
      return true;
    }
  );

  await assert.rejects(
    () => reservationService.respond(1, 1, ""),
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );
});

test("reservationController.cancel rechaza IDs no numéricos o menores o iguales a 0", async () => {
  const mockRes = () => {
    const res = {};
    res.statusCode = null;
    res.body = null;
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.body = data;
      return res;
    };
    return res;
  };

  const res1 = mockRes();
  await reservationController.cancel({ params: { id: "abc" }, user: { id: 1 } }, res1);
  assert.equal(res1.statusCode, 400);
  assert.match(res1.body.message, /número entero positivo/);

  const res2 = mockRes();
  await reservationController.cancel({ params: { id: "-5" }, user: { id: 1 } }, res2);
  assert.equal(res2.statusCode, 400);

  const res3 = mockRes();
  await reservationController.cancel({ params: { id: "0" }, user: { id: 1 } }, res3);
  assert.equal(res3.statusCode, 400);
});

test("reservationController.respond rechaza IDs no numéricos o menores o iguales a 0", async () => {
  const mockRes = () => {
    const res = {};
    res.statusCode = null;
    res.body = null;
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.body = data;
      return res;
    };
    return res;
  };

  const res1 = mockRes();
  await reservationController.respond({ params: { id: "xyz" }, user: { id: 1 } }, res1);
  assert.equal(res1.statusCode, 400);
  assert.match(res1.body.message, /número entero positivo/);
});

test("reservationModel.findByPassenger retorna reservaciones con formato esperado", async () => {
  const reservationModel = require("../models/reservationModel");
  // En las semillas, el usuario 1003 tiene reservaciones
  const rows = await reservationModel.findByPassenger(1003, { order: "asc" });
  assert.ok(Array.isArray(rows));
  if (rows.length > 0) {
    const r = rows[0];
    assert.equal(r.pasajero_id, 1003);
    assert.ok(r.origen);
    assert.ok(r.destino);
    assert.ok(r.conductor_nombre);
    assert.ok(r.estado);
  }
});

test("reservationModel.cancel rechaza reservaciones inexistentes con 404", async () => {
  const reservationModel = require("../models/reservationModel");
  await assert.rejects(
    () => reservationModel.cancel(999999, 1),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /no existe/);
      return true;
    }
  );
});

test("reservationModel.cancel rechaza usuarios no autorizados con 403", async () => {
  const reservationModel = require("../models/reservationModel");
  // ID 1002 existe en seeds.sql (conductor 6003, pasajero 6002)
  // Usuario 9999 no es ni conductor ni pasajero de esa reserva
  await assert.rejects(
    () => reservationModel.cancel(1002, 9999),
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /No tienes permisos/);
      return true;
    }
  );
});

test("Flujo de reservación: book (pendiente) -> respond (aceptada) -> cancel (cupo restaurado)", async () => {
  const { sql, poolPromise } = require("../config/db");
  const tripModel = require("../models/tripModel");
  const reservationModel = require("../models/reservationModel");

  const pool = await poolPromise;
  const driverId = 6003;
  const passengerId = 6002;
  const vehicleId = 1002;

  // Fecha en el futuro (2 días adelante)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 2);

  // Crear viaje de prueba con cupo 2
  const trip = await tripModel.create({
    conductor_id: driverId,
    vehiculo_id: vehicleId,
    origen: "Campus Central Test",
    destino: "Rectoría Test",
    fecha_salida: futureDate,
    cupo_disponible: 2,
    costo_por_pasajero: 30,
  });

  try {
    assert.equal(trip.cupo_disponible, 2);

    // 1. Reservar (book) -> debe quedar en estado 'pendiente' y NO descontar cupo
    const booking = await tripModel.book(trip.id, passengerId);
    assert.equal(booking.estado, "pendiente");
    assert.equal(booking.asientos_restantes, 2);

    const tripAfterBook = await tripModel.findById(trip.id);
    assert.equal(tripAfterBook.cupo_disponible, 2, "El cupo NO debe descontarse al crear la reserva pendiente");

    // 2. Conductor acepta la solicitud -> pasa a 'aceptada' y descuenta 1 cupo
    const accepted = await reservationModel.respond(booking.id, driverId, "aceptada");
    assert.equal(accepted.estado, "aceptada");
    assert.equal(accepted.asientos_restantes, 1);

    const tripAfterAccept = await tripModel.findById(trip.id);
    assert.equal(tripAfterAccept.cupo_disponible, 1, "El cupo debe ser 1 tras ser aceptada");

    // 3. Pasajero cancela la reserva -> pasa a 'cancelada' y restituye el cupo a 2
    const cancelled = await reservationModel.cancel(booking.id, passengerId);
    assert.equal(cancelled.estado, "cancelada");
    assert.equal(cancelled.cancelado_por, "pasajero");
    assert.equal(cancelled.asientos_restantes, 2);

    const tripAfterCancel = await tripModel.findById(trip.id);
    assert.equal(tripAfterCancel.cupo_disponible, 2, "El cupo debe restaurarse a 2 tras cancelar");

    // 4. Intentar cancelar de nuevo -> debe arrojar 409 Conflict
    await assert.rejects(
      () => reservationModel.cancel(booking.id, passengerId),
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /ya se encuentra cancelada/);
        return true;
      }
    );
  } finally {
    // Limpieza
    await pool.request().input("tripId", sql.Int, trip.id).query("DELETE FROM SolicitudesViaje WHERE viaje_id = @tripId");
    await pool.request().input("tripId", sql.Int, trip.id).query("DELETE FROM Viajes WHERE id = @tripId");
  }
});

test.after(async () => {
  const { poolPromise } = require("../config/db");
  const pool = await poolPromise;
  await pool.close();
});
