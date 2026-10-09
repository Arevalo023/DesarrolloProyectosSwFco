/**
 * Pruebas unitarias del modelo Reservation (models/reservationModel.js,
 * tabla SolicitudesViaje).
 * Issue #71: Pruebas unitarias de modelos (User, Trip, Reservation, Vehicle).
 */

jest.mock('../../config/db', () => require('../helpers/mockDb').module);

const db = require('../helpers/mockDb');
const reservationModel = require('../../models/reservationModel');

const DAY = 24 * 60 * 60 * 1000;
const future = () => new Date(Date.now() + DAY);
const past = () => new Date(Date.now() - DAY);

const row = (overrides = {}) => ({
  id: 100,
  viaje_id: 10,
  pasajero_id: 1,
  estado: 'pendiente',
  conductor_id: 2,
  cupo_disponible: 3,
  viaje_estado: 'programado',
  fecha_salida: future(),
  ...overrides,
});

const touchesTrip = () => db.requests.some((r) => /UPDATE Viajes/.test(r.text));
const expectRolledBack = () =>
  expect(db.lastTransaction).toMatchObject({ begun: true, committed: false, rolledBack: true });

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe('reservationModel.respond', () => {
  const driverId = 2;

  test('lanza 404 si la solicitud no existe', async () => {
    db.queueResult({ recordset: [] });

    await expect(reservationModel.respond(100, driverId, 'aceptada')).rejects.toMatchObject({
      statusCode: 404,
      message: 'La solicitud no existe.',
    });
    expectRolledBack();
  });

  test('lanza 403 si quien responde no es el conductor dueño del viaje', async () => {
    db.queueResult({ recordset: [row({ conductor_id: 99 })] });

    await expect(reservationModel.respond(100, driverId, 'aceptada')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(touchesTrip()).toBe(false);
    expectRolledBack();
  });

  test.each(['aceptada', 'rechazada', 'cancelada'])(
    "lanza 409 si la solicitud ya está '%s'",
    async (estado) => {
      db.queueResult({ recordset: [row({ estado })] });

      await expect(reservationModel.respond(100, driverId, 'aceptada')).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining(`estado actual: ${estado}`),
      });
      expectRolledBack();
    }
  );

  test('lanza 400 al aceptar si el viaje ya no admite solicitudes', async () => {
    db.queueResult({ recordset: [row({ viaje_estado: 'cancelado' })] });

    await expect(reservationModel.respond(100, driverId, 'aceptada')).rejects.toMatchObject({
      statusCode: 400,
      message: 'El viaje ya no admite solicitudes.',
    });
    expect(touchesTrip()).toBe(false);
    expectRolledBack();
  });

  test('lanza 400 al aceptar si el viaje ya salió', async () => {
    db.queueResult({ recordset: [row({ fecha_salida: past() })] });

    await expect(reservationModel.respond(100, driverId, 'aceptada')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(touchesTrip()).toBe(false);
    expectRolledBack();
  });

  test('lanza 409 al aceptar si no queda cupo (UPDATE sin filas afectadas)', async () => {
    db.queueResult({ recordset: [row({ cupo_disponible: 0 })] });
    db.queueResult({ rowsAffected: [0] });

    await expect(reservationModel.respond(100, driverId, 'aceptada')).rejects.toMatchObject({
      statusCode: 409,
      message: 'No hay cupo disponible en este viaje.',
    });
    expectRolledBack();
    expect(db.requests.some((r) => /UPDATE SolicitudesViaje/.test(r.text))).toBe(false);
  });

  test('aceptar descuenta 1 cupo, guarda el estado y confirma la transacción', async () => {
    db.queueResult({ recordset: [row({ cupo_disponible: 3 })] });
    db.queueResult({ rowsAffected: [1] });
    db.queueResult({
      recordset: [{ id: 100, viaje_id: 10, pasajero_id: 1, estado: 'aceptada' }],
    });

    const result = await reservationModel.respond(100, driverId, 'aceptada');

    expect(result).toEqual({
      id: 100,
      viaje_id: 10,
      pasajero_id: 1,
      estado: 'aceptada',
      asientos_restantes: 2,
    });
    expect(db.requests[1].text).toMatch(/cupo_disponible = cupo_disponible - 1/);
    expect(db.requests[1].text).toMatch(/cupo_disponible > 0/);
    expect(db.requests[2].inputs.estado).toEqual({
      type: { name: 'VarChar', length: 20 },
      value: 'aceptada',
    });
    expect(db.lastTransaction).toMatchObject({ committed: true, rolledBack: false });
  });

  test('rechazar NO modifica el cupo del viaje', async () => {
    db.queueResult({ recordset: [row({ cupo_disponible: 3 })] });
    db.queueResult({
      recordset: [{ id: 100, viaje_id: 10, pasajero_id: 1, estado: 'rechazada' }],
    });

    const result = await reservationModel.respond(100, driverId, 'rechazada');

    expect(result).toMatchObject({ estado: 'rechazada', asientos_restantes: 3 });
    expect(touchesTrip()).toBe(false);
    expect(db.requests).toHaveLength(2);
    expect(db.lastTransaction).toMatchObject({ committed: true, rolledBack: false });
  });

  test("interpreta 'PENDIENTE' y 'Programado' sin distinguir mayúsculas", async () => {
    db.queueResult({ recordset: [row({ estado: 'PENDIENTE', viaje_estado: 'Programado' })] });
    db.queueResult({ rowsAffected: [1] });
    db.queueResult({ recordset: [{ id: 100, estado: 'aceptada' }] });

    await expect(reservationModel.respond(100, driverId, 'aceptada')).resolves.toMatchObject({
      estado: 'aceptada',
    });
  });

  test('envía los ids como Int', async () => {
    db.queueResult({ recordset: [] });

    await expect(reservationModel.respond(100, driverId, 'aceptada')).rejects.toBeDefined();

    expect(db.requests[0].inputs.id).toEqual({ type: { name: 'Int' }, value: 100 });
  });

  test('hace rollback y relanza si falla la actualización final', async () => {
    db.queueResult({ recordset: [row()] });
    db.queueResult({ rowsAffected: [1] });
    db.queueResult(new Error('timeout'));

    await expect(reservationModel.respond(100, driverId, 'aceptada')).rejects.toThrow('timeout');
    expectRolledBack();
  });
});

