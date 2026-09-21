# 📄 Contrato de API - UniRide (Autenticación, Usuarios y Viajes)

Este documento define el **Contrato Oficial de Integración** entre el Backend (Node.js/Express) y el Frontend (React/Vite).

---

## 🌐 1. Información General

- **Base URL (Desarrollo):** `http://localhost:3000`
- **Formato de datos:** `JSON`
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

---

## 🔑 2. Autenticación y Seguridad

Para los endpoints protegidos (como `/users/me`), se utiliza **JSON Web Tokens (JWT)** con esquema `Bearer`:
```http
Authorization: Bearer <tu_jwt_token_aqui>
```
- **Duración del token:** 24 horas (`JWT_EXPIRES_IN=24h`).
- **Expiración:** Si el token expira, el backend responderá con código `401 Unauthorized` y el mensaje `"La sesión ha expirado. Por favor inicia sesión nuevamente."`.
- **Estructura del Payload JWT (Soporte M:N):**
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
  *(Nota: `roles` contiene el array completo de roles asignados al usuario. `rol` se conserva con el rol primario por retrocompatibilidad).*

### 2.1. Control de Acceso Basado en Roles (RBAC - `roleMiddleware`)
Para endpoints con restricción de roles (por ejemplo, registrar o publicar viajes que requieren rol `Conductor`, o módulos administrativos):
- Si el usuario no tiene la sesión iniciada o el token es inválido: `401 Unauthorized`.
- Si el usuario está autenticado pero no cuenta con ninguno de los roles requeridos para la ruta:
  - **Código:** `403 Forbidden`
  - **Cuerpo de Respuesta:**
    ```json
    {
      "message": "Acceso denegado: No cuentas con los permisos necesarios para realizar esta acción."
    }
    ```

---

## 📡 3. Especificación de Endpoints

---

### 3.1. Health Check
Verifica que el servidor backend esté encendido y operativo.

- **Método:** `GET`
- **Ruta:** `/health`
- **Acceso:** Público
- **Headers:** Ninguno requerido

#### Respuestas
**`200 OK`**
```json
{
  "status": "UP",
  "message": "Server is healthy"
}
```

---

### 3.2. Registro de Usuario
Crea una nueva cuenta de usuario en el sistema.

- **Método:** `POST`
- **Ruta:** `/users/register`
- **Acceso:** Público
- **Headers:** `Content-Type: application/json`

#### Cuerpo de la Petición (`Request Body`)
| Campo | Tipo | Requerido | Descripción / Reglas |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Sí** | Nombre completo (mínimo 2 caracteres). El backend separa automáticamente en nombre y apellido. |
| `email` | `string` | **Sí** | Correo institucional con formato válido. |
| `password` | `string` | **Sí** | Contraseña (mínimo 8 caracteres). |
| `telefono` | `string` | *Opcional* | Número de teléfono (entre 7 y 20 caracteres numéricos/guiones). |
| `rol_id` | `number` | *Opcional* | Por defecto `1` (*Pasajero*). |
| `campus_id` | `number` | *Opcional* | Por defecto `1` (*Campus Arteaga*). |

##### Ejemplo de Payload:
```json
{
  "name": "Juan Perez",
  "email": "juan.perez@uadec.edu.mx",
  "password": "Password123",
  "telefono": "8441234567"
}
```

#### Respuestas

**`201 Created` - Usuario creado exitosamente**
```json
{
  "message": "Usuario registrado exitosamente.",
  "user": {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Perez",
    "correo": "juan.perez@uadec.edu.mx",
    "telefono": "8441234567",
    "roles": [
      "Pasajero"
    ],
    "rol": "Pasajero",
    "rol_id": 1,
    "campus_id": 1,
    "fecha_registro": "2026-09-07T21:40:00.000Z"
  }
}
```

**`400 Bad Request` - Error de validación de datos**
```json
{
  "message": "El nombre completo es requerido (mínimo 2 caracteres)."
}
```
*(Posibles mensajes: `"El correo electrónico es requerido."`, `"El formato del correo electrónico no es válido."`, `"La contraseña debe tener al menos 8 caracteres."`, `"El teléfono debe ser un formato válido (entre 7 y 20 dígitos numéricos)."`)*

