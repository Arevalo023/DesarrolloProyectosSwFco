IF COL_LENGTH('dbo.Vehiculos', 'activo') IS NULL
BEGIN
    ALTER TABLE dbo.Vehiculos
        ADD activo BIT NOT NULL CONSTRAINT DF_Vehiculos_activo DEFAULT (1);
END;
GO

UPDATE dbo.Vehiculos
SET activo = 1
WHERE activo IS NULL;
GO
