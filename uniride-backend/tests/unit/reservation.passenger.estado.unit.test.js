/**
 * Issue #102: separar viajes activos de históricos para el pasajero
 * (GET /api/trips/reservations y su alias GET /api/reservations).
 * Usa el mismo vocabulario que GET /api/trips/driver: ?estado= y ?classified=true.
 * Ejercita controlador -> servicio -> modelo con la BD simulada (mockDb).
 */

jest.mock('../../config/db', () => require('../helpers/mockDb').module);
jest.mock('../../services/notificationService', () => ({}));

const db = require('../helpers/mockDb');
const reservationModel = require('../../models/reservationModel');
const reservationService = require('../../services/reservationService');
const tripController = require('../../controllers/tripController');
const reservationController = require('../../controllers/reservationController');

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe('reservationModel.findByPassenger con ?estado=', () => {
  test('sin estado no agrega ningún filtro de estado (comportamiento previo)', async () => {
    await reservationModel.findByPassenger(1);

    expect(db.requests[0].text).not.toMatch(/sv\.estado, ''\)\)/);
    expect(db.requests[0].text).not.toMatch(/v\.estado, ''\)\)/);
  });

  test("'activos': reservación pendiente/aceptada en un viaje vigente", async () => {
    await reservationModel.findByPassenger(1, { estado: 'activos' });

    expect(db.requests[0].text).toContain("LOWER(COALESCE(sv.estado, '')) IN ('pendiente', 'aceptada')");
    expect(db.requests[0].text).toContain("LOWER(COALESCE(v.estado, '')) IN ('programado', 'en_curso', 'activo')");
  });

  test("'cancelados': reservación cancelada o viaje cancelado, nunca las rechazadas", async () => {
    await reservationModel.findByPassenger(1, { estado: 'cancelados' });

    const { text } = db.requests[0];
    expect(text).toContain("LOWER(COALESCE(sv.estado, '')) <> 'rechazada'");
    expect(text).toContain("LOWER(COALESCE(sv.estado, '')) = 'cancelada'");
    expect(text).toContain("LOWER(COALESCE(v.estado, '')) = 'cancelado'");
  });

  test("'completados': reservación aceptada en un viaje finalizado", async () => {
    await reservationModel.findByPassenger(1, { estado: 'completados' });

    expect(db.requests[0].text).toContain(
      "LOWER(COALESCE(sv.estado, '')) = 'aceptada' AND LOWER(COALESCE(v.estado, '')) = 'finalizado'"
    );
  });

  test("'historial' es la negación exacta de 'activos'", async () => {
    await reservationModel.findByPassenger(1, { estado: 'activos' });
    await reservationModel.findByPassenger(1, { estado: 'historial' });

    const condicion = (text) => text.split('@passengerId')[1].split('ORDER BY')[0].trim().replace(/^AND /, '');
    const activos = condicion(db.requests[0].text);
    const historial = condicion(db.requests[1].text);
    expect(historial).toBe(`(NOT ${activos})`);
  });

  test.each([
    ['activo', 'activos'],
    ['cancelado', 'cancelados'],
    ['completado', 'completados'],
    ['finalizado', 'completados'],
    ['finalizados', 'completados'],
    [' HISTORIAL ', 'historial'],
    ['Activos', 'activos'],
  ])('acepta el alias %p como %p', (alias, canonico) => {
    expect(reservationModel.categoriaEstadoPasajero(alias)).toBe(canonico);
  });

  test.each(['todos', 'programado', 'pendiente', 'constructor', '__proto__', "'; DROP TABLE Viajes; --"])(
    'lanza 400 y no consulta la BD con el estado inválido %p',
    async (estado) => {
      await expect(reservationModel.findByPassenger(1, { estado })).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('activos, cancelados, completados, historial'),
      });
      expect(db.requests).toHaveLength(0);
    }
  );

  test('estado vacío o null se trata como sin filtro', async () => {
    await reservationModel.findByPassenger(1, { estado: '  ' });
    await reservationModel.findByPassenger(1, { estado: null });

    expect(db.requests).toHaveLength(2);
    expect(db.requests[0].text).not.toMatch(/COALESCE\(sv\.estado/);
  });

  test('el filtro convive con el orden: order=desc sigue aplicando', async () => {
    await reservationModel.findByPassenger(1, { estado: 'historial', order: 'desc' });

    expect(db.requests[0].text).toMatch(/ORDER BY v\.fecha_salida DESC/);
  });

  test('el SQL nunca incluye texto del cliente (solo constantes)', async () => {
    await reservationModel.findByPassenger(1, { estado: 'cancelados' });

    expect(db.requests[0].text).not.toMatch(/DROP TABLE/);
    expect(Object.keys(db.requests[0].inputs)).toEqual(['passengerId']);
  });
});

