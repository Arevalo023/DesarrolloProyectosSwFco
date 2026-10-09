/*
|--------------------------------------------------------------------------
| UniRide - Esquema de base de datos (SQL Server)
|--------------------------------------------------------------------------
| Fuente única del esquema. Es IDEMPOTENTE: se puede ejecutar las veces
| que sea necesario, sobre una base nueva o sobre una existente.
|   - Crea solo las tablas que no existen.
|   - Agrega columnas y llaves foráneas que falten (bases antiguas).
|   - Inserta los catálogos base que falten.
|   - Sincroniza los roles de usuarios y dueños de vehículos.
|
| Ejecutar con:  npm run db:init   (desde uniride-backend)
| El script crea la base DB_NAME si no existe y se conecta a ella.
|
| Si lo ejecutas a mano (SSMS / Azure Data Studio), selecciona antes la
| base "uniride": este archivo NO crea la base ni hace USE.
|
| Integra las antiguas migraciones:
|   - migration_roles_mn.sql            (tabla UsuariosRoles + copia de roles)
|   - migration_add_activo_vehiculos.sql (columna Vehiculos.activo)
|--------------------------------------------------------------------------
*/

/* ========================================================================
   1. TABLAS
   ======================================================================== */

-- 1. Roles
IF OBJECT_ID('dbo.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE Roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL
    );
END
GO

-- 2. Universidades
IF OBJECT_ID('dbo.Universidades', 'U') IS NULL
BEGIN
    CREATE TABLE Universidades (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        dominio_correo VARCHAR(100) NULL
    );
END
GO

-- 3. Campus
IF OBJECT_ID('dbo.Campus', 'U') IS NULL
BEGIN
    CREATE TABLE Campus (
        id INT IDENTITY(1,1) PRIMARY KEY,
        universidad_id INT NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        direccion VARCHAR(255) NULL
    );
END
GO

-- 4. Usuarios
IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
BEGIN
    CREATE TABLE Usuarios (
        id INT IDENTITY(1,1) PRIMARY KEY,
        rol_id INT NOT NULL,          -- rol principal (retrocompatibilidad)
        campus_id INT NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        correo VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        telefono VARCHAR(20) NULL,
        fecha_registro DATETIME DEFAULT GETDATE()
    );
END
GO

-- 4.1. Relación Muchos a Muchos: Usuarios <-> Roles
IF OBJECT_ID('dbo.UsuariosRoles', 'U') IS NULL
BEGIN
    CREATE TABLE UsuariosRoles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        rol_id INT NOT NULL,
        fecha_asignacion DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_Usuario_Rol UNIQUE (usuario_id, rol_id)
    );
END
GO

-- 5. Vehículos
IF OBJECT_ID('dbo.Vehiculos', 'U') IS NULL
BEGIN
    CREATE TABLE Vehiculos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        marca VARCHAR(50) NOT NULL,
        modelo VARCHAR(50) NOT NULL,
        anio INT NOT NULL,
        color VARCHAR(30) NOT NULL,
        placa VARCHAR(20) NOT NULL UNIQUE,
        asientos_disponibles INT NOT NULL,   -- asientos totales (incluye conductor)
        activo BIT NOT NULL CONSTRAINT DF_Vehiculos_activo DEFAULT (1)
    );
END
GO

-- 5.1. Bases antiguas: agregar columna activo si falta
IF COL_LENGTH('dbo.Vehiculos', 'activo') IS NULL
BEGIN
    ALTER TABLE Vehiculos
        ADD activo BIT NOT NULL CONSTRAINT DF_Vehiculos_activo DEFAULT (1);
END
GO

-- 6. Viajes
IF OBJECT_ID('dbo.Viajes', 'U') IS NULL
BEGIN
    CREATE TABLE Viajes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        conductor_id INT NOT NULL,
        vehiculo_id INT NOT NULL,
        origen VARCHAR(255) NOT NULL,
        destino VARCHAR(255) NOT NULL,
        fecha_salida DATETIME NOT NULL,
        cupo_disponible INT NOT NULL,
        costo_por_pasajero DECIMAL(10,2) NOT NULL,
        estado VARCHAR(30) DEFAULT 'activo',
        motivo_cancelacion VARCHAR(250) NULL
    );
END
GO

IF COL_LENGTH('dbo.Viajes', 'motivo_cancelacion') IS NULL
BEGIN
    ALTER TABLE dbo.Viajes ADD motivo_cancelacion VARCHAR(250) NULL;
END
GO

