# Base de datos UniRide

| Archivo | Qué es |
|---|---|
| `uniride.sql` | Esquema completo: tablas, llaves foráneas, catálogos (roles, universidad, campus) y sincronización de roles. **Única fuente del esquema.** |
| `seeds.sql` | Datos demo (usuarios, vehículos, viajes, solicitudes, calificaciones, notificaciones). |

Ambos son **idempotentes**: se pueden ejecutar varias veces sin errores ni duplicados.

## Uso

Desde `uniride-backend/`, con SQL Server corriendo (`docker compose up -d` en la raíz):

```bash
npm run db:init   # crea la base si no existe + uniride.sql + verificación
npm run db:seed   # lo mismo + seeds.sql
```

Al final se imprime un checklist ✅/❌ de tablas, relaciones, roles y sincronización de roles en vehículos.

## Configuración (.env de uniride-backend)

Con `docker-compose.yml`:

```
DB_SERVER=localhost
DB_PORT=11433
DB_USER=sa
DB_PASSWORD=<SA_PASSWORD de docker-compose.yml>
DB_NAME=uniride
```

## Usuarios demo

Contraseña de todos: `Demo1234!`

| Correo | Rol |
|---|---|
| ana.garcia@uadec.edu.mx | Pasajero |
| luis.martinez@uadec.edu.mx | Conductor |
| maria.lopez@uadec.edu.mx | Conductor + Pasajero |
| jorge.torres@uadec.edu.mx | Administrador |

(ver `seeds.sql` para el resto)

## Notas

- Las fechas de los viajes demo se calculan el día en que se ejecuta el seed por primera vez. Si ya existen, **no se mueven**: para tener viajes futuros otra vez, borra los viajes demo (y sus solicitudes/calificaciones) y vuelve a ejecutar `npm run db:seed`.
- Las antiguas `migration_roles_mn.sql` y `migration_add_activo_vehiculos.sql` quedaron integradas en `uniride.sql`; ejecutarlo sobre una base vieja la actualiza.
- Si lo ejecutas a mano (SSMS / Azure Data Studio), selecciona antes la base `uniride`: los archivos no hacen `CREATE DATABASE` ni `USE`.