describe('reservationModel.cancel', () => {
  test('lanza 404 si la reservación no existe', async () => {
    db.queueResult({ recordset: [] });

    await expect(reservationModel.cancel(100, 1)).rejects.toMatchObject({
      statusCode: 404,
      message: 'La reservación no existe.',
    });
    expectRolledBack();
  });

  test('lanza 403 si el usuario no es el pasajero ni el conductor', async () => {
    db.queueResult({ recordset: [row()] });

    await expect(reservationModel.cancel(100, 999)).rejects.toMatchObject({ statusCode: 403 });
    expect(touchesTrip()).toBe(false);
    expectRolledBack();
  });

  test('lanza 409 si ya está cancelada', async () => {
    db.queueResult({ recordset: [row({ estado: 'cancelada' })] });

    await expect(reservationModel.cancel(100, 1)).rejects.toMatchObject({
      statusCode: 409,
      message: 'La reservación ya se encuentra cancelada.',
    });
    expectRolledBack();
  });

  test('lanza 409 si está rechazada', async () => {
    db.queueResult({ recordset: [row({ estado: 'rechazada' })] });

    await expect(reservationModel.cancel(100, 1)).rejects.toMatchObject({
      statusCode: 409,
      message: 'No se puede cancelar una reservación rechazada.',
    });
    expectRolledBack();
  });

  test.each(['cancelado', 'finalizado'])(
    "lanza 400 si el viaje está '%s'",
    async (viaje_estado) => {
      db.queueResult({ recordset: [row({ viaje_estado })] });

      await expect(reservationModel.cancel(100, 1)).rejects.toMatchObject({ statusCode: 400 });
      expectRolledBack();
    }
  );

  test('lanza 400 si la hora de salida ya pasó', async () => {
    db.queueResult({ recordset: [row({ fecha_salida: past() })] });

    await expect(reservationModel.cancel(100, 1)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/tiempo límite/),
    });
    expectRolledBack();
  });

  test('el pasajero cancela una reservación pendiente sin modificar el cupo', async () => {
    db.queueResult({ recordset: [row({ estado: 'pendiente', cupo_disponible: 3 })] });
    db.queueResult({ recordset: [{ id: 100, estado: 'cancelada' }] });

    const result = await reservationModel.cancel(100, 1);

    expect(result).toEqual({
      id: 100,
      estado: 'cancelada',
      cancelado_por: 'pasajero',
      asientos_restantes: 3,
    });
    expect(touchesTrip()).toBe(false);
    expect(db.lastTransaction).toMatchObject({ committed: true, rolledBack: false });
  });

  test('cancelar una reservación aceptada restituye 1 cupo al viaje', async () => {
    db.queueResult({ recordset: [row({ estado: 'aceptada', cupo_disponible: 1 })] });
    db.queueResult({ rowsAffected: [1] });
    db.queueResult({ recordset: [{ id: 100, estado: 'cancelada' }] });

    const result = await reservationModel.cancel(100, 1);

    expect(result.asientos_restantes).toBe(2);
    expect(db.requests[1].text).toMatch(/cupo_disponible = cupo_disponible \+ 1/);
    expect(db.lastTransaction.committed).toBe(true);
  });

  test("el conductor dueño del viaje puede cancelar y queda como 'conductor'", async () => {
    db.queueResult({ recordset: [row({ estado: 'aceptada', cupo_disponible: 0 })] });
    db.queueResult({ rowsAffected: [1] });
    db.queueResult({ recordset: [{ id: 100, estado: 'cancelada' }] });

    const result = await reservationModel.cancel(100, 2);

    expect(result.cancelado_por).toBe('conductor');
    expect(result.asientos_restantes).toBe(1);
  });

  test('hace rollback y relanza si falla la actualización', async () => {
    db.queueResult({ recordset: [row()] });
    db.queueResult(new Error('conexión perdida'));

    await expect(reservationModel.cancel(100, 1)).rejects.toThrow('conexión perdida');
    expectRolledBack();
  });
});