describe('reservationService.classifyReservationsByStatus', () => {
  // [estado de la reservación, estado del viaje, bucket esperado]
  const casos = [
    ['pendiente', 'programado', 'activos'],
    ['pendiente', 'activo', 'activos'],
    ['pendiente', 'en_curso', 'activos'],
    ['aceptada', 'programado', 'activos'],
    ['aceptada', 'en_curso', 'activos'],
    ['pendiente', 'finalizado', 'no_aceptadas'],
    ['pendiente', 'cancelado', 'cancelados'],
    ['aceptada', 'finalizado', 'completados'],
    ['aceptada', 'cancelado', 'cancelados'],
    ['rechazada', 'programado', 'no_aceptadas'],
    ['rechazada', 'en_curso', 'no_aceptadas'],
    ['rechazada', 'finalizado', 'no_aceptadas'],
    ['rechazada', 'cancelado', 'no_aceptadas'],
    ['cancelada', 'programado', 'cancelados'],
    ['cancelada', 'en_curso', 'cancelados'],
    ['cancelada', 'finalizado', 'cancelados'],
    ['cancelada', 'cancelado', 'cancelados'],
  ];

  test.each(casos)('reservación %s en viaje %s -> %s', (estado, viaje_estado, bucket) => {
    const reservation = { id: 1, estado, viaje_estado };

    const result = reservationService.classifyReservationsByStatus([reservation]);

    expect(result[bucket]).toEqual([reservation]);
    const total = Object.values(result).reduce((n, list) => n + list.length, 0);
    expect(total).toBe(1);
  });

  test('es tolerante a mayúsculas, espacios y valores nulos, sin perder reservaciones', () => {
    const rows = [
      { id: 1, estado: ' ACEPTADA ', viaje_estado: 'Finalizado' },
      { id: 2, estado: null, viaje_estado: null },
      { id: 3, estado: 'Pendiente', viaje_estado: 'PROGRAMADO' },
    ];

    const result = reservationService.classifyReservationsByStatus(rows);

    expect(result.completados.map((r) => r.id)).toEqual([1]);
    expect(result.activos.map((r) => r.id)).toEqual([3]);
    expect(result.no_aceptadas.map((r) => r.id)).toEqual([2]);
  });

  test('devuelve los cuatro buckets vacíos sin reservaciones o con entrada inválida', () => {
    const vacio = { activos: [], cancelados: [], completados: [], no_aceptadas: [] };

    expect(reservationService.classifyReservationsByStatus([])).toEqual(vacio);
    expect(reservationService.classifyReservationsByStatus(undefined)).toEqual(vacio);
    expect(reservationService.classifyReservationsByStatus(null)).toEqual(vacio);
  });
});

describe('reservationService.listByPassenger', () => {
  test('rechaza un estado que no sea texto (p. ej. ?estado=a&estado=b)', async () => {
    await expect(
      reservationService.listByPassenger(1, { estado: ['activos', 'historial'] })
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/único valor de texto/) });
    expect(db.requests).toHaveLength(0);
  });

  test('con classified=true clasifica lo que devuelve la BD', async () => {
    db.queueResult({
      recordset: [
        { id: 1, estado: 'aceptada', viaje_estado: 'programado' },
        { id: 2, estado: 'rechazada', viaje_estado: 'programado' },
      ],
    });

    const result = await reservationService.listByPassenger(1, { classified: true });

    expect(result.activos.map((r) => r.id)).toEqual([1]);
    expect(result.no_aceptadas.map((r) => r.id)).toEqual([2]);
  });
});

describe.each([
  ['GET /api/trips/reservations', (req, res) => tripController.listReservations(req, res)],
  ['GET /api/reservations', (req, res) => reservationController.listMyReservations(req, res)],
])('%s', (_name, handler) => {
  const call = async (query) => {
    const res = createMockRes();
    await handler({ user: { id: 4 }, query }, res);
    return res;
  };

  test('sin parámetros responde { reservations } con todas, igual que antes', async () => {
    const rows = [{ id: 1, estado: 'cancelada', viaje_estado: 'programado' }];
    db.queueResult({ recordset: rows });

    const res = await call({});

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ reservations: rows });
    expect(db.valuesOf(db.requests[0]).passengerId).toBe(4);
    expect(db.requests[0].text).not.toMatch(/COALESCE\(sv\.estado/);
  });

  test.each(['activos', 'cancelados', 'completados', 'historial'])(
    '?estado=%s filtra y responde { reservations }',
    async (estado) => {
      db.queueResult({ recordset: [] });

      const res = await call({ estado });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ reservations: [] });
      expect(db.requests[0].text).toMatch(/COALESCE\(sv\.estado/);
    }
  );

  test('?classified=true responde los buckets directamente (igual que el conductor)', async () => {
    db.queueResult({
      recordset: [
        { id: 1, estado: 'pendiente', viaje_estado: 'programado' },
        { id: 2, estado: 'aceptada', viaje_estado: 'finalizado' },
        { id: 3, estado: 'cancelada', viaje_estado: 'programado' },
        { id: 4, estado: 'rechazada', viaje_estado: 'programado' },
      ],
    });

    const res = await call({ classified: 'true' });

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(Object.keys(body)).toEqual(['activos', 'cancelados', 'completados', 'no_aceptadas']);
    expect(body.activos.map((r) => r.id)).toEqual([1]);
    expect(body.completados.map((r) => r.id)).toEqual([2]);
    expect(body.cancelados.map((r) => r.id)).toEqual([3]);
    expect(body.no_aceptadas.map((r) => r.id)).toEqual([4]);
  });

  test('?classified=1 equivale a true y devuelve los cuatro buckets vacíos sin datos', async () => {
    db.queueResult({ recordset: [] });

    const res = await call({ classified: '1' });

    expect(res.json).toHaveBeenCalledWith({
      activos: [], cancelados: [], completados: [], no_aceptadas: [],
    });
  });

  test('order explícito se respeta junto con estado', async () => {
    db.queueResult({ recordset: [] });

    await call({ estado: 'historial', order: 'desc' });

    expect(db.requests[0].text).toMatch(/ORDER BY v\.fecha_salida DESC/);
  });

  test.each(['todos', 'programado'])('?estado=%s inválido responde 400', async (estado) => {
    const res = await call({ estado });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/activos, cancelados, completados, historial/);
    expect(db.requests).toHaveLength(0);
  });

  test('?estado repetido (arreglo) responde 400', async () => {
    const res = await call({ estado: ['activos', 'historial'] });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.requests).toHaveLength(0);
  });

  test('un error de BD responde 500 con el mensaje del error', async () => {
    db.queueResult(new Error('connection lost'));

    const res = await call({ estado: 'activos' });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'connection lost' });
  });
});
