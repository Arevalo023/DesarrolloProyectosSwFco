/**
 * Doble de prueba para `config/db` (mssql).
 *
 * Los modelos de UniRide usan SQL escrito a mano con `mssql`, por lo que las
 * pruebas unitarias no necesitan una base de datos real: este helper simula
 * el pool, los requests y las transacciones, y registra cada consulta con sus
 * inputs (nombre, tipo SQL y valor) para poder verificar tipos, longitudes y
 * reglas de negocio.
 *
 * Uso en un test:
 *   jest.mock('../../config/db', () => require('../helpers/mockDb').module);
 *   const db = require('../helpers/mockDb');
 *   db.queueResult({ recordset: [...] });   // respuesta de la siguiente query
 *   db.queueResult(new Error('boom'));      // la siguiente query lanza
 */

const sql = {
  VarChar: (length) => ({ name: 'VarChar', length }),
  Decimal: (precision, scale) => ({ name: 'Decimal', precision, scale }),
  Int: { name: 'Int' },
  Bit: { name: 'Bit' },
  Date: { name: 'Date' },
  DateTime: { name: 'DateTime' },
};

const state = {
  requests: [], // { text, inputs: { [name]: { type, value } } } en orden de ejecución
  results: [], // cola de respuestas para las queries
  transactions: [], // una entrada por transacción creada
};

const EMPTY_RESULT = { recordset: [], rowsAffected: [0] };

const createRequest = () => {
  const inputs = {};
  const request = {
    input(name, type, value) {
      inputs[name] = { type, value };
      return request;
    },
    async query(text) {
      state.requests.push({ text, inputs: { ...inputs } });
      const next = state.results.length ? state.results.shift() : EMPTY_RESULT;
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return request;
};

class Transaction {
  constructor() {
    this.record = { begun: false, committed: false, rolledBack: false };
    state.transactions.push(this.record);
  }
  async begin() {
    this.record.begun = true;
  }
  async commit() {
    this.record.committed = true;
  }
  async rollback() {
    this.record.rolledBack = true;
  }
  request() {
    return createRequest();
  }
}

const pool = { request: createRequest };

sql.Transaction = Transaction;

module.exports = {
  /** Valor que debe devolver el factory de jest.mock('../../config/db'). */
  module: { sql, poolPromise: Promise.resolve(pool) },
  sql,

  /** Encola la respuesta de la siguiente query (o un Error para que lance). */
  queueResult(result) {
    state.results.push(result);
  },

  /** Limpia consultas, respuestas y transacciones registradas. */
  reset() {
    state.requests.length = 0;
    state.results.length = 0;
    state.transactions.length = 0;
  },

  /** Consultas ejecutadas hasta ahora, en orden. */
  get requests() {
    return state.requests;
  },

  /** Última transacción creada (o undefined). */
  get lastTransaction() {
    return state.transactions[state.transactions.length - 1];
  },

  /** Valores planos de los inputs de una query: { nombre: valor }. */
  valuesOf(requestEntry) {
    return Object.fromEntries(
      Object.entries(requestEntry.inputs).map(([k, v]) => [k, v.value])
    );
  },
};