**`409 Conflict` - Correo duplicado**
```json
{
  "message": "El correo institucional ya se encuentra registrado"
}
```

**`500 Internal Server Error` - Error inesperado del servidor**
```json
{
  "message": "Error interno del servidor al registrar el usuario."
}
```

---

### 3.3. Inicio de Sesión (Login)
Autentica al usuario y devuelve el token de sesión JWT junto con sus datos de perfil.

- **Método:** `POST`
- **Ruta:** `/users/login`
- **Acceso:** Público
- **Headers:** `Content-Type: application/json`

#### Cuerpo de la Petición (`Request Body`)
| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `email` | `string` | **Sí** | Correo institucional registrado. |
| `password` | `string` | **Sí** | Contraseña del usuario. |

##### Ejemplo de Payload:
```json
{
  "email": "juan.perez@uadec.edu.mx",
  "password": "Password123"
}
```

#### Respuestas

**`200 OK` - Autenticación exitosa**
```json
{
  "message": "Inicio de sesión exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiY29ycmVvIjoianVhbi5wZXJlei... ",
  "user": {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Perez",
    "correo": "juan.perez@uadec.edu.mx",
    "telefono": "8441234567",
    "roles": [
      "Pasajero"
    ],
    "rol": "Pasajero",
    "campus": "Campus Arteaga",
    "universidad": "Universidad Autónoma de Coahuila"
  }
}
```

**`400 Bad Request` - Faltan credenciales**
```json
{
  "message": "El correo electrónico y la contraseña son requeridos."
}
```

**`401 Unauthorized` - Credenciales incorrectas**
```json
{
  "message": "Credenciales incorrectas"
}
```

**`500 Internal Server Error`**
```json
{
  "message": "Error interno del servidor al iniciar sesión."
}
```

---

### 3.4. Obtener Perfil Autenticado
Obtiene la información actualizada del usuario autenticado a partir del token JWT.

- **Método:** `GET`
- **Ruta:** `/users/me`
- **Acceso:** Privado (Protegido con JWT)
- **Headers Requeridos:**
  ```http
  Authorization: Bearer <token>
  ```

#### Respuestas

**`200 OK` - Perfil obtenido**
```json
{
  "user": {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Perez",
    "correo": "juan.perez@uadec.edu.mx",
    "telefono": "8441234567",
    "roles": [
      "Pasajero"
    ],
    "rol": "Pasajero",
    "campus": "Campus Arteaga",
    "universidad": "Universidad Autónoma de Coahuila",
    "fecha_registro": "2026-09-07T21:40:00.000Z"
  }
}
```

**`401 Unauthorized` - Token ausente o inválido**
```json
{
  "message": "Acceso no autorizado: Token no proporcionado."
}
```
*O si el token ya expiró:*
```json
{
  "message": "La sesión ha expirado. Por favor inicia sesión nuevamente."
}
```

**`404 Not Found` - Usuario no existe en la base de datos**
```json
{
  "message": "Usuario no encontrado"
}
```

---

### 3.5. Consultar Viajes Disponibles
Obtiene el listado de viajes programados o activos con cupo disponible que aún no han salido.

- **Método:** `GET`
- **Ruta:** `/api/trips`
- **Acceso:** Privado (Requiere JWT)
- **Headers Requeridos:**
  ```http
  Authorization: Bearer <token>
  ```

#### Parámetros de Consulta (`Query Parameters`)
| Parámetro | Tipo | Requerido | Descripción / Formato |
| :--- | :--- | :--- | :--- |
| `origen` | `string` | *Opcional* | Búsqueda parcial por lugar de salida. |
| `destino` | `string` | *Opcional* | Búsqueda parcial por lugar de destino. |
| `fecha` | `string` | *Opcional* | Fecha exacta de salida en formato `YYYY-MM-DD`. Si el formato es inválido, retorna código `400`. |

