CREATE DATABASE uniride;
GO

USE uniride;
GO

-- 1. Roles
CREATE TABLE Roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);
GO

-- 2. Universidades
CREATE TABLE Universidades (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    dominio_correo VARCHAR(100) NULL
);
GO

-- 3. Campus
CREATE TABLE Campus (
    id INT IDENTITY(1,1) PRIMARY KEY,
    universidad_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(255) NULL
);
GO

ALTER TABLE Campus 
ADD CONSTRAINT FK_Campus_Universidad FOREIGN KEY (universidad_id) REFERENCES Universidades(id);
GO

-- 4. Usuarios
CREATE TABLE Usuarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    rol_id INT NOT NULL,
    campus_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NULL,
    fecha_registro DATETIME DEFAULT GETDATE()
);
GO

ALTER TABLE Usuarios ADD CONSTRAINT FK_Usuario_Rol FOREIGN KEY (rol_id) REFERENCES Roles(id);
ALTER TABLE Usuarios ADD CONSTRAINT FK_Usuario_Campus FOREIGN KEY (campus_id) REFERENCES Campus(id);
GO

-- 5. Vehículos
CREATE TABLE Vehiculos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    usuario_id INT NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INT NOT NULL,
    color VARCHAR(30) NOT NULL,
    placa VARCHAR(20) NOT NULL UNIQUE,
    asientos_disponibles INT NOT NULL
);
GO

ALTER TABLE Vehiculos ADD CONSTRAINT FK_Vehiculo_Usuario FOREIGN KEY (usuario_id) REFERENCES Usuarios(id);
GO

-- 6. Viajes
CREATE TABLE Viajes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    conductor_id INT NOT NULL,
    vehiculo_id INT NOT NULL,
    origen VARCHAR(255) NOT NULL,
    destino VARCHAR(255) NOT NULL,
    fecha_salida DATETIME NOT NULL,
    cupo_disponible INT NOT NULL,
    costo_por_pasajero DECIMAL(10,2) NOT NULL,
    estado VARCHAR(30) DEFAULT 'activo'
);
GO

ALTER TABLE Viajes ADD CONSTRAINT FK_Viaje_Conductor FOREIGN KEY (conductor_id) REFERENCES Usuarios(id);
ALTER TABLE Viajes ADD CONSTRAINT FK_Viaje_Vehiculo FOREIGN KEY (vehiculo_id) REFERENCES Vehiculos(id);
GO

-- 7. Solicitudes de Viaje
CREATE TABLE SolicitudesViaje (
    id INT IDENTITY(1,1) PRIMARY KEY,
    viaje_id INT NOT NULL,
    pasajero_id INT NOT NULL,
    estado VARCHAR(30) DEFAULT 'pendiente',
    fecha_solicitud DATETIME DEFAULT GETDATE()
);
GO

ALTER TABLE SolicitudesViaje ADD CONSTRAINT FK_Solicitud_Viaje FOREIGN KEY (viaje_id) REFERENCES Viajes(id);
ALTER TABLE SolicitudesViaje ADD CONSTRAINT FK_Solicitud_Pasajero FOREIGN KEY (pasajero_id) REFERENCES Usuarios(id);
GO

-- 8. Calificaciones
CREATE TABLE Calificaciones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    viaje_id INT NOT NULL,
    calificador_id INT NOT NULL,
    calificado_id INT NOT NULL,
    puntuacion INT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    comentario VARCHAR(500) NULL,
    fecha_creacion DATETIME DEFAULT GETDATE()
);
GO

ALTER TABLE Calificaciones ADD CONSTRAINT FK_Calificacion_Viaje FOREIGN KEY (viaje_id) REFERENCES Viajes(id);
ALTER TABLE Calificaciones ADD CONSTRAINT FK_Calificacion_Calificador FOREIGN KEY (calificador_id) REFERENCES Usuarios(id);
ALTER TABLE Calificaciones ADD CONSTRAINT FK_Calificacion_Calificado FOREIGN KEY (calificado_id) REFERENCES Usuarios(id);
GO

-- 9. Notificaciones
CREATE TABLE Notificaciones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje VARCHAR(500) NOT NULL,
    leida BIT DEFAULT 0,
    tipo VARCHAR(50) NULL,
    fecha_creacion DATETIME DEFAULT GETDATE()
);
GO

ALTER TABLE Notificaciones ADD CONSTRAINT FK_Notificacion_Usuario FOREIGN KEY (usuario_id) REFERENCES Usuarios(id);
GO