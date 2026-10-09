/**
 * Contrato modelos <-> esquema SQL (database/uniride.sql).
 * Issue #71: restricciones e integridad de los modelos de datos.
 *
 * Los modelos no validan en JS (usan SQL a mano), así que la integridad la
 * define el esquema. Estas pruebas leen uniride.sql y comprueban que:
 *  - los tipos/longitudes que cada modelo envía coinciden con la columna,
 *  - cada columna NOT NULL sin default recibe valor en el INSERT del modelo,
 *  - las relaciones (FK) y restricciones UNIQUE entre User, Trip,
 *    Reservation y Vehicle existen en el esquema.
 */

const fs = require('fs');
const path = require('path');

jest.mock('../../config/db', () => require('../helpers/mockDb').module);

const db = require('../helpers/mockDb');
const userModel = require('../../models/userModel');
const vehicleModel = require('../../models/vehicleModel');
const tripModel = require('../../models/tripModel');

const schemaSql = fs.readFileSync(
  path.join(__dirname, '../../../database/uniride.sql'),
  'utf8'
);

/** { Tabla: { columna: { type, length, precision, scale, notNull, unique, hasDefault, identity } } } */
const parseTables = (sqlText) => {
  const tables = {};
  const tableRe = /CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\n\s*\);/g;
  let match;
  while ((match = tableRe.exec(sqlText))) {
    const [, tableName, body] = match;
    const columns = {};
    for (const rawLine of body.split('\n')) {
      const line = rawLine.replace(/--.*$/, '').trim().replace(/,$/, '');
      if (!line || /^CONSTRAINT/i.test(line)) continue;
      const col = line.match(
        /^(\w+)\s+(INT|BIT|DATETIME|DATE|VARCHAR\((\d+)\)|DECIMAL\((\d+),\s*(\d+)\))(?=\s|$)(.*)$/i
      );
      if (!col) continue;
      const [, name, rawType, varcharLen, precision, scale, rest] = col;
      columns[name] = {
        type: rawType.split('(')[0].toUpperCase(),
        length: varcharLen ? Number(varcharLen) : undefined,
        precision: precision ? Number(precision) : undefined,
        scale: scale ? Number(scale) : undefined,
        notNull: /NOT NULL/i.test(rest) || /PRIMARY KEY/i.test(rest),
        unique: /\bUNIQUE\b/i.test(rest),
        hasDefault: /DEFAULT/i.test(rest),
        identity: /IDENTITY/i.test(rest),
      };
    }
    tables[tableName] = columns;
  }
  return tables;
};

/** [{ table, column, refTable, refColumn }] */
const parseForeignKeys = (sqlText) => {
  const fks = [];
  const re =
    /ALTER TABLE\s+(\w+)\s+ADD CONSTRAINT\s+\w+\s+FOREIGN KEY\s*\((\w+)\)\s+REFERENCES\s+(\w+)\((\w+)\)/gi;
  let match;
  while ((match = re.exec(sqlText))) {
    fks.push({ table: match[1], column: match[2], refTable: match[3], refColumn: match[4] });
  }
  return fks;
};

const tables = parseTables(schemaSql);
const foreignKeys = parseForeignKeys(schemaSql);

/** Tipo del esquema -> descripción del tipo que usa el modelo (mockDb.sql). */
const expectedModelType = (col) => {
  switch (col.type) {
    case 'INT':
      return { name: 'Int' };
    case 'BIT':
      return { name: 'Bit' };
    case 'DATETIME':
      return { name: 'DateTime' };
    case 'VARCHAR':
      return { name: 'VarChar', length: col.length };
    case 'DECIMAL':
      return { name: 'Decimal', precision: col.precision, scale: col.scale };
    default:
      throw new Error(`Tipo no soportado en el test: ${col.type}`);
  }
};

/** Columnas obligatorias que el INSERT del modelo debe llenar (sin default ni identity). */
const requiredColumns = (table) =>
  Object.entries(tables[table])
    .filter(([, c]) => c.notNull && !c.hasDefault && !c.identity)
    .map(([name]) => name);

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe('esquema: el parser encuentra las tablas esperadas', () => {
  test.each(['Usuarios', 'Vehiculos', 'Viajes', 'SolicitudesViaje'])(
    'tabla %s con columnas',
    (table) => {
      expect(tables[table]).toBeDefined();
      expect(Object.keys(tables[table]).length).toBeGreaterThan(2);
    }
  );
});

describe('restricciones UNIQUE', () => {
  test('Usuarios.correo es único', () => {
    expect(tables.Usuarios.correo.unique).toBe(true);
  });

  test('Vehiculos.placa es única', () => {
    expect(tables.Vehiculos.placa.unique).toBe(true);
  });
});

describe('relaciones (llaves foráneas)', () => {
  test.each([
    ['Usuarios', 'campus_id', 'Campus'],
    ['Usuarios', 'rol_id', 'Roles'],
    ['Vehiculos', 'usuario_id', 'Usuarios'],
    ['Viajes', 'conductor_id', 'Usuarios'],
    ['Viajes', 'vehiculo_id', 'Vehiculos'],
    ['SolicitudesViaje', 'viaje_id', 'Viajes'],
    ['SolicitudesViaje', 'pasajero_id', 'Usuarios'],
  ])('%s.%s referencia a %s(id)', (table, column, refTable) => {
    expect(foreignKeys).toContainEqual({ table, column, refTable, refColumn: 'id' });
  });

  test('las columnas FK son obligatorias (NOT NULL)', () => {
    expect(tables.Usuarios.campus_id.notNull).toBe(true);
    expect(tables.Vehiculos.usuario_id.notNull).toBe(true);
    expect(tables.Viajes.conductor_id.notNull).toBe(true);
    expect(tables.Viajes.vehiculo_id.notNull).toBe(true);
    expect(tables.SolicitudesViaje.viaje_id.notNull).toBe(true);
    expect(tables.SolicitudesViaje.pasajero_id.notNull).toBe(true);
  });
});