describe('reservationModel.findByPassenger', () => {
  test('filtra por pasajero (Int) y devuelve datos de viaje, conductor y vehículo', async () => {
    const rows = [{ id: 1, conductor_nombre: 'Ana López', vehiculo_placa: 'TOY-123' }];
    db.queueResult({ recordset: rows });

    const result = await reservationModel.findByPassenger(1);

    expect(result).toBe(rows);
    expect(db.requests[0].inputs.passengerId).toEqual({ type: { name: 'Int' }, value: 1 });
    expect(db.requests[0].text).toMatch(/INNER JOIN Viajes/);
    expect(db.requests[0].text).toMatch(/INNER JOIN Usuarios/);
    expect(db.requests[0].text).toMatch(/LEFT JOIN Vehiculos/);
  });

  test('ordena ascendente por defecto', async () => {
    await reservationModel.findByPassenger(1);

    expect(db.requests[0].text).toMatch(/ORDER BY v\.fecha_salida ASC/);
  });

  test.each(['desc', 'DESC', 'Desc'])("ordena descendente con order='%s'", async (order) => {
    await reservationModel.findByPassenger(1, { order });

    expect(db.requests[0].text).toMatch(/ORDER BY v\.fecha_salida DESC/);
  });

  test.each(['asc', 'cualquier cosa', "desc; DROP TABLE Viajes", 123, null])(
    'cae a ASC (y no interpola texto arbitrario) con order=%p',
    async (order) => {
      await reservationModel.findByPassenger(1, { order });

      expect(db.requests[0].text).toMatch(/ORDER BY v\.fecha_salida ASC/);
      expect(db.requests[0].text).not.toMatch(/DROP TABLE/);
    }
  );
});
