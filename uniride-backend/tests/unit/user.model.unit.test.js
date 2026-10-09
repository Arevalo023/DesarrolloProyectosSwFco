/**
 * Pruebas unitarias del modelo User (models/userModel.js).
 * Issue #71: Pruebas unitarias de modelos (User, Trip, Reservation, Vehicle).
 *
 * La BD se simula con tests/helpers/mockDb.js; se valida el mapeo de campos,
 * los tipos/longitudes enviados a SQL Server y la lógica propia del modelo
 * (agrupación de roles M:N, rol por defecto y fallback sin UsuariosRoles).
 */

jest.mock('../../config/db', () => require('../helpers/mockDb').module);

const db = require('../helpers/mockDb');
const userModel = require('../../models/userModel');

const baseRow = {
  id: 7,
  legacy_rol_id: 1,
  campus_id: 3,
  nombre: 'Ana',
  apellido: 'López',
  correo: 'ana@uni.mx',
  password_hash: 'hash',
  telefono: '8112345678',
  fecha_registro: new Date('2026-01-01T00:00:00Z'),
  campus_nombre: 'Campus Norte',
  universidad_nombre: 'UANL',
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe('userModel.findByEmail', () => {
  test('envía el correo como VarChar(150)', async () => {
    db.queueResult({ recordset: [] });

    await userModel.findByEmail('ana@uni.mx');

    expect(db.requests).toHaveLength(1);
    expect(db.requests[0].inputs.correo).toEqual({
      type: { name: 'VarChar', length: 150 },
      value: 'ana@uni.mx',
    });
  });

  test('devuelve null si no existe el usuario', async () => {
    db.queueResult({ recordset: [] });

    await expect(userModel.findByEmail('nadie@uni.mx')).resolves.toBeNull();
  });

  test('mapea los campos del usuario, campus y universidad', async () => {
    db.queueResult({
      recordset: [{ ...baseRow, rol_id: 1, rol_nombre: 'Pasajero' }],
    });

    const user = await userModel.findByEmail('ana@uni.mx');

    expect(user).toMatchObject({
      id: 7,
      campus_id: 3,
      nombre: 'Ana',
      apellido: 'López',
      correo: 'ana@uni.mx',
      password_hash: 'hash',
      telefono: '8112345678',
      campus_nombre: 'Campus Norte',
      universidad_nombre: 'UANL',
    });
  });

  test('agrupa múltiples filas de UsuariosRoles en roles y roles_detalle', async () => {
    db.queueResult({
      recordset: [
        { ...baseRow, rol_id: 1, rol_nombre: 'Pasajero' },
        { ...baseRow, rol_id: 2, rol_nombre: 'Conductor' },
      ],
    });

    const user = await userModel.findByEmail('ana@uni.mx');

    expect(user.roles).toEqual(['Pasajero', 'Conductor']);
    expect(user.roles_detalle).toEqual([
      { id: 1, nombre: 'Pasajero' },
      { id: 2, nombre: 'Conductor' },
    ]);
  });

  test('no duplica roles repetidos en las filas', async () => {
    db.queueResult({
      recordset: [
        { ...baseRow, rol_id: 2, rol_nombre: 'Conductor' },
        { ...baseRow, rol_id: 2, rol_nombre: 'Conductor' },
      ],
    });

    const user = await userModel.findByEmail('ana@uni.mx');

    expect(user.roles).toEqual(['Conductor']);
    expect(user.roles_detalle).toHaveLength(1);
  });

  test('mantiene retrocompatibilidad: rol_id y rol_nombre salen del primer rol', async () => {
    db.queueResult({
      recordset: [
        { ...baseRow, rol_id: 2, rol_nombre: 'Conductor' },
        { ...baseRow, rol_id: 1, rol_nombre: 'Pasajero' },
      ],
    });

    const user = await userModel.findByEmail('ana@uni.mx');

    expect(user.rol_id).toBe(2);
    expect(user.rol_nombre).toBe('Conductor');
  });

  test('usa el rol legacy de Usuarios.rol_id cuando no hay filas en UsuariosRoles', async () => {
    db.queueResult({
      recordset: [
        {
          ...baseRow,
          rol_id: null,
          rol_nombre: null,
          legacy_rol_id: 2,
          legacy_rol_nombre: 'Conductor',
        },
      ],
    });

    const user = await userModel.findByEmail('ana@uni.mx');

    expect(user.roles).toEqual(['Conductor']);
    expect(user.roles_detalle).toEqual([{ id: 2, nombre: 'Conductor' }]);
  });

  test("asigna 'Pasajero' por defecto si el usuario no tiene ningún rol", async () => {
    db.queueResult({
      recordset: [
        { ...baseRow, rol_id: null, rol_nombre: null, legacy_rol_id: null, legacy_rol_nombre: null },
      ],
    });

    const user = await userModel.findByEmail('ana@uni.mx');

    expect(user.roles).toEqual(['Pasajero']);
    expect(user.roles_detalle).toEqual([{ id: 1, nombre: 'Pasajero' }]);
    expect(user.rol_id).toBe(1);
    expect(user.rol_nombre).toBe('Pasajero');
  });

  test('si falla la consulta M:N usa el fallback sin UsuariosRoles', async () => {
    db.queueResult(new Error("Invalid object name 'UsuariosRoles'"));
    db.queueResult({
      recordset: [{ ...baseRow, rol_id: 2, rol_nombre: 'Conductor' }],
    });

    const user = await userModel.findByEmail('ana@uni.mx');

    expect(db.requests).toHaveLength(2);
    expect(db.requests[1].text).not.toMatch(/UsuariosRoles/);
    expect(user.roles).toEqual(['Conductor']);
    expect(user.roles_detalle).toEqual([{ id: 2, nombre: 'Conductor' }]);
  });

  test("el fallback usa 'Pasajero' si el rol no tiene nombre", async () => {
    db.queueResult(new Error('tabla no migrada'));
    db.queueResult({ recordset: [{ ...baseRow, rol_id: 1, rol_nombre: null }] });

    const user = await userModel.findByEmail('ana@uni.mx');

    expect(user.roles).toEqual(['Pasajero']);
  });

  test('el fallback devuelve null si el usuario no existe', async () => {
    db.queueResult(new Error('tabla no migrada'));
    db.queueResult({ recordset: [] });

    await expect(userModel.findByEmail('nadie@uni.mx')).resolves.toBeNull();
  });
});

describe('userModel.findById', () => {
  test('envía el id como Int', async () => {
    db.queueResult({ recordset: [] });

    await userModel.findById(7);

    expect(db.requests[0].inputs.id).toEqual({ type: { name: 'Int' }, value: 7 });
  });

  test('devuelve null si no existe', async () => {
    db.queueResult({ recordset: [] });

    await expect(userModel.findById(999)).resolves.toBeNull();
  });

  test('devuelve el usuario con todos sus roles', async () => {
    db.queueResult({
      recordset: [
        { ...baseRow, rol_id: 1, rol_nombre: 'Pasajero' },
        { ...baseRow, rol_id: 2, rol_nombre: 'Conductor' },
      ],
    });

    const user = await userModel.findById(7);

    expect(user.id).toBe(7);
    expect(user.roles).toEqual(['Pasajero', 'Conductor']);
  });

  test('usa el fallback si la consulta M:N falla', async () => {
    db.queueResult(new Error('tabla no migrada'));
    db.queueResult({ recordset: [{ ...baseRow, rol_id: 1, rol_nombre: 'Pasajero' }] });

    const user = await userModel.findById(7);

    expect(db.requests).toHaveLength(2);
    expect(user.roles).toEqual(['Pasajero']);
  });

  test('el fallback devuelve null si no existe', async () => {
    db.queueResult(new Error('tabla no migrada'));
    db.queueResult({ recordset: [] });

    await expect(userModel.findById(999)).resolves.toBeNull();
  });
});

describe('userModel.create', () => {
  const newUser = {
    rol_id: 1,
    campus_id: 3,
    nombre: 'Ana',
    apellido: 'López',
    correo: 'ana@uni.mx',
    password_hash: 'hash',
    telefono: '8112345678',
  };

  test('usa los tipos y longitudes definidos en el esquema', async () => {
    db.queueResult({ recordset: [{ id: 10 }] });

    await userModel.create(newUser);

    const { inputs } = db.requests[0];
    expect(inputs.rol_id.type).toEqual({ name: 'Int' });
    expect(inputs.campus_id.type).toEqual({ name: 'Int' });
    expect(inputs.nombre.type).toEqual({ name: 'VarChar', length: 100 });
    expect(inputs.apellido.type).toEqual({ name: 'VarChar', length: 100 });
    expect(inputs.correo.type).toEqual({ name: 'VarChar', length: 150 });
    expect(inputs.password_hash.type).toEqual({ name: 'VarChar', length: 255 });
    expect(inputs.telefono.type).toEqual({ name: 'VarChar', length: 20 });
  });

  test('telefono es opcional y se envía como null', async () => {
    db.queueResult({ recordset: [{ id: 10 }] });
    const { telefono, ...sinTelefono } = newUser;

    await userModel.create(sinTelefono);

    expect(db.requests[0].inputs.telefono.value).toBeNull();
  });

  test.each([
    ['sin rol_id', undefined],
    ['rol_id no numérico', 'abc'],
    ['rol_id 0', 0],
  ])('asigna rol Pasajero (1) por defecto con %s', async (_label, rol) => {
    db.queueResult({ recordset: [{ id: 10 }] });

    await userModel.create({ ...newUser, rol_id: rol });

    expect(db.requests[0].inputs.rol_id.value).toBe(1);
  });

  test('convierte rol_id numérico en string a número', async () => {
    db.queueResult({ recordset: [{ id: 10 }] });

    await userModel.create({ ...newUser, rol_id: '2' });

    expect(db.requests[0].inputs.rol_id.value).toBe(2);
  });

  test('no devuelve password_hash en el OUTPUT del INSERT', async () => {
    db.queueResult({ recordset: [{ id: 10 }] });

    await userModel.create(newUser);

    expect(db.requests[0].text).not.toMatch(/INSERTED\.password_hash/);
  });

  test('devuelve el usuario insertado e inserta el rol inicial en UsuariosRoles', async () => {
    const inserted = { id: 10, rol_id: 1, correo: 'ana@uni.mx' };
    db.queueResult({ recordset: [inserted] });

    const result = await userModel.create(newUser);

    expect(result).toEqual(inserted);
    expect(db.requests).toHaveLength(2);
    expect(db.requests[1].text).toMatch(/INSERT INTO UsuariosRoles/);
    expect(db.valuesOf(db.requests[1])).toEqual({ usuario_id: 10, rol_id: 1 });
  });

  test('no falla si UsuariosRoles no se puede actualizar (solo advierte)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    db.queueResult({ recordset: [{ id: 10 }] });
    db.queueResult(new Error('UsuariosRoles no disponible'));

    await expect(userModel.create(newUser)).resolves.toEqual({ id: 10 });
    expect(warn).toHaveBeenCalled();
  });

  test('propaga el error del INSERT (p. ej. correo duplicado UNIQUE)', async () => {
    db.queueResult(new Error('Violation of UNIQUE KEY constraint on correo'));

    await expect(userModel.create(newUser)).rejects.toThrow(/UNIQUE KEY/);
    expect(db.requests).toHaveLength(1);
  });
});

