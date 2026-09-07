USE uniride;
GO

-- 1. Roles iniciales
IF NOT EXISTS (SELECT * FROM Roles WHERE nombre = 'Pasajero')
    INSERT INTO Roles (nombre) VALUES ('Pasajero');

IF NOT EXISTS (SELECT * FROM Roles WHERE nombre = 'Conductor')
    INSERT INTO Roles (nombre) VALUES ('Conductor');

IF NOT EXISTS (SELECT * FROM Roles WHERE nombre = 'Administrador')
    INSERT INTO Roles (nombre) VALUES ('Administrador');
GO

-- 2. Universidades iniciales
IF NOT EXISTS (SELECT * FROM Universidades WHERE dominio_correo = 'uadec.edu.mx')
    INSERT INTO Universidades (nombre, dominio_correo) 
    VALUES ('Universidad Autónoma de Coahuila', 'uadec.edu.mx');

IF NOT EXISTS (SELECT * FROM Universidades WHERE dominio_correo = 'universidad.edu')
    INSERT INTO Universidades (nombre, dominio_correo) 
    VALUES ('Universidad Institucional (Demo)', 'universidad.edu');
GO

-- 3. Campus iniciales
IF NOT EXISTS (SELECT * FROM Campus WHERE nombre = 'Campus Arteaga')
    INSERT INTO Campus (universidad_id, nombre, direccion) 
    VALUES (1, 'Campus Arteaga', 'Carretera 57 Km. 13, Arteaga, Coah.');

IF NOT EXISTS (SELECT * FROM Campus WHERE nombre = 'Campus Poniente')
    INSERT INTO Campus (universidad_id, nombre, direccion) 
    VALUES (1, 'Campus Poniente', 'Calzada Emilio Carranza, Saltillo, Coah.');

IF NOT EXISTS (SELECT * FROM Campus WHERE nombre = 'Campus Central')
    INSERT INTO Campus (universidad_id, nombre, direccion) 
    VALUES (2, 'Campus Central', 'Av. Universidad #100');
GO