describe('User: userModel.create vs Usuarios', () => {
  const input = {
    rol_id: 1,
    campus_id: 3,
    nombre: 'Ana',
    apellido: 'López',
    correo: 'ana@uni.mx',
    password_hash: 'hash',
    telefono: '8112345678',
  };

  test('cada input coincide en tipo y longitud con su columna', async () => {
    db.queueResult({ recordset: [{ id: 1 }] });
    await userModel.create(input);

    for (const [name, { type }] of Object.entries(db.requests[0].inputs)) {
      expect(tables.Usuarios[name]).toBeDefined();
      expect(type).toEqual(expectedModelType(tables.Usuarios[name]));
    }
  });

  test('envía todas las columnas obligatorias del esquema', async () => {
    db.queueResult({ recordset: [{ id: 1 }] });
    await userModel.create(input);

    const sent = Object.keys(db.requests[0].inputs);
    for (const column of requiredColumns('Usuarios')) {
      expect(sent).toContain(column);
    }
  });

  test('telefono es la única columna opcional que el modelo envía', () => {
    expect(tables.Usuarios.telefono.notNull).toBe(false);
  });
});

describe('Vehicle: vehicleModel.create vs Vehiculos', () => {
  const input = {
    usuario_id: 2,
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: 2021,
    color: 'Gris',
    placa: 'TOY-123',
    asientos_disponibles: 4,
  };

  test('cada input coincide en tipo y longitud con su columna', async () => {
    await vehicleModel.create(input);

    for (const [name, { type }] of Object.entries(db.requests[0].inputs)) {
      expect(tables.Vehiculos[name]).toBeDefined();
      expect(type).toEqual(expectedModelType(tables.Vehiculos[name]));
    }
  });

  test('envía todas las columnas obligatorias sin default', async () => {
    await vehicleModel.create(input);

    const sent = Object.keys(db.requests[0].inputs);
    for (const column of requiredColumns('Vehiculos')) {
      expect(sent).toContain(column);
    }
  });

  test('updateStatus usa un tipo compatible con la columna activo (BIT)', async () => {
    jest.spyOn(vehicleModel, 'findById').mockResolvedValue(null);
    await vehicleModel.updateStatus(1, true);

    expect(db.requests[0].inputs.activo.type).toEqual(expectedModelType(tables.Vehiculos.activo));
  });
});

describe('Trip: tripModel.create vs Viajes', () => {
  const input = {
    conductor_id: 2,
    vehiculo_id: 5,
    origen: 'Centro',
    destino: 'Campus',
    fecha_salida: '2026-12-01T08:00:00',
    cupo_disponible: 3,
    costo_por_pasajero: 25,
  };

  test('cada input coincide en tipo, longitud y precisión con su columna', async () => {
    db.queueResult({ recordset: [{ id: 9 }] });
    jest.spyOn(tripModel, 'findById').mockResolvedValue({ id: 9 });
    await tripModel.create(input);

    for (const [name, { type }] of Object.entries(db.requests[0].inputs)) {
      expect(tables.Viajes[name]).toBeDefined();
      expect(type).toEqual(expectedModelType(tables.Viajes[name]));
    }
  });

  test('envía todas las columnas obligatorias sin default (estado va fijo en el SQL)', async () => {
    db.queueResult({ recordset: [{ id: 9 }] });
    jest.spyOn(tripModel, 'findById').mockResolvedValue({ id: 9 });
    await tripModel.create(input);

    const sent = Object.keys(db.requests[0].inputs);
    for (const column of requiredColumns('Viajes')) {
      expect(sent).toContain(column);
    }
    expect(tables.Viajes.estado.hasDefault).toBe(true);
  });
});

describe('Reservation: tripModel.book vs SolicitudesViaje', () => {
  test('el INSERT llena las columnas obligatorias sin default (viaje_id, pasajero_id)', async () => {
    db.queueResult({
      recordset: [
        { id: 10, conductor_id: 2, fecha_salida: new Date(Date.now() + 86400000), cupo_disponible: 2, estado: 'activo' },
      ],
    });
    db.queueResult({ recordset: [] });
    db.queueResult({ recordset: [{ id: 1 }] });

    await tripModel.book(10, 1);

    const insert = db.requests.find((r) => /INSERT INTO SolicitudesViaje/.test(r.text));
    const insertedColumns = insert.text
      .match(/INSERT INTO SolicitudesViaje\s*\(([^)]*)\)/)[1]
      .split(',')
      .map((c) => c.trim());

    for (const column of requiredColumns('SolicitudesViaje')) {
      expect(insertedColumns).toContain(column);
    }
    for (const column of insertedColumns) {
      expect(tables.SolicitudesViaje[column]).toBeDefined();
    }
  });

  test('estado y fecha_solicitud tienen valor por defecto en el esquema', () => {
    expect(tables.SolicitudesViaje.estado.hasDefault).toBe(true);
    expect(tables.SolicitudesViaje.fecha_solicitud.hasDefault).toBe(true);
  });
});
