/**
 * Issue #102: historial del conductor. Extiende el filtro ?estado= de GET /api/trips/driver
 * con la categoría "historial" (viajes cancelados y finalizados).
 */

jest.mock('../../config/db', () => require('../helpers/mockDb').module);
jest.mock('../../services/reservationService', () => ({}));
jest.mock('../../services/notificationService', () => ({}));

const db = require('../helpers/mockDb');
const tripModel = require('../../models/tripModel');
const tripController = require('../../controllers/tripController');

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

describe('tripModel.findByDriver con estado=historial', () => {
  test("filtra los viajes cancelados y finalizados", async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findByDriver(12, { estado: 'historial' });

    expect(db.requests[0].text).toMatch(/AND LOWER\(v\.estado\) IN \('cancelado', 'finalizado'\)/);
  });

  test("es insensible a mayúsculas y espacios", async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findByDriver(12, { estado: ' Historial ' });

    expect(db.requests[0].text).toMatch(/IN \('cancelado', 'finalizado'\)/);
  });

  test("no comparte ningún estado con 'activos'", async () => {
    db.queueResult({ recordset: [] });
    db.queueResult({ recordset: [] });

    await tripModel.findByDriver(12, { estado: 'activos' });
    await tripModel.findByDriver(12, { estado: 'historial' });

    const estados = (text) => text.match(/LOWER\(v\.estado\) IN \(([^)]*)\)/)[1].match(/\w+/g);
    const activos = estados(db.requests[0].text);
    const historial = estados(db.requests[1].text);
    expect(activos.filter((e) => historial.includes(e))).toEqual([]);
    expect([...activos, ...historial].sort()).toEqual(
      ['activo', 'cancelado', 'en_curso', 'finalizado', 'programado']
    );
  });

  test("no se pasa el texto como parámetro (no cae en el filtro de estado puntual)", async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findByDriver(12, { estado: 'historial' });

    expect(db.requests[0].inputs.estadoFiltro).toBeUndefined();
  });
});

describe('GET /api/trips/driver?estado=historial', () => {
  test('responde { trips } con los viajes cerrados', async () => {
    db.queueResult({
      recordset: [
        { id: 4, estado: 'finalizado', vehiculo_id: 3, vehiculo_placa: 'SAL-102' },
        { id: 5, estado: 'cancelado', vehiculo_id: 3, vehiculo_placa: 'SAL-102' },
      ],
    });
    const res = createMockRes();

    await tripController.listByDriver({ user: { id: 12 }, query: { estado: 'historial' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const { trips } = res.json.mock.calls[0][0];
    expect(trips.map((t) => t.estado)).toEqual(['finalizado', 'cancelado']);
    expect(trips[0].vehiculo).toMatchObject({ id: 3, placa: 'SAL-102' });
  });
});
