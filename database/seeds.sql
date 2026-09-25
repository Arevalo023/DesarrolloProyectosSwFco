USE uniride;
GO

-- =====================================================================
-- SEEDS DE DATOS DE EJEMPLO (DEMO)
-- Objetivo: poblar todas las tablas con información realista para
-- poder trabajar y visualizar la app. Todos los INSERT son idempotentes
-- (usan IF NOT EXISTS), por lo que este script se puede ejecutar
-- varias veces sin duplicar información.
-- Requiere haber ejecutado antes: uniride.sql, seeds.sql y
-- migration_roles_mn.sql (para que existan Roles/Universidades/Campus
-- y la tabla UsuariosRoles).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. USUARIOS
-- ---------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Pasajero'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Arteaga'),
        'Ana', 'García', 'ana.garcia@uadec.edu.mx',
        '$2b$12$demoHashAnaGarcia0000000000000000000000000000000000000',
        '8441234501'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'luis.martinez@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Conductor'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Arteaga'),
        'Luis', 'Martínez', 'luis.martinez@uadec.edu.mx',
        '$2b$12$demoHashLuisMartinez000000000000000000000000000000000',
        '8441234502'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'sofia.hernandez@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Pasajero'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Poniente'),
        'Sofía', 'Hernández', 'sofia.hernandez@uadec.edu.mx',
        '$2b$12$demoHashSofiaHernandez00000000000000000000000000000000',
        '8441234503'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'carlos.ramirez@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Conductor'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Poniente'),
        'Carlos', 'Ramírez', 'carlos.ramirez@uadec.edu.mx',
        '$2b$12$demoHashCarlosRamirez000000000000000000000000000000000',
        '8441234504'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Conductor'), -- rol principal; también es Pasajero (ver UsuariosRoles)
        (SELECT id FROM Campus WHERE nombre = 'Campus Arteaga'),
        'María', 'López', 'maria.lopez@uadec.edu.mx',
        '$2b$12$demoHashMariaLopez00000000000000000000000000000000000',
        '8441234505'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'jorge.torres@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Administrador'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Arteaga'),
        'Jorge', 'Torres', 'jorge.torres@uadec.edu.mx',
        '$2b$12$demoHashJorgeTorres0000000000000000000000000000000000',
        '8441234506'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'daniela.flores@universidad.edu')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Pasajero'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Central'),
        'Daniela', 'Flores', 'daniela.flores@universidad.edu',
        '$2b$12$demoHashDanielaFlores000000000000000000000000000000000',
        '8441234507'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'roberto.sanchez@universidad.edu')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Conductor'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Central'),
        'Roberto', 'Sánchez', 'roberto.sanchez@universidad.edu',
        '$2b$12$demoHashRobertoSanchez00000000000000000000000000000000',
        '8441234508'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'paola.jimenez@universidad.edu')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Pasajero'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Central'),
        'Paola', 'Jiménez', 'paola.jimenez@universidad.edu',
        '$2b$12$demoHashPaolaJimenez0000000000000000000000000000000000',
        '8441234509'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'eduardo.castillo@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Conductor'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Poniente'),
        'Eduardo', 'Castillo', 'eduardo.castillo@uadec.edu.mx',
        '$2b$12$demoHashEduardoCastillo0000000000000000000000000000000',
        '8441234510'
    );
GO

-- ---------------------------------------------------------------------
-- 2. USUARIOS_ROLES (relación M:N)
-- Se asigna a cada usuario su rol principal, y a María López un rol
-- adicional de Pasajero para ejemplificar la relación muchos a muchos.
-- ---------------------------------------------------------------------
INSERT INTO UsuariosRoles (usuario_id, rol_id)
SELECT u.id, u.rol_id
FROM Usuarios u
WHERE NOT EXISTS (
    SELECT 1 FROM UsuariosRoles ur WHERE ur.usuario_id = u.id AND ur.rol_id = u.rol_id
);

IF NOT EXISTS (
    SELECT 1 FROM UsuariosRoles ur
    JOIN Usuarios u ON u.id = ur.usuario_id
    JOIN Roles r ON r.id = ur.rol_id
    WHERE u.correo = 'maria.lopez@uadec.edu.mx' AND r.nombre = 'Pasajero'
)
    INSERT INTO UsuariosRoles (usuario_id, rol_id)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx'),
        (SELECT id FROM Roles WHERE nombre = 'Pasajero')
    );
