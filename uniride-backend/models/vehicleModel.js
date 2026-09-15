const { sql, poolPromise } = require('../config/db');

const vehicleModel = {
  async findByPlaca(placa) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('placa', sql.VarChar(20), placa)
      .query('SELECT * FROM Vehiculos WHERE placa = @placa');
    return result.recordset[0] || null;
  },

  async findById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Vehiculos WHERE id = @id');
    return result.recordset[0] || null;
  },

  async findByUserId(usuario_id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('usuario_id', sql.Int, usuario_id)
      .query('SELECT * FROM Vehiculos WHERE usuario_id = @usuario_id');
    return result.recordset;
  },

  async create({ usuario_id, marca, modelo, anio, color, placa, asientos_disponibles }) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('usuario_id', sql.Int, usuario_id)
      .input('marca', sql.VarChar(50), marca)
      .input('modelo', sql.VarChar(50), modelo)
      .input('anio', sql.Int, anio)
      .input('color', sql.VarChar(30), color)
      .input('placa', sql.VarChar(20), placa)
      .input('asientos_disponibles', sql.Int, asientos_disponibles)
      .query(`
        INSERT INTO Vehiculos (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles)
        OUTPUT INSERTED.*
        VALUES (@usuario_id, @marca, @modelo, @anio, @color, @placa, @asientos_disponibles);
      `);
    return result.recordset[0];
  },

  async update(id, { marca, modelo, anio, color, placa, asientos_disponibles }) {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .input('marca', sql.VarChar(50), marca)
      .input('modelo', sql.VarChar(50), modelo)
      .input('anio', sql.Int, anio)
      .input('color', sql.VarChar(30), color)
      .input('placa', sql.VarChar(20), placa)
      .input('asientos_disponibles', sql.Int, asientos_disponibles)
      .query(`
        UPDATE Vehiculos
        SET marca = @marca,
            modelo = @modelo,
            anio = @anio,
            color = @color,
            placa = @placa,
            asientos_disponibles = @asientos_disponibles
        WHERE id = @id
      `);
    return this.findById(id);
  },

  async remove(id) {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Vehiculos WHERE id = @id');
  }
};

module.exports = vehicleModel;