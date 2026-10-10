# 📄 Contrato Oficial de API - UniRide

Este documento define el **Contrato Oficial de Integración** entre el Backend (Node.js/Express) y el Frontend (React/Vite), así como la especificación de referencia para pruebas y consumo de servicios.

Colección de Postman disponible: [`UniRide.postman_collection.json`](file:///home/seb4stian53/Projects/DesarrolloProyectosSwFco/UniRide.postman_collection.json)

---

## 🌐 1. Información General

- **Base URL (Desarrollo):** `http://localhost:3000`
- **Formato de datos:** `application/json` (UTF-8)
- **Cabecera obligatoria para peticiones con cuerpo:**
  ```http
  Content-Type: application/json
  ```
- **CORS:** Habilitado para admitir peticiones desde el frontend (`http://localhost:5173` o cualquier origen local).

### Formato Estándar de Respuesta de Error
Todas las respuestas de error (`4xx` y `5xx`) retornan una estructura uniforme con la propiedad `message`:
```json
{
  "message": "Descripción clara del error para mostrar al usuario"
}
```
Si el error está asociado a control de acceso o roles, puede incluir opcionalmente `code` y `requiredRole`:
```json
{
  "message": "Cambia a modo Conductor para realizar esta acción.",
  "code": "ROLE_NOT_ACTIVE",
  "requiredRole": "Conductor"
}
```

---

## 🔑 2. Autenticación y Seguridad

Para los endpoints protegidos, se utiliza **JSON Web Tokens (JWT)** con esquema `Bearer`:
```http
Authorization: Bearer <tu_jwt_token_aqui>
```
- **Duración del token:** 24 horas (`JWT_EXPIRES_IN=24h`).
- **Expiración:** Si el token expira, el backend responderá con código `401 Unauthorized`:
  ```json
  { "message": "La sesión ha expirado. Por favor inicia sesión nuevamente." }
  ```
- **Estructura del Payload JWT (Soporte Roles M:N):**
  ```json
  {
    "id": 1,
    "correo": "juan.perez@uadec.edu.mx",
    "roles": ["Pasajero", "Conductor"],
    "rol": "Pasajero",
    "campus_id": 1,
    "iat": 1773610000,
    "exp": 1773696400
  }
  ```

### 2.1. Header de Rol Activo (`X-Active-Role`)
Cuando un usuario posee múltiples roles (por ejemplo, `Pasajero` y `Conductor`), puede enviar el encabezado:
```http
X-Active-Role: Conductor
```
- Si no se envía el header, el backend asume el rol primario (`rol` o `roles[0]`).
- Si se envía un rol que no corresponde a la cuenta del usuario:
  - **Código:** `403 Forbidden`
  - **Cuerpo:** `{ "message": "El rol activo no corresponde a tu cuenta.", "code": "INVALID_ACTIVE_ROLE" }`

### 2.2. Control de Acceso Basado en Roles (RBAC - `roleMiddleware`)
Para rutas con roles requeridos:
- Si el usuario no ha iniciado sesión o el token es inválido: `401 Unauthorized`.
- Si el usuario cuenta con el rol requerido en su cuenta pero no está activo en `X-Active-Role`:
  - **Código:** `403 Forbidden`
  - **Cuerpo:** `{ "message": "Cambia a modo <Rol> para realizar esta acción.", "code": "ROLE_NOT_ACTIVE", "requiredRole": "<Rol>" }`
- Si el usuario no posee el rol en su cuenta:
  - **Código:** `403 Forbidden`
  - **Cuerpo:** `{ "message": "Acceso denegado: No cuentas con los permisos necesarios para realizar esta acción." }`

---

## 📡 3. Especificación Detallada de Endpoints

---

### 3.1. Health Check
Verifica que el backend esté operativo.

- **Método:** `GET`
- **Ruta:** `/health`
- **Acceso:** Público

#### Respuestas
**`200 OK`**
```json
{
  "status": "UP",
  "message": "Server is healthy"
}
```

---

### 3.2. Módulo de Usuarios y Autenticación (`/users`)

#### 3.2.1. Registro de Usuario (`POST /users/register`)
- **Acceso:** Público
- **Body (JSON):**
  | Campo | Tipo | Requerido | Reglas |
  |---|---|---|---|
  | `name` / `nombre` | string | Sí | Mínimo 2 caracteres. Se divide automáticamente en nombre y apellido si viene completo. |
  | `apellido` | string | Opcional | Mínimo 2 caracteres (si se envía por separado). |
  | `email` / `correo` | string | Sí | Dominio institucional educativo (`.edu.mx`, `.edu`, `.mx`). |
  | `password` | string | Sí | Mínimo 8 caracteres, al menos 1 mayúscula, 1 número y 1 carácter especial. |
  | `telefono` | string | Opcional | Entre 10 y 15 dígitos numéricos. |
  | `campus_id` | number | Opcional | ID numérico del campus universitario. |

**Ejemplo de Request:**
```json
{
  "name": "Juan Perez",
  "email": "juan.perez@uadec.edu.mx",
  "password": "Password123!",
  "telefono": "8441234567",
  "campus_id": 1
}
```

**Respuestas:**
- **`201 Created`**:
  ```json
  {
    "message": "Usuario registrado exitosamente.",
    "user": {
      "id": 1,
      "nombre": "Juan",
      "apellido": "Perez",
      "correo": "juan.perez@uadec.edu.mx",
      "telefono": "8441234567",
      "roles": ["Pasajero"],
      "rol": "Pasajero",
      "campus_id": 1
    }
  }
  ```
- **`400 Bad Request`**: Datos inválidos o faltantes (`El nombre es requerido`, `El correo debe ser institucional...`, `La contraseña debe tener...`).
- **`409 Conflict`**: `"El correo institucional ya se encuentra registrado"`
- **`500 Internal Server Error`**: `"Error interno del servidor al registrar el usuario."`

---

#### 3.2.2. Inicio de Sesión (`POST /users/login`)
- **Acceso:** Público
- **Body (JSON):**
  ```json
  {
    "email": "juan.perez@uadec.edu.mx",
    "password": "Password123!"
  }
  ```

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "message": "Inicio de sesión exitoso.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "nombre": "Juan",
      "apellido": "Perez",
      "correo": "juan.perez@uadec.edu.mx",
      "telefono": "8441234567",
      "roles": ["Pasajero"],
      "rol": "Pasajero",
      "campus": "Campus Arteaga",
      "universidad": "Universidad Autónoma de Coahuila"
    }
  }
  ```
- **`400 Bad Request`**: `"El correo electrónico y la contraseña son requeridos."`
- **`401 Unauthorized`**: `"Credenciales incorrectas"`
- **`500 Internal Server Error`**: `"Error interno del servidor al iniciar sesión."`

---

#### 3.2.3. Perfil de Usuario Autenticado (`GET /users/me`)
- **Acceso:** Privado (`Authorization: Bearer <token>`)

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "user": {
      "id": 1,
      "nombre": "Juan",
      "apellido": "Perez",
      "correo": "juan.perez@uadec.edu.mx",
      "telefono": "8441234567",
      "roles": ["Pasajero"],
      "rol": "Pasajero",
      "campus": "Campus Arteaga",
      "campus_id": 1,
      "universidad": "Universidad Autónoma de Coahuila"
    }
  }
  ```