-- 7. Solicitudes de Viaje
IF OBJECT_ID('dbo.SolicitudesViaje', 'U') IS NULL
BEGIN
    CREATE TABLE SolicitudesViaje (
        id INT IDENTITY(1,1) PRIMARY KEY,
        viaje_id INT NOT NULL,
        pasajero_id INT NOT NULL,
        estado VARCHAR(30) DEFAULT 'pendiente',
        fecha_solicitud DATETIME DEFAULT GETDATE()
    );
END
GO

-- 8. Calificaciones
IF OBJECT_ID('dbo.Calificaciones', 'U') IS NULL
BEGIN
    CREATE TABLE Calificaciones (
        id INT IDENTITY(1,1) PRIMARY KEY,
        viaje_id INT NOT NULL,
        calificador_id INT NOT NULL,
        calificado_id INT NOT NULL,
        puntuacion INT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
        comentario VARCHAR(500) NULL,
        fecha_creacion DATETIME DEFAULT GETDATE()
    );
END
GO

-- 9. Notificaciones
IF OBJECT_ID('dbo.Notificaciones', 'U') IS NULL
BEGIN
    CREATE TABLE Notificaciones (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        titulo VARCHAR(150) NOT NULL,
        mensaje VARCHAR(500) NOT NULL,
        leida BIT DEFAULT 0,
        tipo VARCHAR(50) NULL,
        fecha_creacion DATETIME DEFAULT GETDATE()
    );
END
GO

-- 9.1. Bases existentes: relacionar la notificación con la solicitud y el viaje
IF COL_LENGTH('dbo.Notificaciones', 'solicitud_id') IS NULL
    ALTER TABLE Notificaciones ADD solicitud_id INT NULL;
GO

IF COL_LENGTH('dbo.Notificaciones', 'viaje_id') IS NULL
    ALTER TABLE Notificaciones ADD viaje_id INT NULL;
GO

/* ========================================================================
   2. LLAVES FORÁNEAS (mismos nombres que el esquema original;
      solo se crean si no existen)
   ======================================================================== */

IF OBJECT_ID('FK_Campus_Universidad', 'F') IS NULL
    ALTER TABLE Campus ADD CONSTRAINT FK_Campus_Universidad
        FOREIGN KEY (universidad_id) REFERENCES Universidades(id);
GO

IF OBJECT_ID('FK_Usuario_Rol', 'F') IS NULL
    ALTER TABLE Usuarios ADD CONSTRAINT FK_Usuario_Rol
        FOREIGN KEY (rol_id) REFERENCES Roles(id);
GO

IF OBJECT_ID('FK_Usuario_Campus', 'F') IS NULL
    ALTER TABLE Usuarios ADD CONSTRAINT FK_Usuario_Campus
        FOREIGN KEY (campus_id) REFERENCES Campus(id);
GO

IF OBJECT_ID('FK_UsuariosRoles_Usuario', 'F') IS NULL
    ALTER TABLE UsuariosRoles ADD CONSTRAINT FK_UsuariosRoles_Usuario
        FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE;
GO

IF OBJECT_ID('FK_UsuariosRoles_Rol', 'F') IS NULL
    ALTER TABLE UsuariosRoles ADD CONSTRAINT FK_UsuariosRoles_Rol
        FOREIGN KEY (rol_id) REFERENCES Roles(id) ON DELETE CASCADE;
GO

IF OBJECT_ID('FK_Vehiculo_Usuario', 'F') IS NULL
    ALTER TABLE Vehiculos ADD CONSTRAINT FK_Vehiculo_Usuario
        FOREIGN KEY (usuario_id) REFERENCES Usuarios(id);
GO

IF OBJECT_ID('FK_Viaje_Conductor', 'F') IS NULL
    ALTER TABLE Viajes ADD CONSTRAINT FK_Viaje_Conductor
        FOREIGN KEY (conductor_id) REFERENCES Usuarios(id);
GO

IF OBJECT_ID('FK_Viaje_Vehiculo', 'F') IS NULL
    ALTER TABLE Viajes ADD CONSTRAINT FK_Viaje_Vehiculo
        FOREIGN KEY (vehiculo_id) REFERENCES Vehiculos(id);
GO

IF OBJECT_ID('FK_Solicitud_Viaje', 'F') IS NULL
    ALTER TABLE SolicitudesViaje ADD CONSTRAINT FK_Solicitud_Viaje
        FOREIGN KEY (viaje_id) REFERENCES Viajes(id);
GO

IF OBJECT_ID('FK_Solicitud_Pasajero', 'F') IS NULL
    ALTER TABLE SolicitudesViaje ADD CONSTRAINT FK_Solicitud_Pasajero
        FOREIGN KEY (pasajero_id) REFERENCES Usuarios(id);
GO

IF OBJECT_ID('FK_Calificacion_Viaje', 'F') IS NULL
    ALTER TABLE Calificaciones ADD CONSTRAINT FK_Calificacion_Viaje
        FOREIGN KEY (viaje_id) REFERENCES Viajes(id);
