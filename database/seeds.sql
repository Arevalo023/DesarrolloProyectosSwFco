-- =====================================================================
-- SEEDS DE DATOS DE EJEMPLO (DEMO)
-- Objetivo: poblar todas las tablas con información realista para
-- poder trabajar y visualizar la app. Todos los INSERT son idempotentes
-- (usan IF NOT EXISTS), por lo que este script se puede ejecutar
-- varias veces sin duplicar información.
--
-- Ejecutar con:  npm run db:seed   (desde uniride-backend)
-- Requiere el esquema y catálogos de uniride.sql (db:seed lo aplica antes).
-- Si lo ejecutas a mano, selecciona antes la base "uniride".
--
-- Contraseña de TODOS los usuarios demo:  Demo1234!
--
-- Fechas de viajes: relativas al día en que se ejecuta por primera vez
-- (viajes activos en los próximos días, completados en días pasados).
-- Si los viajes demo ya existen NO se mueven de fecha; para refrescarlos
-- hay que borrarlos y volver a ejecutar el seed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. USUARIOS
-- ---------------------------------------------------------------------
-- bcrypt de 'Demo1234!'
DECLARE @demoHash VARCHAR(255) = '$2a$10$Avm4.1J2pOOyd8DCOn9PvOimYsPs5VrCYsh44eCcSsMK4Z1m1FfXO';

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Pasajero'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Arteaga'),
        'Ana', 'García', 'ana.garcia@uadec.edu.mx',
        @demoHash,
        '8441234501'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'luis.martinez@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Conductor'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Arteaga'),
        'Luis', 'Martínez', 'luis.martinez@uadec.edu.mx',
        @demoHash,
        '8441234502'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'sofia.hernandez@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Pasajero'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Poniente'),
        'Sofía', 'Hernández', 'sofia.hernandez@uadec.edu.mx',
        @demoHash,
        '8441234503'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'carlos.ramirez@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Conductor'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Poniente'),
        'Carlos', 'Ramírez', 'carlos.ramirez@uadec.edu.mx',
        @demoHash,
        '8441234504'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Conductor'), -- rol principal; también es Pasajero (ver UsuariosRoles)
        (SELECT id FROM Campus WHERE nombre = 'Campus Arteaga'),
        'María', 'López', 'maria.lopez@uadec.edu.mx',
        @demoHash,
        '8441234505'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'jorge.torres@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Administrador'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Arteaga'),
        'Jorge', 'Torres', 'jorge.torres@uadec.edu.mx',
        @demoHash,
        '8441234506'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'daniela.flores@universidad.edu')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Pasajero'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Central'),
        'Daniela', 'Flores', 'daniela.flores@universidad.edu',
        @demoHash,
        '8441234507'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'roberto.sanchez@universidad.edu')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Conductor'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Central'),
        'Roberto', 'Sánchez', 'roberto.sanchez@universidad.edu',
        @demoHash,
        '8441234508'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'paola.jimenez@universidad.edu')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Pasajero'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Central'),
        'Paola', 'Jiménez', 'paola.jimenez@universidad.edu',
        @demoHash,
        '8441234509'
    );

IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE correo = 'eduardo.castillo@uadec.edu.mx')
    INSERT INTO Usuarios (rol_id, campus_id, nombre, apellido, correo, password_hash, telefono)
    VALUES (
        (SELECT id FROM Roles WHERE nombre = 'Conductor'),
        (SELECT id FROM Campus WHERE nombre = 'Campus Poniente'),
        'Eduardo', 'Castillo', 'eduardo.castillo@uadec.edu.mx',
        @demoHash,
        '8441234510'
    );

-- Bases sembradas con la versión anterior tenían hashes falsos: se corrigen
UPDATE Usuarios
SET password_hash = @demoHash
WHERE password_hash LIKE '$2b$12$demoHash%';
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
-- Llave para no duplicar: conductor + origen + destino.
-- Fechas relativas a hoy (@hoy = medianoche del día de ejecución).
-- ---------------------------------------------------------------------
DECLARE @hoy DATETIME = CAST(CAST(GETDATE() AS DATE) AS DATETIME);

IF NOT EXISTS (
    SELECT 1 FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'luis.martinez@uadec.edu.mx' AND v.origen = 'Campus Arteaga' AND v.destino = 'Plaza Sendero, Saltillo'
)
    INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'luis.martinez@uadec.edu.mx'),
        (SELECT id FROM Vehiculos WHERE placa = 'SAL-001'),
        'Campus Arteaga', 'Plaza Sendero, Saltillo',
        DATEADD(MINUTE, 8 * 60, DATEADD(DAY, 2, @hoy)),      -- en 2 días, 08:00
        3, 35.00, 'activo'
    );