GO

-- ---------------------------------------------------------------------
-- 3. VEHÍCULOS (uno por cada conductor)
-- ---------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Vehiculos WHERE placa = 'SAL-001')
    INSERT INTO Vehiculos (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles, activo)
    VALUES ((SELECT id FROM Usuarios WHERE correo = 'luis.martinez@uadec.edu.mx'),
            'Nissan', 'Versa', 2019, 'Blanco', 'SAL-001', 3, 1);

IF NOT EXISTS (SELECT 1 FROM Vehiculos WHERE placa = 'SAL-002')
    INSERT INTO Vehiculos (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles, activo)
    VALUES ((SELECT id FROM Usuarios WHERE correo = 'carlos.ramirez@uadec.edu.mx'),
            'Chevrolet', 'Aveo', 2021, 'Gris', 'SAL-002', 3, 1);

IF NOT EXISTS (SELECT 1 FROM Vehiculos WHERE placa = 'SAL-003')
    INSERT INTO Vehiculos (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles, activo)
    VALUES ((SELECT id FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx'),
            'Volkswagen', 'Vento', 2020, 'Rojo', 'SAL-003', 3, 1);

IF NOT EXISTS (SELECT 1 FROM Vehiculos WHERE placa = 'SAL-004')
    INSERT INTO Vehiculos (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles, activo)
    VALUES ((SELECT id FROM Usuarios WHERE correo = 'roberto.sanchez@universidad.edu'),
            'Toyota', 'Corolla', 2022, 'Azul', 'SAL-004', 4, 1);

IF NOT EXISTS (SELECT 1 FROM Vehiculos WHERE placa = 'SAL-005')
    INSERT INTO Vehiculos (usuario_id, marca, modelo, anio, color, placa, asientos_disponibles, activo)
    VALUES ((SELECT id FROM Usuarios WHERE correo = 'eduardo.castillo@uadec.edu.mx'),
            'Kia', 'Rio', 2018, 'Negro', 'SAL-005', 3, 1);
GO

-- ---------------------------------------------------------------------
-- 4. VIAJES
-- ---------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Viajes WHERE fecha_salida = '2026-09-25T08:00:00' AND origen = 'Campus Arteaga')
    INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'luis.martinez@uadec.edu.mx'),
        (SELECT id FROM Vehiculos WHERE placa = 'SAL-001'),
        'Campus Arteaga', 'Plaza Sendero, Saltillo', '2026-09-25T08:00:00', 3, 35.00, 'activo'
    );

IF NOT EXISTS (SELECT 1 FROM Viajes WHERE fecha_salida = '2026-09-25T14:00:00' AND origen = 'Campus Poniente')
    INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'carlos.ramirez@uadec.edu.mx'),
        (SELECT id FROM Vehiculos WHERE placa = 'SAL-002'),
        'Campus Poniente', 'Centro de Saltillo', '2026-09-25T14:00:00', 2, 30.00, 'activo'
    );

IF NOT EXISTS (SELECT 1 FROM Viajes WHERE fecha_salida = '2026-09-24T18:00:00' AND origen = 'Campus Arteaga')
    INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx'),
        (SELECT id FROM Vehiculos WHERE placa = 'SAL-003'),
        'Campus Arteaga', 'Ramos Arizpe', '2026-09-24T18:00:00', 3, 40.00, 'completado'
    );

IF NOT EXISTS (SELECT 1 FROM Viajes WHERE fecha_salida = '2026-09-26T06:30:00' AND origen = 'Campus Central')
    INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'roberto.sanchez@universidad.edu'),
        (SELECT id FROM Vehiculos WHERE placa = 'SAL-004'),
        'Campus Central', 'Aeropuerto de Saltillo', '2026-09-26T06:30:00', 4, 60.00, 'activo'
    );

IF NOT EXISTS (SELECT 1 FROM Viajes WHERE fecha_salida = '2026-09-23T19:00:00' AND origen = 'Campus Poniente')
    INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'eduardo.castillo@uadec.edu.mx'),
        (SELECT id FROM Vehiculos WHERE placa = 'SAL-005'),
        'Campus Poniente', 'Zona Centro', '2026-09-23T19:00:00', 3, 25.00, 'completado'
    );
GO

