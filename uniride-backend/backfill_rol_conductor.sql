-- Ejecutar UNA sola vez.
-- Da el rol Conductor a usuarios que ya tenían vehículos registrados
-- antes de que registrar un vehículo asignara el rol automáticamente.
-- Esos usuarios deben cerrar sesión y volver a entrar para ver el cambio.

INSERT INTO UsuariosRoles (usuario_id, rol_id)
SELECT DISTINCT v.usuario_id, r.id
FROM Vehiculos v
CROSS JOIN Roles r
WHERE LOWER(r.nombre) = 'conductor'
  AND NOT EXISTS (
    SELECT 1
    FROM UsuariosRoles ur
    WHERE ur.usuario_id = v.usuario_id
      AND ur.rol_id = r.id
  );