IF NOT EXISTS (
    SELECT 1 FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'carlos.ramirez@uadec.edu.mx' AND v.origen = 'Campus Poniente' AND v.destino = 'Centro de Saltillo'
)
    INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'carlos.ramirez@uadec.edu.mx'),
        (SELECT id FROM Vehiculos WHERE placa = 'SAL-002'),
        'Campus Poniente', 'Centro de Saltillo',
        DATEADD(MINUTE, 14 * 60, DATEADD(DAY, 2, @hoy)),     -- en 2 días, 14:00
        2, 30.00, 'activo'
    );

IF NOT EXISTS (
    SELECT 1 FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'maria.lopez@uadec.edu.mx' AND v.origen = 'Campus Arteaga' AND v.destino = 'Ramos Arizpe'
)
    INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx'),
        (SELECT id FROM Vehiculos WHERE placa = 'SAL-003'),
        'Campus Arteaga', 'Ramos Arizpe',
        DATEADD(MINUTE, 18 * 60, DATEADD(DAY, -1, @hoy)),    -- ayer, 18:00
        3, 40.00, 'completado'
    );

IF NOT EXISTS (
    SELECT 1 FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'roberto.sanchez@universidad.edu' AND v.origen = 'Campus Central' AND v.destino = 'Aeropuerto de Saltillo'
)
    INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'roberto.sanchez@universidad.edu'),
        (SELECT id FROM Vehiculos WHERE placa = 'SAL-004'),
        'Campus Central', 'Aeropuerto de Saltillo',
        DATEADD(MINUTE, 6 * 60 + 30, DATEADD(DAY, 3, @hoy)), -- en 3 días, 06:30
        4, 60.00, 'activo'
    );

IF NOT EXISTS (
    SELECT 1 FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'eduardo.castillo@uadec.edu.mx' AND v.origen = 'Campus Poniente' AND v.destino = 'Zona Centro'
)
    INSERT INTO Viajes (conductor_id, vehiculo_id, origen, destino, fecha_salida, cupo_disponible, costo_por_pasajero, estado)
    VALUES (
        (SELECT id FROM Usuarios WHERE correo = 'eduardo.castillo@uadec.edu.mx'),
        (SELECT id FROM Vehiculos WHERE placa = 'SAL-005'),
        'Campus Poniente', 'Zona Centro',
        DATEADD(MINUTE, 19 * 60, DATEADD(DAY, -2, @hoy)),    -- hace 2 días, 19:00
        3, 25.00, 'completado'
    );
GO