- **`401 Unauthorized`**: `"Acceso no autorizado: Token no proporcionado."` o expirado.
- **`404 Not Found`**: `"Usuario no encontrado"`

---

#### 3.2.4. Actualizar Perfil (`PATCH /users/me`)
- **Acceso:** Privado (`Authorization: Bearer <token>`)
- **Body (JSON):**
  ```json
  {
    "nombre": "Juan Carlos",
    "apellido": "Perez",
    "telefono": "8449876543",
    "campus_id": 1
  }
  ```

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "message": "Perfil actualizado correctamente.",
    "user": {
      "id": 1,
      "nombre": "Juan Carlos",
      "apellido": "Perez",
      "correo": "juan.perez@uadec.edu.mx",
      "telefono": "8449876543",
      "campus_id": 1
    }
  }
  ```
- **`400 Bad Request`**: Error en formato de nombre, apellido, teléfono o campus.
- **`401 Unauthorized`**: Token no válido o ausente.

---

#### 3.2.5. Catálogo de Campus (`GET /users/campuses`)
- **Acceso:** Privado (`Authorization: Bearer <token>`)

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "campuses": [
      { "id": 1, "nombre": "Campus Arteaga", "ciudad": "Arteaga" },
      { "id": 2, "nombre": "Campus Poniente", "ciudad": "Saltillo" }
    ]
  }
  ```