#### Reglas de Negocio
1. Solo retorna viajes cuyo estado sea `'activo'` o `'programado'`.
2. Solo retorna viajes con cupo disponible mayor a 0 (`cupo_disponible > 0`).
3. Excluye estrictamente viajes en el pasado (`fecha_salida >= GETDATE()`).
4. Retorna compatibilidad de nombres: `cupo_disponible` (para componentes Frontend) y `asientos_disponibles`.
5. Incluye datos completos del conductor (`conductor`, `conductor_id`, `conductor_telefono`) y del vehículo (`marca`, `modelo`, `color`, `placa`).
6. Ordenamiento cronológico ascendente por `fecha_salida`.

#### Respuestas

**`200 OK` - Listado obtenido**
```json
{
  "trips": [
    {
      "id": 1,
      "origen": "Campus Arteaga",
      "destino": "Zona Centro Saltillo",
      "fecha_salida": "2026-09-22T16:00:00.000Z",
      "cupo_disponible": 3,
      "asientos_disponibles": 3,
      "costo_por_pasajero": 25.00,
      "estado": "activo",
      "conductor": "Carlos Mendoza",
      "conductor_id": 2,
      "conductor_telefono": "8441234567",
      "marca": "Nissan",
      "modelo": "Versa",
      "color": "Gris",
      "placa": "ABC-123"
    }
  ]
}
```

**`400 Bad Request` - Formato de fecha incorrecto**
```json
{
  "message": "El formato de fecha debe ser YYYY-MM-DD."
}
```

**`401 Unauthorized` - Token no enviado o expirado**
```json
{
  "message": "Acceso no autorizado: Token no proporcionado."
}
```

---

### 3.6. Reservar Asiento en Viaje
Permite a un usuario con rol `Pasajero` solicitar y reservar un lugar en un viaje disponible.

- **Método:** `POST`
- **Ruta:** `/api/trips/:id/book`
- **Acceso:** Privado (Requiere JWT y rol `Pasajero` validado por `roleMiddleware`)
- **Headers Requeridos:**
  ```http
  Authorization: Bearer <token>
  ```
- **Parámetros de Ruta (`URL Params`):**
  - `id`: ID numérico entero positivo del viaje.

#### Reglas de Negocio
1. **Control de Acceso (RBAC):** Requiere rol `Pasajero`. Si el usuario carece de dicho rol, responde `403 Forbidden`.
2. **Prohibición de Auto-reserva:** El conductor del viaje no puede reservar su propio viaje (responde `400 Bad Request`).
3. **Viajes Pasados:** No se pueden reservar viajes con `fecha_salida` anterior a la fecha y hora actual (responde `400 Bad Request`).
4. **Estado:** Solo viajes en estado `'activo'` o `'programado'` pueden ser reservados (responde `400 Bad Request`).
5. **No Duplicidad:** Un pasajero no puede reservar el mismo viaje más de una vez mientras tenga una solicitud activa (responde `409 Conflict`).
6. **Descuento Atómico y Registro:** Ejecuta una transacción SQL para descontar 1 asiento en `Viajes` y registrar la solicitud en `SolicitudesViaje` con estado `'pendiente'`.
7. **Cupo Agotado:** Si el cupo se agota, responde `409 Conflict`.

#### Respuestas

**`201 Created` - Reserva exitosa**
```json
{
  "message": "Reserva realizada correctamente.",
  "booking": {
    "id": 12,
    "viaje_id": 1,
    "pasajero_id": 3,
    "estado": "pendiente",
    "fecha_solicitud": "2026-09-21T19:30:00.000Z",
    "asientos_restantes": 2
  }
}
```

**`400 Bad Request` - ID inválido, viaje expirado o auto-reserva**
```json
{
  "message": "El ID del viaje debe ser un número entero positivo."
}
```
*O si el conductor intenta reservar su propio viaje:*
```json
{
  "message": "No puedes reservar tu propio viaje como conductor."
}
```
*O si la fecha del viaje ya transcurrió:*
```json
{
  "message": "No es posible reservar un viaje cuya fecha u hora ya ha transcurrido."
}
```