describe('userModel.findRoleIdByName', () => {
  test('devuelve el id del rol y envía el nombre como VarChar(50)', async () => {
    db.queueResult({ recordset: [{ id: 2 }] });

    await expect(userModel.findRoleIdByName('Conductor')).resolves.toBe(2);
    expect(db.requests[0].inputs.nombre.type).toEqual({ name: 'VarChar', length: 50 });
    expect(db.requests[0].text).toMatch(/LOWER\(nombre\) = LOWER\(@nombre\)/);
  });

  test('devuelve null si el rol no existe', async () => {
    db.queueResult({ recordset: [] });

    await expect(userModel.findRoleIdByName('Inexistente')).resolves.toBeNull();
  });
});

describe('userModel.addRole / removeRole', () => {
  test('addRole inserta de forma idempotente y devuelve el usuario actualizado', async () => {
    const updated = { id: 7, roles: ['Pasajero', 'Conductor'] };
    const findById = jest.spyOn(userModel, 'findById').mockResolvedValue(updated);

    const result = await userModel.addRole(7, 2);

    expect(db.valuesOf(db.requests[0])).toEqual({ usuario_id: 7, rol_id: 2 });
    expect(db.requests[0].text).toMatch(/IF NOT EXISTS/);
    expect(db.requests[0].text).toMatch(/INSERT INTO UsuariosRoles/);
    expect(findById).toHaveBeenCalledWith(7);
    expect(result).toBe(updated);
  });

  test('removeRole elimina la relación y devuelve el usuario actualizado', async () => {
    const updated = { id: 7, roles: ['Pasajero'] };
    const findById = jest.spyOn(userModel, 'findById').mockResolvedValue(updated);

    const result = await userModel.removeRole(7, 2);

    expect(db.valuesOf(db.requests[0])).toEqual({ usuario_id: 7, rol_id: 2 });
    expect(db.requests[0].text).toMatch(/DELETE FROM UsuariosRoles/);
    expect(findById).toHaveBeenCalledWith(7);
    expect(result).toBe(updated);
  });
});

