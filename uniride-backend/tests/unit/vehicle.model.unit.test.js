/**
 * Pruebas unitarias del modelo Vehicle (models/vehicleModel.js).
 * Issue #71: Pruebas unitarias de modelos (User, Trip, Reservation, Vehicle).
 */

jest.mock('../../config/db', () => require('../helpers/mockDb').module);

const db = require('../helpers/mockDb');
const vehicleModel = require('../../models/vehicleModel');

const vehicleData = {
  usuario_id: 2,
  marca: 'Toyota',
  modelo: 'Corolla',
  anio: 2021,
  color: 'Gris',
  placa: 'TOY-123',
  asientos_disponibles: 4,
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe('vehicleModel - consultas', () => {
  test('findByPlaca envía la placa como VarChar(20) y devuelve el primer registro', async () => {
    const row = { id: 1, placa: 'TOY-123' };
    db.queueResult({ recordset: [row, { id: 2 }] });

    await expect(vehicleModel.findByPlaca('TOY-123')).resolves.toBe(row);
    expect(db.requests[0].inputs.placa).toEqual({
      type: { name: 'VarChar', length: 20 },
      value: 'TOY-123',
    });
  });

  test('findByPlaca devuelve null si no hay coincidencia', async () => {
    db.queueResult({ recordset: [] });

    await expect(vehicleModel.findByPlaca('XXX-000')).resolves.toBeNull();
  });

  test('findById envía el id como Int y devuelve null si no existe', async () => {
    db.queueResult({ recordset: [] });

    await expect(vehicleModel.findById(99)).resolves.toBeNull();
    expect(db.requests[0].inputs.id).toEqual({ type: { name: 'Int' }, value: 99 });
  });

  test('findById devuelve el vehículo encontrado', async () => {
    const row = { id: 1, placa: 'TOY-123' };
    db.queueResult({ recordset: [row] });

    await expect(vehicleModel.findById(1)).resolves.toBe(row);
  });

  test('findByUserId devuelve todos los vehículos del usuario (relación 1:N)', async () => {
    const rows = [{ id: 1, usuario_id: 2 }, { id: 2, usuario_id: 2 }];
    db.queueResult({ recordset: rows });

    await expect(vehicleModel.findByUserId(2)).resolves.toBe(rows);
    expect(db.requests[0].inputs.usuario_id).toEqual({ type: { name: 'Int' }, value: 2 });
    expect(db.requests[0].text).toMatch(/WHERE usuario_id = @usuario_id/);
  });

  test('findByUserId devuelve arreglo vacío si el usuario no tiene vehículos', async () => {
    db.queueResult({ recordset: [] });

    await expect(vehicleModel.findByUserId(2)).resolves.toEqual([]);
  });
});

describe('vehicleModel.create', () => {
  test('usa los tipos y longitudes definidos en el esquema', async () => {
    db.queueResult({ recordset: [] }); // INSERT
    db.queueResult({ recordset: [{ id: 5 }] }); // findByPlaca

    await vehicleModel.create(vehicleData);

    const { inputs } = db.requests[0];
    expect(inputs.usuario_id.type).toEqual({ name: 'Int' });
    expect(inputs.marca.type).toEqual({ name: 'VarChar', length: 50 });
    expect(inputs.modelo.type).toEqual({ name: 'VarChar', length: 50 });
    expect(inputs.anio.type).toEqual({ name: 'Int' });
    expect(inputs.color.type).toEqual({ name: 'VarChar', length: 30 });
    expect(inputs.placa.type).toEqual({ name: 'VarChar', length: 20 });
    expect(inputs.asientos_disponibles.type).toEqual({ name: 'Int' });
  });

  test('inserta todos los campos obligatorios y asocia el vehículo al usuario', async () => {
    db.queueResult({ recordset: [] });
    db.queueResult({ recordset: [{ id: 5 }] });

    await vehicleModel.create(vehicleData);

    expect(db.valuesOf(db.requests[0])).toEqual(vehicleData);
    expect(db.requests[0].text).toMatch(/INSERT INTO vehiculos/i);
  });

  test('devuelve el vehículo recuperado por placa después del INSERT', async () => {
    const created = { id: 5, ...vehicleData };
    db.queueResult({ recordset: [] });
    db.queueResult({ recordset: [created] });

    const result = await vehicleModel.create(vehicleData);

    expect(result).toBe(created);
    expect(db.requests).toHaveLength(2);
    expect(db.requests[1].inputs.placa.value).toBe('TOY-123');
  });

  test('propaga el error del INSERT (p. ej. placa duplicada UNIQUE) sin consultar de nuevo', async () => {
    db.queueResult(new Error('Violation of UNIQUE KEY constraint on placa'));

    await expect(vehicleModel.create(vehicleData)).rejects.toThrow(/UNIQUE KEY/);
    expect(db.requests).toHaveLength(1);
  });
});

describe('vehicleModel.update', () => {
  const changes = {
    marca: 'Honda',
    modelo: 'Civic',
    anio: 2022,
    color: 'Negro',
    placa: 'HON-456',
    asientos_disponibles: 5,
  };

  test('actualiza los campos editables con sus tipos y no toca usuario_id', async () => {
    const updated = { id: 5, ...changes };
    jest.spyOn(vehicleModel, 'findById').mockResolvedValue(updated);

    const result = await vehicleModel.update(5, changes);

    const { inputs, text } = db.requests[0];
    expect(db.valuesOf(db.requests[0])).toEqual({ id: 5, ...changes });
    expect(inputs.marca.type).toEqual({ name: 'VarChar', length: 50 });
    expect(inputs.color.type).toEqual({ name: 'VarChar', length: 30 });
    expect(inputs.placa.type).toEqual({ name: 'VarChar', length: 20 });
    expect(text).not.toMatch(/usuario_id\s*=/);
    expect(vehicleModel.findById).toHaveBeenCalledWith(5);
    expect(result).toBe(updated);
  });
});

describe('vehicleModel.updateStatus', () => {
  test('envía activo como Bit y devuelve el vehículo actualizado', async () => {
    const updated = { id: 5, activo: false };
    jest.spyOn(vehicleModel, 'findById').mockResolvedValue(updated);

    const result = await vehicleModel.updateStatus(5, false);

    expect(db.requests[0].inputs.activo).toEqual({ type: { name: 'Bit' }, value: false });
    expect(db.requests[0].inputs.id.value).toBe(5);
    expect(result).toBe(updated);
  });
});

describe('vehicleModel.remove', () => {
  test('elimina por id y no devuelve valor', async () => {
    await expect(vehicleModel.remove(5)).resolves.toBeUndefined();

    expect(db.requests[0].text).toMatch(/DELETE FROM vehiculos/i);
    expect(db.requests[0].inputs.id).toEqual({ type: { name: 'Int' }, value: 5 });
  });

  test('propaga el error si el vehículo tiene viajes asociados (FK)', async () => {
    db.queueResult(new Error('The DELETE statement conflicted with the REFERENCE constraint'));

    await expect(vehicleModel.remove(5)).rejects.toThrow(/REFERENCE constraint/);
  });
});