---

### 3.3. Módulo de Vehículos (`/api/vehicles`)

Todos los endpoints requieren `Authorization: Bearer <token>`.

#### 3.3.1. Registrar Vehículo (`POST /api/vehicles`)
Registra un nuevo vehículo y, en caso de que el usuario no cuente con el rol `Conductor`, se le asigna automáticamente y se retorna una nueva sesión con el token actualizado.

- **Body (JSON):**
  | Campo | Tipo | Requerido | Reglas |
  |---|---|---|---|
  | `marca` | string | Sí | Mínimo 2 caracteres. |
  | `modelo` | string | Sí | Mínimo 1 carácter. |
  | `anio` | number | Sí | Entero (año del vehículo). |
  | `color` | string | Sí | Mínimo 2 caracteres. |
  | `placa` | string | Sí | Única en el sistema. |
  | `asientos_disponibles` | number | Sí | Entero positivo. |

**Ejemplo de Request:**
```json
{
  "marca": "Nissan",
  "modelo": "Versa",
  "anio": 2022,
  "color": "Blanco",
  "placa": "SAL-102",
  "asientos_disponibles": 4
}
```

**Respuestas:**
- **`201 Created` (Si el usuario ya era conductor):**
  ```json
  {
    "message": "Vehículo registrado exitosamente.",
    "vehicle": {
      "id": 1,
      "usuario_id": 1,
      "marca": "Nissan",
      "modelo": "Versa",
      "anio": 2022,
      "color": "Blanco",
      "placa": "SAL-102",
      "asientos_disponibles": 4,
      "activo": true
    }
  }
  ```
- **`201 Created` (Si se le asignó rol Conductor automáticamente):**
  ```json
  {
    "message": "Vehículo registrado exitosamente. Ahora también eres Conductor.",
    "vehicle": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... },
    "rolAgregado": "Conductor"
  }
  ```
- **`400 Bad Request`**: Datos inválidos en marca, modelo, año, color, placa o asientos.
- **`409 Conflict`**: `"La placa ya está registrada"`

---

#### 3.3.2. Listar Mis Vehículos (`GET /api/vehicles/user`)
Retorna los vehículos pertenecientes al usuario autenticado.

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "vehicles": [
      {
        "id": 1,
        "usuario_id": 1,
        "marca": "Nissan",
        "modelo": "Versa",
        "anio": 2022,
        "color": "Blanco",
        "placa": "SAL-102",
        "asientos_disponibles": 4,
        "activo": true
      }
    ]
  }
  ```

---

#### 3.3.3. Obtener Vehículo por ID (`GET /api/vehicles/:id`)
**Respuestas:**
- **`200 OK`**: `{ "vehicle": { "id": 1, ... } }`
- **`400 Bad Request`**: `"El ID debe ser un número entero."`
- **`404 Not Found`**: `"Vehículo no encontrado."`

---

#### 3.3.4. Actualizar Vehículo (`PUT /api/vehicles/:id`)
Permite al dueño del vehículo modificar sus datos.

**Respuestas:**
- **`200 OK`**: `{ "message": "Vehículo actualizado exitosamente.", "vehicle": { ... } }`
- **`403 Forbidden`**: `"No tienes permiso para modificar este vehículo"`
- **`404 Not Found`**: `"Vehículo no encontrado"`
- **`409 Conflict`**: `"La placa ya está registrada por otro vehículo"`

---

#### 3.3.5. Cambiar Estado Activo/Inactivo (`PATCH /api/vehicles/:id/status`)
- **Body (JSON):**
  ```json
  { "activo": false }
  ```

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "message": "Estado del vehículo actualizado exitosamente.",
    "vehicle": { "id": 1, "activo": false }
  }
  ```