GO

IF OBJECT_ID('FK_Calificacion_Calificador', 'F') IS NULL
    ALTER TABLE Calificaciones ADD CONSTRAINT FK_Calificacion_Calificador
        FOREIGN KEY (calificador_id) REFERENCES Usuarios(id);
GO

IF OBJECT_ID('FK_Calificacion_Calificado', 'F') IS NULL
    ALTER TABLE Calificaciones ADD CONSTRAINT FK_Calificacion_Calificado
        FOREIGN KEY (calificado_id) REFERENCES Usuarios(id);
GO

IF OBJECT_ID('FK_Notificacion_Usuario', 'F') IS NULL
    ALTER TABLE Notificaciones ADD CONSTRAINT FK_Notificacion_Usuario
        FOREIGN KEY (usuario_id) REFERENCES Usuarios(id);
GO

IF OBJECT_ID('FK_Notificacion_Solicitud', 'F') IS NULL
    ALTER TABLE Notificaciones ADD CONSTRAINT FK_Notificacion_Solicitud
        FOREIGN KEY (solicitud_id) REFERENCES SolicitudesViaje(id);
GO

IF OBJECT_ID('FK_Notificacion_Viaje', 'F') IS NULL
    ALTER TABLE Notificaciones ADD CONSTRAINT FK_Notificacion_Viaje
        FOREIGN KEY (viaje_id) REFERENCES Viajes(id);
GO

/* ========================================================================
   3. CATÁLOGOS BASE
   En una base vacía se insertan con ids fijos porque el código los usa:
   - Roles: 1 = Pasajero (rol por defecto del registro)
   - Campus: 1..3 = opciones del formulario de registro
   En una base con datos solo se agregan los que falten (por nombre).
   ======================================================================== */

-- Roles
IF NOT EXISTS (SELECT 1 FROM Roles)
BEGIN
    SET IDENTITY_INSERT Roles ON;
    INSERT INTO Roles (id, nombre) VALUES
        (1, 'Pasajero'),
        (2, 'Conductor'),
        (3, 'Administrador'),
        (4, 'Moderador');
    SET IDENTITY_INSERT Roles OFF;
END
GO

INSERT INTO Roles (nombre)
SELECT r.nombre
FROM (VALUES ('Pasajero'), ('Conductor'), ('Administrador'), ('Moderador')) AS r(nombre)
WHERE NOT EXISTS (SELECT 1 FROM Roles x WHERE LOWER(x.nombre) = LOWER(r.nombre));
GO

-- Universidades
IF NOT EXISTS (SELECT 1 FROM Universidades)
BEGIN
    SET IDENTITY_INSERT Universidades ON;
    INSERT INTO Universidades (id, nombre, dominio_correo) VALUES
        (1, 'Universidad Autónoma de Coahuila', 'uadec.edu.mx');
    SET IDENTITY_INSERT Universidades OFF;
END
GO

-- Campus
IF NOT EXISTS (SELECT 1 FROM Campus)
BEGIN
    SET IDENTITY_INSERT Campus ON;
    INSERT INTO Campus (id, universidad_id, nombre) VALUES
        (1, 1, 'Campus Arteaga'),
        (2, 1, 'Campus Poniente'),
        (3, 1, 'Campus Central');
    SET IDENTITY_INSERT Campus OFF;
END
GO

/* ========================================================================
   4. SINCRONIZACIÓN DE ROLES DE USUARIO
   Todo usuario debe tener su rol principal (Usuarios.rol_id) también en
   la tabla M:N UsuariosRoles.
   ======================================================================== */

INSERT INTO UsuariosRoles (usuario_id, rol_id)
SELECT u.id, u.rol_id
FROM Usuarios u
WHERE u.rol_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM UsuariosRoles ur
      WHERE ur.usuario_id = u.id AND ur.rol_id = u.rol_id
  );
GO

/* ========================================================================
   5. SINCRONIZACIÓN DE ROLES EN VEHÍCULOS
   Todo usuario con al menos un vehículo registrado debe tener el rol
   Conductor (además de sus otros roles). La app lo asigna al registrar
   el primer vehículo; esto corrige datos previos a ese cambio.
   ======================================================================== */

INSERT INTO UsuariosRoles (usuario_id, rol_id)
SELECT DISTINCT v.usuario_id, r.id
FROM Vehiculos v
CROSS JOIN Roles r
WHERE LOWER(r.nombre) = 'conductor'
  AND NOT EXISTS (
      SELECT 1 FROM UsuariosRoles ur
      WHERE ur.usuario_id = v.usuario_id AND ur.rol_id = r.id
  );
GO
