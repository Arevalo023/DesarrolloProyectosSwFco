/**
 * Pruebas unitarias del modelo Trip (models/tripModel.js).
 * Issue #71: Pruebas unitarias de modelos (User, Trip, Reservation, Vehicle).
 */

jest.mock('../../config/db', () => require('../helpers/mockDb').module);

const db = require('../helpers/mockDb');
const tripModel = require('../../models/tripModel');

const DAY = 24 * 60 * 60 * 1000;
const future = () => new Date(Date.now() + DAY);
const past = () => new Date(Date.now() - DAY);

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe('tripModel.findAvailable', () => {
  test('envuelve origen y destino con % para búsqueda parcial', async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findAvailable({ origen: 'Centro', destino: 'Campus' });

    const { inputs } = db.requests[0];
    expect(inputs.origen).toEqual({ type: { name: 'VarChar', length: 255 }, value: '%Centro%' });
    expect(inputs.destino).toEqual({ type: { name: 'VarChar', length: 255 }, value: '%Campus%' });
  });

  test('envía null en los filtros omitidos y la fecha como Date', async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findAvailable({});

    const values = db.valuesOf(db.requests[0]);
    expect(values).toEqual({ origen: null, destino: null, fecha: null });
    expect(db.requests[0].inputs.fecha.type).toEqual({ name: 'Date' });
  });

  test('pasa la fecha YYYY-MM-DD tal cual', async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findAvailable({ fecha: '2026-12-01' });

    expect(db.requests[0].inputs.fecha.value).toBe('2026-12-01');
  });

  test('la consulta solo incluye viajes activos/programados, con cupo y a futuro', async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findAvailable({});

    const { text } = db.requests[0];
    expect(text).toMatch(/estado IN \('activo', 'programado'\)/);
    expect(text).toMatch(/cupo_disponible > 0/);
    expect(text).toMatch(/fecha_salida >= GETDATE\(\)/);
    expect(text).toMatch(/TOP \(10\)/);
  });

  test('devuelve los registros tal como los entrega la BD', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    db.queueResult({ recordset: rows });

    await expect(tripModel.findAvailable({})).resolves.toBe(rows);
  });
});

describe('tripModel.findById', () => {
  test('envía el id como Int y devuelve el viaje con conductor y vehículo', async () => {
    const row = { id: 1, conductor: 'Ana López', placa: 'TOY-123' };
    db.queueResult({ recordset: [row] });

    await expect(tripModel.findById(1)).resolves.toBe(row);
    expect(db.requests[0].inputs.id).toEqual({ type: { name: 'Int' }, value: 1 });
    expect(db.requests[0].text).toMatch(/INNER JOIN Usuarios/);
    expect(db.requests[0].text).toMatch(/INNER JOIN Vehiculos/);
  });

  test('devuelve null si el viaje no existe', async () => {
    db.queueResult({ recordset: [] });

    await expect(tripModel.findById(404)).resolves.toBeNull();
  });
});

describe('tripModel.create', () => {
  const tripData = {
    conductor_id: 2,
    vehiculo_id: 5,
    origen: 'Centro',
    destino: 'Campus Norte',
    fecha_salida: '2026-12-01T08:00:00',
    cupo_disponible: 3,
    costo_por_pasajero: 25.5,
  };

  test('usa los tipos del esquema (Int, VarChar(255), DateTime, Decimal(10,2))', async () => {
    db.queueResult({ recordset: [{ id: 9 }] });
    jest.spyOn(tripModel, 'findById').mockResolvedValue({ id: 9 });

    await tripModel.create(tripData);

    const { inputs } = db.requests[0];
    expect(inputs.conductor_id.type).toEqual({ name: 'Int' });
    expect(inputs.vehiculo_id.type).toEqual({ name: 'Int' });
    expect(inputs.origen.type).toEqual({ name: 'VarChar', length: 255 });
    expect(inputs.destino.type).toEqual({ name: 'VarChar', length: 255 });
    expect(inputs.fecha_salida.type).toEqual({ name: 'DateTime' });
    expect(inputs.cupo_disponible.type).toEqual({ name: 'Int' });
    expect(inputs.costo_por_pasajero.type).toEqual({ name: 'Decimal', precision: 10, scale: 2 });
  });

  test("crea el viaje siempre con estado 'programado' (no lo recibe del cliente)", async () => {
    db.queueResult({ recordset: [{ id: 9 }] });
    jest.spyOn(tripModel, 'findById').mockResolvedValue({ id: 9 });

    await tripModel.create({ ...tripData, estado: 'finalizado' });

    expect(db.requests[0].text).toMatch(/'programado'/);
    expect(db.requests[0].inputs).not.toHaveProperty('estado');
  });

  test('devuelve el viaje recuperado con findById usando el id insertado', async () => {
    const created = { id: 9, ...tripData, estado: 'programado' };
    db.queueResult({ recordset: [{ id: 9 }] });
    const findById = jest.spyOn(tripModel, 'findById').mockResolvedValue(created);

    const result = await tripModel.create(tripData);

    expect(findById).toHaveBeenCalledWith(9);
    expect(result).toBe(created);
  });

  test('propaga el error de la BD (p. ej. violación de FK del conductor)', async () => {
    db.queueResult(new Error('conflicted with the FOREIGN KEY constraint FK_Viaje_Conductor'));

    await expect(tripModel.create(tripData)).rejects.toThrow(/FK_Viaje_Conductor/);
  });
});