- **`400 Bad Request`**: `"El campo activo es obligatorio y debe ser true o false."`
- **`403 Forbidden`**: `"No tienes permiso para modificar este vehículo"`
- El rol `Conductor` se agrega o retira según el usuario conserve al menos un vehículo activo. Si el rol cambia, la respuesta incluye `token`, `user` y `rolAgregado` o `rolRetirado`; el frontend debe reemplazar la sesión.
- **`409 Conflict`**: No se puede desactivar un vehículo con viajes activos/programados futuros.

#### 3.3.6. Eliminar Vehículo (`DELETE /api/vehicles/:id`)
- El dueño puede eliminarlo solo si no tiene viajes próximos.
- Si tiene viajes históricos, se desactiva para conservar la integridad referencial.
- Si el último vehículo activo deja de estar disponible, la respuesta puede incluir una sesión actualizada y `rolRetirado: "Conductor"`.
- **`409 Conflict`**: El vehículo tiene viajes activos/programados futuros; primero deben cancelarse.

---

### 3.4. Módulo de Viajes (`/api/trips`)

#### 3.4.1. Publicar Viaje (`POST /api/trips`)
- **Acceso:** Privado (`Authorization: Bearer <token>`, requiere rol `Conductor` en `X-Active-Role` o principal).
- **Body (JSON):**
  | Campo | Tipo | Requerido | Descripción |
  |---|---|---|---|
  | `vehiculo_id` | number | Sí | ID del vehículo propio (debe estar activo). |
  | `origen` | string | Sí | Dirección / campus de origen. |
  | `destino` | string | Sí | Dirección / campus de destino. |
  | `fecha_salida` | string | Sí | Fecha y hora ISO (o combinar `fecha` y `hora`). |
  | `cupo_disponible` | number | Sí | Cupo de asientos disponibles (no puede superar la capacidad del auto). |
  | `costo_por_pasajero` | number | Sí | Tarifa por pasajero (>= 0). |

**Ejemplo de Request:**
```json
{
  "vehiculo_id": 1,
  "origen": "Campus Poniente",
  "destino": "Rectoría UAdeC",
  "fecha_salida": "2026-10-15T08:00:00.000Z",
  "cupo_disponible": 3,
  "costo_por_pasajero": 25.00
}
```

**Respuestas:**
- **`201 Created`**:
  ```json
  {
    "message": "Viaje publicado correctamente.",
    "trip": {
      "id": 10,
      "conductor_id": 1,
      "vehiculo_id": 1,
      "origen": "Campus Poniente",
      "destino": "Rectoría UAdeC",
      "fecha_salida": "2026-10-15T08:00:00.000Z",
      "cupo_disponible": 3,
      "asientos_disponibles": 3,
      "costo_por_pasajero": 25.00,
      "estado": "programado",
      "conductor": "Juan Perez",
      "conductor_telefono": "8441234567",
      "marca": "Nissan",
      "modelo": "Versa",
      "color": "Blanco",
      "placa": "SAL-102"
    }
  }
  ```
- **`400 Bad Request`**: Datos incompletos, vehículo inactivo o fecha de salida en el pasado.
- **`403 Forbidden`**: No cuenta con rol Conductor (`ROLE_NOT_ACTIVE`).

---

