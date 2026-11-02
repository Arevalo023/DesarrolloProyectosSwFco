const bcrypt = require("../../../uniride-backend/node_modules/bcryptjs");
const sql = require("../../../uniride-backend/node_modules/mssql");
const { getDbSettings } = require("../../../uniride-backend/config/dbConfig");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const fixtureFile = () =>
  path.join(os.tmpdir(), `uniride-frontend-e2e-${process.env.E2E_RUN_ID}.json`);

async function createUser(pool, { name, email, passwordHash, roleId, campusId }) {
  const result = await pool.request()
    .input("roleId", sql.Int, roleId)
    .input("campusId", sql.Int, campusId)
    .input("name", sql.VarChar(100), name)
    .input("email", sql.VarChar(150), email)
    .input("passwordHash", sql.VarChar(255), passwordHash)
    .query(`
      INSERT INTO Usuarios
        (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
      OUTPUT INSERTED.id
      VALUES (@roleId, @campusId, @name, 'E2E', @email, @passwordHash, '5550100000')
    `);
  const id = result.recordset[0].id;

  await pool.request()
    .input("userId", sql.Int, id)
    .input("roleId", sql.Int, roleId)
    .query("INSERT INTO UsuariosRoles (usuario_id, rol_id) VALUES (@userId, @roleId)");

  return id;
}

async function removeFixtures(pool, fixtures) {
  const users = fixtures.userIds || [];
  const vehicles = fixtures.vehicleIds || [];
  const trips = fixtures.tripIds || [];
  const request = pool.request();
  const addIds = (prefix, ids) => {
    if (ids.length === 0) return "NULL";
    ids.forEach((id, index) => request.input(`${prefix}${index}`, sql.Int, id));
    return ids.map((_, index) => `@${prefix}${index}`).join(", ");
  };
  const userIds = addIds("user", users);
  const vehicleIds = addIds("vehicle", vehicles);
  const tripIds = addIds("trip", trips);

  await request.query(`
    DELETE FROM Notificaciones
    WHERE usuario_id IN (${userIds}) OR viaje_id IN (${tripIds});
    DELETE FROM Calificaciones
    WHERE viaje_id IN (${tripIds})
       OR calificador_id IN (${userIds})
       OR calificado_id IN (${userIds});
    DELETE FROM SolicitudesViaje
    WHERE viaje_id IN (${tripIds}) OR pasajero_id IN (${userIds});
    DELETE FROM Viajes WHERE id IN (${tripIds});
    DELETE FROM Vehiculos WHERE id IN (${vehicleIds});
    DELETE FROM UsuariosRoles WHERE usuario_id IN (${userIds});
    DELETE FROM Usuarios WHERE id IN (${userIds});
  `);
}

async function globalSetup() {
  if (!process.env.E2E_RUN_ID) throw new Error("Falta E2E_RUN_ID; ejecuta npm run test:e2e.");

  const pool = await new sql.ConnectionPool(
    getDbSettings(process.env.DB_NAME_TEST || "uniride_admin_e2e_test")
  ).connect();
  const fixtures = { userIds: [], vehicleIds: [], tripIds: [] };

  try {
    const [adminRole, passengerRole, driverRole, campus] = await Promise.all([
      pool.request().query("SELECT TOP 1 id FROM Roles WHERE nombre = 'Administrador'"),
      pool.request().query("SELECT TOP 1 id FROM Roles WHERE nombre = 'Pasajero'"),
      pool.request().query("SELECT TOP 1 id FROM Roles WHERE nombre = 'Conductor'"),
      pool.request().query("SELECT TOP 1 id FROM Campus ORDER BY id"),
    ]);
    const adminRoleId = adminRole.recordset[0]?.id;
    const passengerRoleId = passengerRole.recordset[0]?.id;
    const driverRoleId = driverRole.recordset[0]?.id;
    const campusId = campus.recordset[0]?.id;
    if (!adminRoleId || !passengerRoleId || !driverRoleId || !campusId) {
      throw new Error("La base E2E debe tener campus y roles inicializados.");
    }

    const password = `AdminE2E-${process.env.E2E_RUN_ID}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const emailBase = `frontend.e2e.${process.env.E2E_RUN_ID}`;

    const adminId = await createUser(pool, {
      name: "Administrador Frontend",
      email: `${emailBase}.admin@uadec.edu.mx`,
      passwordHash,
      roleId: adminRoleId,
      campusId,
    });
    fixtures.userIds.push(adminId);

    const passengerId = await createUser(pool, {
      name: "Usuario Frontend",
      email: `${emailBase}.usuario@uadec.edu.mx`,
      passwordHash: "e2e-test-only-hash",
      roleId: passengerRoleId,
      campusId,
    });
    fixtures.userIds.push(passengerId);

    const driverId = await createUser(pool, {
      name: "Conductor Frontend E2E",
      email: `${emailBase}.conductor@uadec.edu.mx`,
      passwordHash: "e2e-test-only-hash",
      roleId: driverRoleId,
      campusId,
    });
    fixtures.userIds.push(driverId);

    const vehicle = await pool.request()
      .input("userId", sql.Int, driverId)
      .input("plate", sql.VarChar(20), `FE2E-${process.env.E2E_RUN_ID}`.slice(0, 20))
      .query(`
        INSERT INTO Vehiculos
          (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles, activo)
        OUTPUT INSERTED.id
        VALUES (@userId, 'Test', 'FrontendE2E', 2025, 'Azul', @plate, 4, 1)
      `);
    const vehicleId = vehicle.recordset[0].id;
    fixtures.vehicleIds.push(vehicleId);

    const departure = new Date();
    departure.setDate(departure.getDate() + 2);
    const trip = await pool.request()
      .input("driverId", sql.Int, driverId)
      .input("vehicleId", sql.Int, vehicleId)
      .input("origin", sql.VarChar(255), `Origen Frontend E2E ${process.env.E2E_RUN_ID}`)
      .input("departure", sql.DateTime, departure)
      .query(`
        INSERT INTO Viajes
          (conductor_id, vehiculo_id, origen, destino, fecha_salida,
           cupo_disponible, costo_por_pasajero, estado)
        OUTPUT INSERTED.id
        VALUES (@driverId, @vehicleId, @origin, 'Destino Frontend E2E',
                @departure, 3, 25, 'programado')
      `);
    fixtures.tripIds.push(trip.recordset[0].id);

    await fs.writeFile(fixtureFile(), JSON.stringify({
      ...fixtures,
      adminEmail: `${emailBase}.admin@uadec.edu.mx`,
      adminPassword: password,
      userEmail: `${emailBase}.usuario@uadec.edu.mx`,
      tripOrigin: `Origen Frontend E2E ${process.env.E2E_RUN_ID}`,
    }), { encoding: "utf8", mode: 0o600 });
  } catch (error) {
    await removeFixtures(pool, fixtures).catch((cleanupError) => {
      console.error("No se pudieron eliminar todos los fixtures E2E:", cleanupError);
    });
    throw error;
  } finally {
    await pool.close();
  }
}

module.exports = globalSetup;
