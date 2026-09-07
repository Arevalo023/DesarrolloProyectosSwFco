# 📄 Contrato de API - UniRide (Módulo de Autenticación y Usuarios)

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
```