#### 3.4.2. Listar Viajes Publicados por Conductor (`GET /api/trips/driver`)
- **Acceso:** Privado (`Conductor`).

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "trips": [
      {
        "id": 10,
        "origen": "Campus Poniente",
        "destino": "Rectoría UAdeC",
        "fecha_salida": "2026-10-15T08:00:00.000Z",
        "cupo_disponible": 3,
        "asientos_disponibles": 3,
        "costo_por_pasajero": 25.00,
        "estado": "programado",
        "usuarios_separaron_asiento": 1,
        "vehiculo_marca": "Nissan",
        "vehiculo_modelo": "Versa",
        "vehiculo_placa": "SAL-102",
        "vehiculo_activo": true
      }
    ]
  }
  ```

---

#### 3.4.3. Listar Solicitudes Recibidas (`GET /api/trips/driver/requests`)
- **Acceso:** Privado (`Conductor`). Solo devuelve solicitudes de viajes publicados por el conductor autenticado.
- **Respuesta `200 OK`:**
  ```json
  {
    "requests": [
      {
        "id": 25,
        "viaje_id": 10,
        "pasajero_id": 8,
        "estado": "pendiente",
        "fecha_solicitud": "2026-10-09T16:30:00.000Z",
        "pasajero_nombre": "Ana López",
        "origen": "Campus Poniente",
        "destino": "Rectoría UAdeC",
        "fecha_salida": "2026-10-15T08:00:00.000Z",
        "viaje_estado": "programado"
      }
    ]
  }
  ```
- Si no hay solicitudes, responde `200 OK` con `{ "requests": [] }`.
- **`401 Unauthorized`**: Token ausente o inválido.
- **`403 Forbidden`**: El usuario no tiene el rol activo de Conductor.

---

#### 3.4.4. Buscar Viajes Disponibles (`GET /api/trips`)
- **Acceso:** Privado (cualquier usuario autenticado).
- **Query Params:**
  - `origen` (opcional): Filtro parcial de origen.
  - `destino` (opcional): Filtro parcial de destino.
  - `fecha` (opcional): Fecha en formato `YYYY-MM-DD`.
  - `fecha_inicio` (opcional): Inicio inclusivo del rango, en formato `YYYY-MM-DD`.
  - `fecha_fin` (opcional): Fin inclusivo del rango, en formato `YYYY-MM-DD`.
  - `hora_desde` (opcional): Hora inicial inclusiva, formato `HH:MM`.
  - `hora_hasta` (opcional): Hora final inclusiva, formato `HH:MM`.
  - `cupo_minimo` (opcional): Número entero mínimo de asientos disponibles (mayor o igual a cero).
  - `limit` (opcional): Tamaño de página entre 1 y 50 (por defecto 10).
  - `offset` (opcional): Número de resultados a omitir (por defecto 0).
- Los viajes publicados por el usuario autenticado no aparecen en los resultados.

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "trips": [
      {
        "id": 10,
        "origen": "Campus Poniente",
        "destino": "Rectoría UAdeC",
        "fecha_salida": "2026-10-15T08:00:00.000Z",
        "cupo_disponible": 3,
        "asientos_disponibles": 3,
        "costo_por_pasajero": 25.00,
        "estado": "activo",
        "conductor": "Juan Perez",
        "conductor_id": 1,
        "conductor_telefono": "8441234567",
        "marca": "Nissan",
        "modelo": "Versa",
        "color": "Blanco",
        "placa": "SAL-102"
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "hasMore": true,
      "nextOffset": 10
    }
  }
  ```
- **`400 Bad Request`**: `"El formato de fecha debe ser YYYY-MM-DD."`
- **`400 Bad Request`**: Si la fecha u hora no tiene el formato indicado, un rango está invertido, el cupo mínimo no es entero no negativo o un filtro se repite.
- Cuando no existan viajes que coincidan, responde `200 OK` con `trips: []` y `pagination.hasMore: false` (`nextOffset: null`).
- **`400 Bad Request`**: `limit` no está entre 1 y 50, o `offset` no es un entero no negativo.
- `pagination.hasMore` indica si hay más resultados y `nextOffset` contiene el `offset` de la siguiente página, o `null` al final.

---