-- ---------------------------------------------------------------------
-- 5. SOLICITUDES DE VIAJE
-- ---------------------------------------------------------------------
-- Viajes demo (se ubican por conductor + origen + destino)
DECLARE @viajeSendero INT = (SELECT TOP 1 v.id FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'luis.martinez@uadec.edu.mx' AND v.origen = 'Campus Arteaga' AND v.destino = 'Plaza Sendero, Saltillo' ORDER BY v.id);
DECLARE @viajeCentro INT = (SELECT TOP 1 v.id FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'carlos.ramirez@uadec.edu.mx' AND v.origen = 'Campus Poniente' AND v.destino = 'Centro de Saltillo' ORDER BY v.id);
DECLARE @viajeRamos INT = (SELECT TOP 1 v.id FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'maria.lopez@uadec.edu.mx' AND v.origen = 'Campus Arteaga' AND v.destino = 'Ramos Arizpe' ORDER BY v.id);
DECLARE @viajeAeropuerto INT = (SELECT TOP 1 v.id FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'roberto.sanchez@universidad.edu' AND v.origen = 'Campus Central' AND v.destino = 'Aeropuerto de Saltillo' ORDER BY v.id);
DECLARE @viajeZonaCentro INT = (SELECT TOP 1 v.id FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'eduardo.castillo@uadec.edu.mx' AND v.origen = 'Campus Poniente' AND v.destino = 'Zona Centro' ORDER BY v.id);

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv JOIN Usuarios p ON p.id = sv.pasajero_id
    WHERE p.correo = 'ana.garcia@uadec.edu.mx' AND sv.viaje_id = @viajeSendero
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (@viajeSendero, (SELECT id FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx'), 'aceptada');

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv JOIN Usuarios p ON p.id = sv.pasajero_id
    WHERE p.correo = 'sofia.hernandez@uadec.edu.mx' AND sv.viaje_id = @viajeCentro
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (@viajeCentro, (SELECT id FROM Usuarios WHERE correo = 'sofia.hernandez@uadec.edu.mx'), 'pendiente');

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv JOIN Usuarios p ON p.id = sv.pasajero_id
    WHERE p.correo = 'daniela.flores@universidad.edu' AND sv.viaje_id = @viajeAeropuerto
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (@viajeAeropuerto, (SELECT id FROM Usuarios WHERE correo = 'daniela.flores@universidad.edu'), 'aceptada');

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv JOIN Usuarios p ON p.id = sv.pasajero_id
    WHERE p.correo = 'paola.jimenez@universidad.edu' AND sv.viaje_id = @viajeAeropuerto
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (@viajeAeropuerto, (SELECT id FROM Usuarios WHERE correo = 'paola.jimenez@universidad.edu'), 'pendiente');

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv JOIN Usuarios p ON p.id = sv.pasajero_id
    WHERE p.correo = 'ana.garcia@uadec.edu.mx' AND sv.viaje_id = @viajeRamos
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (@viajeRamos, (SELECT id FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx'), 'aceptada');

IF NOT EXISTS (
    SELECT 1 FROM SolicitudesViaje sv JOIN Usuarios p ON p.id = sv.pasajero_id
    WHERE p.correo = 'sofia.hernandez@uadec.edu.mx' AND sv.viaje_id = @viajeZonaCentro
)
    INSERT INTO SolicitudesViaje (viaje_id, pasajero_id, estado)
    VALUES (@viajeZonaCentro, (SELECT id FROM Usuarios WHERE correo = 'sofia.hernandez@uadec.edu.mx'), 'aceptada');
GO

-- ---------------------------------------------------------------------
-- 6. CALIFICACIONES (sobre los viajes ya completados)
-- ---------------------------------------------------------------------
DECLARE @viajeRamos INT = (SELECT TOP 1 v.id FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'maria.lopez@uadec.edu.mx' AND v.origen = 'Campus Arteaga' AND v.destino = 'Ramos Arizpe' ORDER BY v.id);
DECLARE @viajeZonaCentro INT = (SELECT TOP 1 v.id FROM Viajes v JOIN Usuarios u ON u.id = v.conductor_id
    WHERE u.correo = 'eduardo.castillo@uadec.edu.mx' AND v.origen = 'Campus Poniente' AND v.destino = 'Zona Centro' ORDER BY v.id);

IF NOT EXISTS (
    SELECT 1 FROM Calificaciones c JOIN Usuarios cal ON cal.id = c.calificador_id
    WHERE c.viaje_id = @viajeRamos AND cal.correo = 'ana.garcia@uadec.edu.mx'
)
    INSERT INTO Calificaciones (viaje_id, calificador_id, calificado_id, puntuacion, comentario)
    VALUES (
        @viajeRamos,
        (SELECT id FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx'),
        (SELECT id FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx'),
        5, 'Excelente conductora, muy puntual.'
    );

IF NOT EXISTS (
    SELECT 1 FROM Calificaciones c JOIN Usuarios cal ON cal.id = c.calificador_id
    WHERE c.viaje_id = @viajeRamos AND cal.correo = 'maria.lopez@uadec.edu.mx'
)
    INSERT INTO Calificaciones (viaje_id, calificador_id, calificado_id, puntuacion, comentario)
    VALUES (
        @viajeRamos,
        (SELECT id FROM Usuarios WHERE correo = 'maria.lopez@uadec.edu.mx'),
        (SELECT id FROM Usuarios WHERE correo = 'ana.garcia@uadec.edu.mx'),
        5, 'Buena pasajera, sin contratiempos.'
    );

IF NOT EXISTS (
    SELECT 1 FROM Calificaciones c JOIN Usuarios cal ON cal.id = c.calificador_id
    WHERE c.viaje_id = @viajeZonaCentro AND cal.correo = 'sofia.hernandez@uadec.edu.mx'
)
    INSERT INTO Calificaciones (viaje_id, calificador_id, calificado_id, puntuacion, comentario)
    VALUES (
        @viajeZonaCentro,
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
        'Ana García solicitó unirse a tu viaje a Plaza Sendero.',
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
