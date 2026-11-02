const jwt = require("jsonwebtoken");
const app = require("../../../app");
const { sql, poolPromise } = require("../../../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "uniride_default_secret_key";

const tokenFor = (id, roles) =>
  jwt.sign(
    { id, roles, rol: roles[0] },
    JWT_SECRET,
    { expiresIn: "10m" }
  );

const startServer = async () => {
  const pool = await poolPromise;
  const { name } = (
    await pool.request().query("SELECT DB_NAME() AS name")
  ).recordset[0];
  if (!/_test$/i.test(name)) {
    throw new Error(`Las pruebas E2E requieren una BD *_test (actual: ${name}).`);
  }

  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.once("error", reject);
  });

  return {
    pool,
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
};

const stopServer = async ({ pool, server }) => {
  if (server?.listening) {
    await new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  }
  if (pool) await pool.close();
};

const createUser = async (pool, { name, role = "Pasajero" }) => {
  const roleResult = await pool.request()
    .input("roleName", sql.VarChar(50), role)
    .query("SELECT id FROM Roles WHERE nombre = @roleName");
  const roleId = roleResult.recordset[0]?.id;
  if (!roleId) throw new Error(`No existe el rol de prueba "${role}".`);

  const campusResult = await pool.request()
    .query("SELECT TOP 1 id FROM Campus ORDER BY id");
  const campusId = campusResult.recordset[0]?.id;
  if (!campusId) throw new Error("La BD de pruebas no tiene campus configurado.");

  const correo = `${name}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}@e2e.invalid`;
  const result = await pool.request()
    .input("roleId", sql.Int, roleId)
    .input("campusId", sql.Int, campusId)
    .input("name", sql.VarChar(100), name)
    .input("email", sql.VarChar(150), correo)
    .query(`
      INSERT INTO Usuarios
        (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
      OUTPUT INSERTED.id
      VALUES (@roleId, @campusId, @name, 'E2E', @email, 'e2e-test-only-hash', '5550100000')
    `);

  const userId = result.recordset[0].id;
  await pool.request()
    .input("userId", sql.Int, userId)
    .input("roleId", sql.Int, roleId)
    .query("INSERT INTO UsuariosRoles (usuario_id, rol_id) VALUES (@userId, @roleId)");

  return { id: userId, email: correo };
};

const createVehicle = async (pool, userId) => {
  const plate = `E2E-${process.pid}-${Date.now()}`.slice(0, 20);
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .input("plate", sql.VarChar(20), plate)
    .query(`
      INSERT INTO Vehiculos
        (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles, activo)
      OUTPUT INSERTED.id
      VALUES (@userId, 'Test', 'AdminE2E', 2025, 'Azul', @plate, 4, 1)
    `);
  return result.recordset[0].id;
};

const createTrip = async (pool, { driverId, vehicleId, origin }) => {
  const departure = new Date();
  departure.setDate(departure.getDate() + 2);

  const result = await pool.request()
    .input("driverId", sql.Int, driverId)
    .input("vehicleId", sql.Int, vehicleId)
    .input("origin", sql.VarChar(255), origin)
    .input("departure", sql.DateTime, departure)
    .query(`
      INSERT INTO Viajes
        (conductor_id, vehiculo_id, origen, destino, fecha_salida,
         cupo_disponible, costo_por_pasajero, estado)
      OUTPUT INSERTED.id
      VALUES (@driverId, @vehicleId, @origin, 'Destino E2E', @departure, 3, 25, 'programado')
    `);
  return result.recordset[0].id;
};

const createReservation = async (pool, { tripId, passengerId }) => {
  const result = await pool.request()
    .input("tripId", sql.Int, tripId)
    .input("passengerId", sql.Int, passengerId)
    .query(`
      INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
      OUTPUT INSERTED.id
      VALUES (@tripId, @passengerId, 'pendiente')
    `);
  return result.recordset[0].id;
};

const removeFixtures = async (pool, { userIds = [], vehicleIds = [], tripIds = [] }) => {
  const request = pool.request();
  const addIds = (prefix, ids) => {
    if (!ids.length) return "NULL";
    ids.forEach((id, index) => request.input(`${prefix}${index}`, sql.Int, id));
    return ids.map((_, index) => `@${prefix}${index}`).join(", ");
  };

  const users = addIds("user", userIds);
  const vehicles = addIds("vehicle", vehicleIds);
  const trips = addIds("trip", tripIds);
  await request.query(`
    DELETE FROM Notificaciones
    WHERE usuario_id IN (${users})
       OR viaje_id IN (${trips})
       OR solicitud_id IN (SELECT id FROM SolicitudesViaje WHERE viaje_id IN (${trips}));
    DELETE FROM Calificaciones
    WHERE viaje_id IN (${trips})
       OR calificador_id IN (${users})
       OR calificado_id IN (${users});
    DELETE FROM SolicitudesViaje
    WHERE viaje_id IN (${trips}) OR pasajero_id IN (${users});
    DELETE FROM Viajes WHERE id IN (${trips});
    DELETE FROM Vehiculos WHERE id IN (${vehicles});
    DELETE FROM UsuariosRoles WHERE usuario_id IN (${users});
    DELETE FROM Usuarios WHERE id IN (${users});
  `);
};

module.exports = {
  createReservation,
  createTrip,
  createUser,
  createVehicle,
  removeFixtures,
  startServer,
  stopServer,
  tokenFor,
};