#### 3.4.5. Cancelar Viaje Publicado (`PATCH /api/trips/:id/cancel`)
- **Acceso:** Privado (`Conductor`), solo el dueño del viaje.
- **Body opcional:** `motivo_cancelacion` (máximo 250 caracteres).
- Solo se pueden cancelar viajes activos/programados cuya salida aún no haya ocurrido.
- La cancelación y el cambio a `cancelada` de todas las solicitudes `pendiente`/`aceptada` se realizan en una transacción. Se crea una notificación `viaje_cancelado` para cada pasajero afectado.
- **`200 OK`**: El viaje queda con estado `cancelado`; ya no aparece en `GET /api/trips`.
- **`404 Not Found`**: El viaje no existe, no pertenece al conductor o no puede cancelarse.
- **`400 Bad Request`**: ID inválido o motivo mayor a 250 caracteres.

---

#### 3.4.6. Reservar Asiento en Viaje (`POST /api/trips/:id/book`)
Permite a un usuario con rol `Pasajero` solicitar un asiento en un viaje.
> **Regla de Negocio:** La solicitud se crea con estado `pendiente`. **El cupo disponible NO se descuenta** al reservar; se descuenta únicamente cuando el conductor confirma y acepta la solicitud (`PATCH /api/reservations/:id`).

- **Acceso:** Privado (`Pasajero`).
- **Parámetros de Ruta:** `id` (entero positivo, ID del viaje).

**Respuestas:**
- **`201 Created`**:
  ```json
  {
    "message": "Reserva realizada correctamente.",
    "booking": {
      "id": 15,
      "viaje_id": 10,
      "pasajero_id": 2,
      "estado": "pendiente",
      "fecha_solicitud": "2026-10-07T12:00:00.000Z",
      "asientos_restantes": 3
    }
  }
  ```
- **`400 Bad Request`**:
  - `"El ID del viaje debe ser un número entero positivo."`
  - `"No puedes reservar tu propio viaje como conductor."`
  - `"No es posible reservar un viaje cuya fecha u hora ya ha transcurrido."`
- **`404 Not Found`**: `"El viaje solicitado no existe."`
- **`409 Conflict`**:
  - `"El cupo para este viaje se encuentra agotado."`
  - `"Ya tienes una reservación activa para este viaje."`

---

#### 3.4.7. Mis Reservaciones de Viaje (`GET /api/trips/reservations`)
Permite a un pasajero consultar todas sus reservaciones realizadas.
*(Disponible también en el alias `GET /api/reservations`)*

- **Acceso:** Privado.
- **Query Params:**
  - `order` (opcional): `'asc'` (por defecto, próximos primero) o `'desc'`.

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "reservations": [
      {
        "id": 15,
        "viaje_id": 10,
        "pasajero_id": 2,
        "estado": "pendiente",
        "fecha_solicitud": "2026-10-07T12:00:00.000Z",
        "origen": "Campus Poniente",
        "destino": "Rectoría UAdeC",
        "fecha_salida": "2026-10-15T08:00:00.000Z",
        "cupo_disponible": 3,
        "asientos_disponibles": 3,
        "costo_por_pasajero": 25.00,
        "viaje_estado": "programado",
        "conductor_id": 1,
        "conductor_nombre": "Juan Perez",
        "conductor_telefono": "8441234567",
        "vehiculo_id": 1,
        "vehiculo_marca": "Nissan",
        "vehiculo_modelo": "Versa",
        "vehiculo_color": "Blanco",
        "vehiculo_placa": "SAL-102"
      }
    ]
  }
  ```

---

### 3.5. Módulo de Reservaciones (`/api/reservations`)

#### 3.5.1. Aceptar o Rechazar Solicitud de Reserva (`PATCH /api/reservations/:id`)
El conductor dueño del viaje acepta o rechaza la solicitud de un pasajero.

- **Acceso:** Privado (Solo el conductor dueño del viaje: `Viajes.conductor_id = req.user.id`).
- **Parámetros de Ruta:** `id` (ID de la solicitud en `SolicitudesViaje`).
- **Body (JSON):**
  ```json
  { "estado": "aceptada" }
  ```
  *(Valores válidos: `"aceptada"` o `"rechazada"`)*

**Reglas de Negocio:**
- Al pasar a `aceptada`: Se descuenta 1 de `Viajes.cupo_disponible` de manera atómica con bloqueo transaccional.
- Al pasar a `rechazada`: No modifica el cupo.
- Solo pueden responderse solicitudes en estado inicial `pendiente`.

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "message": "Solicitud aceptada correctamente.",
    "reservation": {
      "id": 15,
      "viaje_id": 10,
      "pasajero_id": 2,
      "estado": "aceptada",
      "asientos_restantes": 2
    }
  }
  ```