-- ---------------------------------------------------------------------
-- 5. SOLICITUDES DE VIAJE
-- ---------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv
    JOIN Usuarios p ON p.id = sv.pasajero_id
    JOIN Viajes v ON v.id = sv.viaje_id
    WHERE p.correo = 'ana.garcia@uadec.edu.mx' AND v.fecha_salida = '2026-09-25T08:00:00'
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (
        (SELECT id FROM Viajes WHERE fecha_salida = '2026-09-25T08:00:00' AND origen = 'Campus Arteaga'),
        (SELECT id FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx'),
        'aceptada'
    );

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv
    JOIN Usuarios p ON p.id = sv.pasajero_id
    JOIN Viajes v ON v.id = sv.viaje_id
    WHERE p.correo = 'sofia.hernandez@uadec.edu.mx' AND v.fecha_salida = '2026-09-25T14:00:00'
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (
        (SELECT id FROM Viajes WHERE fecha_salida = '2026-09-25T14:00:00' AND origen = 'Campus Poniente'),
        (SELECT id FROM Usuarios WHERE correo = 'sofia.hernandez@uadec.edu.mx'),
        'pendiente'
    );

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv
    JOIN Usuarios p ON p.id = sv.pasajero_id
    JOIN Viajes v ON v.id = sv.viaje_id
    WHERE p.correo = 'daniela.flores@universidad.edu' AND v.fecha_salida = '2026-09-26T06:30:00'
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (
        (SELECT id FROM Viajes WHERE fecha_salida = '2026-09-26T06:30:00' AND origen = 'Campus Central'),
        (SELECT id FROM Usuarios WHERE correo = 'daniela.flores@universidad.edu'),
        'aceptada'
    );

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv
    JOIN Usuarios p ON p.id = sv.pasajero_id
    JOIN Viajes v ON v.id = sv.viaje_id
    WHERE p.correo = 'paola.jimenez@universidad.edu' AND v.fecha_salida = '2026-09-26T06:30:00'
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (
        (SELECT id FROM Viajes WHERE fecha_salida = '2026-09-26T06:30:00' AND origen = 'Campus Central'),
        (SELECT id FROM Usuarios WHERE correo = 'paola.jimenez@universidad.edu'),
        'pendiente'
    );

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv
    JOIN Usuarios p ON p.id = sv.pasajero_id
    JOIN Viajes v ON v.id = sv.viaje_id
    WHERE p.correo = 'ana.garcia@uadec.edu.mx' AND v.fecha_salida = '2026-09-24T18:00:00'
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (
        (SELECT id FROM Viajes WHERE fecha_salida = '2026-09-24T18:00:00' AND origen = 'Campus Arteaga'),
        (SELECT id FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx'),
        'aceptada'
    );

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv
    JOIN Usuarios p ON p.id = sv.pasajero_id
    JOIN Viajes v ON v.id = sv.viaje_id
    WHERE p.correo = 'sofia.hernandez@uadec.edu.mx' AND v.fecha_salida = '2026-09-23T19:00:00'
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (
        (SELECT id FROM Viajes WHERE fecha_salida = '2026-09-23T19:00:00' AND origen = 'Campus Poniente'),
        (SELECT id FROM Usuarios WHERE correo = 'sofia.hernandez@uadec.edu.mx'),
        'aceptada'
    );
GO

-- ---------------------------------------------------------------------
-- 6. CALIFICACIONES (sobre los viajes ya completados)
-- ---------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM Calificaciones c
    JOIN Viajes v ON v.id = c.viaje_id
    JOIN Usuarios cal ON cal.id = c.calificador_id
    WHERE v.fecha_salida = '2026-09-24T18:00:00' AND cal.correo = 'ana.garcia@uadec.edu.mx'
)
    INSERT INTO Calificaciones (viaje_id, calificador_id, calificado_id, puntuacion, comentario)
    VALUES (
        (SELECT id FROM Viajes WHERE fecha_salida = '2026-09-24T18:00:00' AND origen = 'Campus Arteaga'),
        (SELECT id FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx'),
        (SELECT id FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx'),
        5, 'Excelente conductora, muy puntual.'
    );

IF NOT EXISTS (
    SELECT 1 FROM Calificaciones c
    JOIN Viajes v ON v.id = c.viaje_id
    JOIN Usuarios cal ON cal.id = c.calificador_id
    WHERE v.fecha_salida = '2026-09-24T18:00:00' AND cal.correo = 'maria.lopez@uadec.edu.mx'
)
    INSERT INTO Calificaciones (viaje_id, calificador_id, calificado_id, puntuacion, comentario)
    VALUES (
        (SELECT id FROM Viajes WHERE fecha_salida = '2026-09-24T18:00:00' AND origen = 'Campus Arteaga'),
        (SELECT id FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx'),
        (SELECT id FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx'),
        5, 'Buena pasajera, sin contratiempos.'
    );

IF NOT EXISTS (
    SELECT 1 FROM Calificaciones c
    JOIN Viajes v ON v.id = c.viaje_id
    JOIN Usuarios cal ON cal.id = c.calificador_id
    WHERE v.fecha_salida = '2026-09-23T19:00:00' AND cal.correo = 'sofia.hernandez@uadec.edu.mx'
)
    INSERT INTO Calificaciones (viaje_id, calificador_id, calificado_id, puntuacion, comentario)
    VALUES (
        (SELECT id FROM Viajes WHERE fecha_salida = '2026-09-23T19:00:00' AND origen = 'Campus Poniente'),
        (SELECT id FROM Usuarios WHERE correo = 'sofia.hernandez@uadec.edu.mx'),
        (SELECT id FROM Usuarios WHERE correo = 'eduardo.castillo@uadec.edu.mx'),
        4, 'Buen viaje, un poco de retraso al salir.'
    );
GO

-- ---------------------------------------------------------------------
-- 7. NOTIFICACIONES
-- ---------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Notificaciones WHERE titulo = 'Solicitud aceptada' AND usuario_id = (SELECT id FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx'))
    INSERT INTO Notificaciones (usuario_id, titulo, mensaje, leida, tipo)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx'),
        'Solicitud aceptada',
        'Tu solicitud para el viaje a Plaza Sendero fue aceptada.',
        0, 'solicitud'
    );

IF NOT EXISTS (SELECT 1 FROM Notificaciones WHERE titulo = 'Nueva solicitud de viaje' AND usuario_id = (SELECT id FROM Usuarios WHERE correo = 'luis.martinez@uadec.edu.mx'))
    INSERT INTO Notificaciones (usuario_id, titulo, mensaje, leida, tipo)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'luis.martinez@uadec.edu.mx'),
        'Nueva solicitud de viaje',
        'Ana García solicitó unirse a tu viaje del 25 de septiembre.',
        1, 'solicitud'
    );

IF NOT EXISTS (SELECT 1 FROM Notificaciones WHERE titulo = 'Solicitud pendiente' AND usuario_id = (SELECT id FROM Usuarios WHERE correo = 'sofia.hernandez@uadec.edu.mx'))
    INSERT INTO Notificaciones (usuario_id, titulo, mensaje, leida, tipo)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'sofia.hernandez@uadec.edu.mx'),
        'Solicitud pendiente',
        'Tu solicitud para el viaje al Centro de Saltillo está en revisión.',
        0, 'solicitud'
    );

IF NOT EXISTS (SELECT 1 FROM Notificaciones WHERE titulo = 'Calificación recibida' AND usuario_id = (SELECT id FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx'))
    INSERT INTO Notificaciones (usuario_id, titulo, mensaje, leida, tipo)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx'),
        'Calificación recibida',
        'Recibiste una calificación de 5 estrellas por tu último viaje.',
        0, 'calificacion'
    );

IF NOT EXISTS (SELECT 1 FROM Notificaciones WHERE titulo = 'Calificación recibida' AND usuario_id = (SELECT id FROM Usuarios WHERE correo = 'eduardo.castillo@uadec.edu.mx'))
    INSERT INTO Notificaciones (usuario_id, titulo, mensaje, leida, tipo)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'eduardo.castillo@uadec.edu.mx'),
        'Calificación recibida',
        'Recibiste una calificación de 4 estrellas por tu último viaje.',
        1, 'calificacion'
    );

IF NOT EXISTS (SELECT 1 FROM Notificaciones WHERE titulo = 'Nuevo viaje disponible' AND usuario_id = (SELECT id FROM Usuarios WHERE correo = 'daniela.flores@universidad.edu'))
    INSERT INTO Notificaciones (usuario_id, titulo, mensaje, leida, tipo)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'daniela.flores@universidad.edu'),
        'Nuevo viaje disponible',
        'Hay un nuevo viaje hacia el Aeropuerto de Saltillo.',
        0, 'viaje'
    );
GO