**`401 Unauthorized` - Token inválido o no enviado**
```json
{
  "message": "Acceso no autorizado: Token no proporcionado."
}
```

**`403 Forbidden` - Rol insuficiente**
```json
{
  "message": "Acceso denegado: No cuentas con los permisos necesarios para realizar esta acción."
}
```

**`404 Not Found` - El viaje no existe**
```json
{
  "message": "El viaje solicitado no existe."
}
```

**`409 Conflict` - Sin cupo o reservación duplicada**
```json
{
  "message": "El cupo para este viaje se encuentra agotado."
}
```
*O si el pasajero ya tiene reservación activa en este viaje:*
```json
{
  "message": "Ya tienes una reservación activa para este viaje."
}
```

---

## 💻 4. Guía y Código de Ejemplo para Frontend (React / Fetch)

Para facilitarle la vida al equipo de Frontend, pueden crear un archivo de servicio centralizado en `src/services/authService.js` o `src/lib/api.js`:

```javascript
// src/services/authService.js
const API_URL = "http://localhost:3000";

export const authService = {
  // 1. Registro
  async register({ name, email, password, telefono }) {
    const res = await fetch(`${API_URL}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, telefono }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al registrarse");
    return data;
  },

  // 2. Login
  async login({ email, password }) {
    const res = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al iniciar sesión");

    // Guardar token y usuario en localStorage
    if (data.token) {
      localStorage.setItem("uniride_token", data.token);
      localStorage.setItem("uniride_user", JSON.stringify(data.user));
    }
    return data;
  },

  // 3. Obtener Usuario Actual (/users/me)
  async getMe() {
    const token = localStorage.getItem("uniride_token");
    if (!token) throw new Error("No hay sesión activa");

    const res = await fetch(`${API_URL}/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      // Si expiró el token, limpiar sesión
      if (res.status === 401) {
        localStorage.removeItem("uniride_token");
        localStorage.removeItem("uniride_user");
      }
      throw new Error(data.message || "Error al obtener perfil");
    }
    return data.user;
  },

  // 4. Cerrar Sesión
  logout() {
    localStorage.removeItem("uniride_token");
    localStorage.removeItem("uniride_user");
  }
};

// src/services/tripService.js
export const tripService = {
  // 1. Consultar viajes disponibles con filtros
  async getAvailableTrips({ origen = "", destino = "", fecha = "" } = {}) {
    const token = localStorage.getItem("uniride_token");
    const params = new URLSearchParams();
    if (origen) params.append("origen", origen);
    if (destino) params.append("destino", destino);
    if (fecha) params.append("fecha", fecha);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_URL}/api/trips${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al cargar viajes");
    return data.trips;
  },

  // 2. Reservar asiento en un viaje
  async bookTrip(tripId) {
    const token = localStorage.getItem("uniride_token");
    const res = await fetch(`${API_URL}/api/trips/${tripId}/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al reservar el viaje");
    return data;
  }
};
```

---

## 🧪 5. Ejemplos Rápidos con cURL para Pruebas

```bash
# Health Check
curl -X GET http://localhost:3000/health

# Registro
curl -X POST http://localhost:3000/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Carlos Lopez","email":"carlos@uadec.edu.mx","password":"Password123","telefono":"8441112233"}'

# Login
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"carlos@uadec.edu.mx","password":"Password123"}'

# Obtener Perfil (Reemplazar <TOKEN>)
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer <TOKEN>"

# Consultar Viajes Disponibles (Reemplazar <TOKEN>)
curl -X GET "http://localhost:3000/api/trips?origen=Arteaga&destino=Centro&fecha=2026-09-22" \
  -H "Authorization: Bearer <TOKEN>"

# Reservar Asiento en Viaje ID 1 (Reemplazar <TOKEN_PASAJERO>)
curl -X POST http://localhost:3000/api/trips/1/book \
  -H "Authorization: Bearer <TOKEN_PASAJERO>"
```