- **`400 Bad Request`**:
  - `"El ID de la solicitud debe ser un número entero positivo."`
  - `"El estado debe ser 'aceptada' o 'rechazada'."`
  - `"El viaje ya no admite solicitudes."`
- **`403 Forbidden`**: `"Solo el conductor dueño del viaje puede gestionar esta solicitud."`
- **`404 Not Found`**: `"La solicitud no existe."`
- **`409 Conflict`**:
  - `"La solicitud ya fue resuelta (estado actual: aceptada)."`
  - `"No hay cupo disponible en este viaje."`

---

#### 3.5.2. Cancelar Reservación (`PATCH /api/reservations/:id/cancel`)
Permite al pasajero titular o al conductor cancelar una reservación.

- **Acceso:** Privado (Pasajero titular de la reserva O Conductor dueño del viaje).
- **Parámetros de Ruta:** `id` (ID de la solicitud en `SolicitudesViaje`).

**Reglas de Negocio:**
- Una solicitud `pendiente` no consume cupo. El cupo se descuenta al aceptar la solicitud y no cambia al rechazarla.
- Si la reservación estaba en estado `aceptada`: **restituye 1 asiento** en `Viajes.cupo_disponible` (`+1`).
- Si estaba en estado `pendiente`: cambia a `cancelada` sin modificar cupo.
- Bloquea la cancelación si el viaje ya inició o su fecha de salida ya transcurrió.
- Rechaza con `409 Conflict` si ya estaba previamente `cancelada` o `rechazada`.

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "message": "Reservación cancelada correctamente.",
    "reservation": {
      "id": 15,
      "viaje_id": 10,
      "pasajero_id": 2,
      "estado": "cancelada",
      "cancelado_por": "pasajero",
      "asientos_restantes": 3
    }
  }
  ```
- **`400 Bad Request`**:
  - `"El ID de la reservación debe ser un número entero positivo."`
  - `"El tiempo límite para cancelar la reservación ha expirado o el viaje ya inició."`
  - `"El viaje ya no está disponible para cancelaciones."`
- **`403 Forbidden`**: `"No tienes permisos para cancelar esta reservación."`
- **`404 Not Found`**: `"La reservación no existe."`
- **`409 Conflict`**:
  - `"La reservación ya se encuentra cancelada."`
  - `"No se puede cancelar una reservación rechazada."`

---

### 3.6. Módulo de Notificaciones (`/api/notifications`)

#### 3.6.1. Listar Notificaciones (`GET /api/notifications`)
Consulta el historial de notificaciones generadas para el usuario autenticado (ej. solicitudes recibidas, confirmaciones, cancelaciones).

- **Acceso:** Privado (`Authorization: Bearer <token>`).
- **Query Params:**
  - `noLeidas` (opcional): Si es `true`, filtra únicamente notificaciones con `leida = 0`.

**Respuestas:**
- **`200 OK`**:
  ```json
  {
    "notifications": [
      {
        "id": 1,
        "usuario_id": 2,
        "solicitud_id": 15,
        "viaje_id": 10,
        "tipo": "reserva_aceptada",
        "titulo": "¡Tu solicitud de viaje fue aceptada!",
        "mensaje": "El conductor aceptó tu reservación para el viaje a Rectoría UAdeC.",
        "leida": false,
        "fecha_creacion": "2026-10-07T12:05:00.000Z"
      }
    ]
  }
  ```

#### 3.6.2. Marcar una Notificación como Leída (`PATCH /api/notifications/:id/read`)
- Solo modifica notificaciones pertenecientes al usuario autenticado.
- **`200 OK`**: `{ "notification": { "id": 1, "leida": true, ... } }`
- **`400 Bad Request`**: ID no entero positivo.
- **`404 Not Found`**: La notificación no existe o no pertenece al usuario.

#### 3.6.3. Marcar Todas como Leídas (`PATCH /api/notifications/read-all`)
- Actualiza únicamente las notificaciones no leídas del usuario autenticado.
- **`200 OK`**: `{ "updated": 3 }`, donde `updated` es el número de filas cambiadas.

---

## 📊 4. Matriz de Códigos de Estado HTTP

| Código | Significado | Escenario Típico en UniRide |
|---|---|---|
| **200 OK** | Éxito en consulta o actualización | GET exitoso, PATCH/PUT aplicado correctamente. |
| **201 Created** | Recurso creado exitosamente | Usuario registrado, viaje publicado, vehículo registrado, reserva creada. |
| **400 Bad Request** | Datos faltantes o formato inválido | Fechas mal formateadas, email no institucional, ID no entero positivo. |
| **401 Unauthorized** | Autenticación ausente o inválida | Token no enviado, token expirado o firma incorrecta. |
| **403 Forbidden** | Permisos insuficientes | Rol activo incorrecto, intentar modificar vehículo o viaje ajeno. |
| **404 Not Found** | Recurso no encontrado | ID de viaje, vehículo, usuario o reserva inexistente. |
| **409 Conflict** | Conflicto con estado del recurso | Correo duplicado, placa repetida, viaje sin cupo, reserva duplicada o ya resuelta. |
| **500 Internal Error** | Error no controlado en el servidor | Falla en base de datos o excepción no capturada. |

---

## 🧪 5. Ejemplos Rápidos con cURL

```bash
# 1. Health Check
curl -X GET http://localhost:3000/health

