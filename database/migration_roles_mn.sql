USE uniride;
GO

-- 1. Crear tabla intermedia UsuariosRoles para soportar relación M:N
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UsuariosRoles')
BEGIN
    CREATE TABLE UsuariosRoles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        rol_id INT NOT NULL,
        fecha_asignacion DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_UsuariosRoles_Usuario FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE,
        CONSTRAINT FK_UsuariosRoles_Rol FOREIGN KEY (rol_id) REFERENCES Roles(id) ON DELETE CASCADE,
        CONSTRAINT UQ_Usuario_Rol UNIQUE (usuario_id, rol_id)
    );
    PRINT 'Tabla UsuariosRoles creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La tabla UsuariosRoles ya existe.';
END
GO

-- 2. Migrar los roles actuales de la tabla Usuarios a UsuariosRoles
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'rol_id')
BEGIN
    INSERT INTO UsuariosRoles (usuario_id, rol_id)
    SELECT u.id, u.rol_id
    FROM Usuarios u
    WHERE u.rol_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM UsuariosRoles ur 
          WHERE ur.usuario_id = u.id AND ur.rol_id = u.rol_id
      );
    PRINT 'Roles existentes migrados a UsuariosRoles.';
END
GO