describe('tripModel.findByDriver', () => {
  test('filtra por conductor_id (Int) y cuenta solicitudes pendientes/aceptadas', async () => {
    const rows = [{ id: 1, usuarios_separaron_asiento: 2 }];
    db.queueResult({ recordset: rows });

    const result = await tripModel.findByDriver(2);

    expect(result).toBe(rows);
    expect(db.requests[0].inputs.conductor_id).toEqual({ type: { name: 'Int' }, value: 2 });
    expect(db.requests[0].text).toMatch(/sv\.estado IN \('pendiente', 'aceptada'\)/);
  });
});

describe('tripModel.book', () => {
  const openTrip = (overrides = {}) => ({
    id: 10,
    conductor_id: 2,
    fecha_salida: future(),
    cupo_disponible: 3,
    estado: 'programado',
    ...overrides,
  });

  const expectRolledBackWithoutInsert = () => {
    expect(db.lastTransaction).toMatchObject({ begun: true, committed: false, rolledBack: true });
    expect(db.requests.some((r) => /INSERT INTO SolicitudesViaje/.test(r.text))).toBe(false);
  };

  test('lanza 404 si el viaje no existe', async () => {
    db.queueResult({ recordset: [] });

    await expect(tripModel.book(10, 1)).rejects.toMatchObject({
      statusCode: 404,
      message: 'El viaje solicitado no existe.',
    });
    expectRolledBackWithoutInsert();
  });

  test.each(['cancelado', 'finalizado', 'en_curso'])(
    "lanza 400 si el viaje está en estado '%s'",
    async (estado) => {
      db.queueResult({ recordset: [openTrip({ estado })] });

      await expect(tripModel.book(10, 1)).rejects.toMatchObject({
        statusCode: 400,
        message: 'El viaje no está disponible para reservaciones.',
      });
      expectRolledBackWithoutInsert();
    }
  );

  test('lanza 400 si el viaje no tiene estado', async () => {
    db.queueResult({ recordset: [openTrip({ estado: null })] });

    await expect(tripModel.book(10, 1)).rejects.toMatchObject({ statusCode: 400 });
    expectRolledBackWithoutInsert();
  });

  test('lanza 400 si la fecha de salida ya pasó', async () => {
    db.queueResult({ recordset: [openTrip({ fecha_salida: past() })] });

    await expect(tripModel.book(10, 1)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/ya ha transcurrido/),
    });
    expectRolledBackWithoutInsert();
  });

  test('lanza 400 si el pasajero es el conductor del viaje', async () => {
    db.queueResult({ recordset: [openTrip({ conductor_id: 1 })] });

    await expect(tripModel.book(10, 1)).rejects.toMatchObject({
      statusCode: 400,
      message: 'No puedes reservar tu propio viaje como conductor.',
    });
    expectRolledBackWithoutInsert();
  });

  test.each([0, -1])('lanza 409 si el cupo es %i', async (cupo) => {
    db.queueResult({ recordset: [openTrip({ cupo_disponible: cupo })] });

    await expect(tripModel.book(10, 1)).rejects.toMatchObject({
      statusCode: 409,
      message: 'El cupo para este viaje se encuentra agotado.',
    });
    expectRolledBackWithoutInsert();
  });

  test('lanza 409 si el pasajero ya tiene una reservación activa', async () => {
    db.queueResult({ recordset: [openTrip()] });
    db.queueResult({ recordset: [{ id: 77 }] });

    await expect(tripModel.book(10, 1)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Ya tienes una reservación activa para este viaje.',
    });
    expectRolledBackWithoutInsert();
  });

  test('acepta el estado sin distinguir mayúsculas', async () => {
    db.queueResult({ recordset: [openTrip({ estado: 'ACTIVO' })] });
    db.queueResult({ recordset: [] });
    db.queueResult({ recordset: [{ id: 1, estado: 'pendiente' }] });

    await expect(tripModel.book(10, 1)).resolves.toMatchObject({ id: 1 });
  });

  test("registra la solicitud como 'pendiente' sin descontar cupo y confirma la transacción", async () => {
    const solicitud = {
      id: 55,
      viaje_id: 10,
      pasajero_id: 1,
      estado: 'pendiente',
      fecha_solicitud: new Date(),
    };
    db.queueResult({ recordset: [openTrip({ cupo_disponible: 3 })] });
    db.queueResult({ recordset: [] });
    db.queueResult({ recordset: [solicitud] });

    const result = await tripModel.book(10, 1);

    expect(result).toEqual({ ...solicitud, asientos_restantes: 3 });
    expect(db.lastTransaction).toMatchObject({ begun: true, committed: true, rolledBack: false });
    expect(db.requests).toHaveLength(3);
    expect(db.requests[2].text).toMatch(/INSERT INTO SolicitudesViaje/);
    expect(db.requests[2].text).toMatch(/'pendiente'/);
    expect(db.valuesOf(db.requests[2])).toEqual({ tripId: 10, passengerId: 1 });
    expect(db.requests.some((r) => /UPDATE Viajes/.test(r.text))).toBe(false);
  });

  test('hace rollback y relanza el error si falla el INSERT', async () => {
    db.queueResult({ recordset: [openTrip()] });
    db.queueResult({ recordset: [] });
    db.queueResult(new Error('deadlock'));

    await expect(tripModel.book(10, 1)).rejects.toThrow('deadlock');
    expect(db.lastTransaction).toMatchObject({ committed: false, rolledBack: true });
  });
});