# 2. Login
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"luis.martinez@uadec.edu.mx","password":"Demo1234!"}'

# 3. Registrar Vehículo
curl -X POST http://localhost:3000/api/vehicles \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"marca":"Nissan","modelo":"Versa","anio":2022,"color":"Rojo","placa":"ABC-999","asientos_disponibles":4}'

# 4. Publicar Viaje (Conductor)
curl -X POST http://localhost:3000/api/trips \
  -H "Authorization: Bearer <TOKEN_CONDUCTOR>" \
  -H "X-Active-Role: Conductor" \
  -H "Content-Type: application/json" \
  -d '{"vehiculo_id":1,"origen":"Campus Poniente","destino":"Rectoría","fecha_salida":"2026-10-20T08:00:00.000Z","cupo_disponible":3,"costo_por_pasajero":20}'

# 5. Buscar Viajes Disponibles
curl -X GET "http://localhost:3000/api/trips?origen=Poniente" \
  -H "Authorization: Bearer <TOKEN>"

# 6. Reservar Asiento en Viaje ID 1 (Pasajero)
curl -X POST http://localhost:3000/api/trips/1/book \
  -H "Authorization: Bearer <TOKEN_PASAJERO>" \
  -H "X-Active-Role: Pasajero"

# 7. Consultar Mis Reservaciones
curl -X GET http://localhost:3000/api/trips/reservations \
  -H "Authorization: Bearer <TOKEN_PASAJERO>"

# 8. Conductor Acepta Reservación ID 2
curl -X PATCH http://localhost:3000/api/reservations/2 \
  -H "Authorization: Bearer <TOKEN_CONDUCTOR>" \
  -H "Content-Type: application/json" \
  -d '{"estado":"aceptada"}'

# 9. Cancelar Reservación ID 2
curl -X PATCH http://localhost:3000/api/reservations/2/cancel \
  -H "Authorization: Bearer <TOKEN_PASAJERO>"

# 10. Consultar Notificaciones
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <TOKEN>"
```