describe('userModel.updateProfile', () => {
  test('actualiza solo los campos editables con sus tipos', async () => {
    const updated = { id: 7, nombre: 'Ana María' };
    jest.spyOn(userModel, 'findById').mockResolvedValue(updated);

    const result = await userModel.updateProfile(7, {
      nombre: 'Ana María',
      apellido: 'López',
      telefono: '8100000000',
      campus_id: 4,
    });

    const { inputs, text } = db.requests[0];
    expect(inputs.id.type).toEqual({ name: 'Int' });
    expect(inputs.nombre.type).toEqual({ name: 'VarChar', length: 100 });
    expect(inputs.apellido.type).toEqual({ name: 'VarChar', length: 100 });
    expect(inputs.telefono.type).toEqual({ name: 'VarChar', length: 20 });
    expect(inputs.campus_id.type).toEqual({ name: 'Int' });
    expect(text).not.toMatch(/correo|password_hash|rol_id/);
    expect(result).toBe(updated);
  });

  test('telefono es opcional y se envía como null', async () => {
    jest.spyOn(userModel, 'findById').mockResolvedValue({ id: 7 });

    await userModel.updateProfile(7, { nombre: 'Ana', apellido: 'López', campus_id: 4 });

    expect(db.requests[0].inputs.telefono.value).toBeNull();
  });
});

describe('userModel.findCampuses', () => {
  test('devuelve la lista de campus con su universidad', async () => {
    const rows = [{ id: 1, campus: 'Norte', universidad: 'UANL' }];
    db.queueResult({ recordset: rows });

    await expect(userModel.findCampuses()).resolves.toBe(rows);
    expect(db.requests[0].text).toMatch(/INNER JOIN Universidades/);
  });
});
