# 🚗 Contrato de API - UniRide (Módulo de Vehículos)

Este documento define el **Contrato Oficial de Integración** entre el Backend (Node.js/Express) y el Frontend (React/Vite) para el módulo de vehículos.

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

## 🔑 2. Autenticación

**Todos** los endpoints de este módulo requieren JWT con esquema `Bearer`:
```http
Authorization: Bearer <tu_jwt_token_aqui>
```
No hay endpoints públicos en este módulo. Ver `API_CONTRACT.md` (módulo de Auth) para obtener el token vía `/users/login`.

---

## 📡 3. Especificación de Endpoints

---

### 3.1. Registrar Vehículo
Crea un nuevo vehículo asociado al usuario autenticado.

- **Método:** `POST`
- **Ruta:** `/vehiculos`
- **Acceso:** Privado (JWT)
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`

#### Cuerpo de la Petición (`Request Body`)
| Campo | Tipo | Requerido | Descripción / Reglas |
| :--- | :--- | :--- | :--- |
| `marca` | `string` | **Sí** | Mínimo 2 caracteres. |
| `modelo` | `string` | **Sí** | Mínimo 1 carácter. |
| `anio` | `number` | **Sí** | Entero. |
| `color` | `string` | **Sí** | Mínimo 2 caracteres. |
| `placa` | `string` | **Sí** | Única en el sistema. |
| `asientos_disponibles` | `number` | **Sí** | Entero. |

> Nota: `usuario_id` **no** se envía en el body — se toma automáticamente del token JWT.

##### Ejemplo de Payload:
```json
{
  "marca": "Nissan",
  "modelo": "Versa",
  "anio": 2021,
  "color": "Rojo",
  "placa": "ABC1234",
  "asientos_disponibles": 4
}
```

#### Respuestas

**`201 Created`**
```json
{
  "message": "Vehículo registrado exitosamente.",
  "vehicle": {
    "id": 1,
    "usuario_id": 3,
    "marca": "Nissan",
    "modelo": "Versa",
    "anio": 2021,
    "color": "Rojo",
    "placa": "ABC1234",
    "asientos_disponibles": 4
  }
}
```

**`400 Bad Request` - Error de validación**
```json
{
  "message": "La marca es obligatoria y debe tener al menos 2 caracteres."
}
```
*(Posibles mensajes equivalentes por cada campo: modelo, año, color, placa, asientos disponibles)*

**`401 Unauthorized` - Token ausente o inválido**
```json
{
  "message": "Acceso no autorizado: Token no proporcionado."
}
```

**`409 Conflict` - Placa duplicada**
```json
{
  "message": "La placa ya está registrada"
}
```

**`500 Internal Server Error`**
```json
{
  "message": "Error al registrar el vehículo."
}
```

---

### 3.2. Listar Mis Vehículos
Obtiene todos los vehículos registrados por el usuario autenticado.

- **Método:** `GET`
- **Ruta:** `/vehiculos/mios`
- **Acceso:** Privado (JWT)
- **Headers:** `Authorization: Bearer <token>`

#### Respuestas

**`200 OK`**
```json
{
  "vehicles": [
    {
      "id": 1,
      "usuario_id": 3,
      "marca": "Nissan",
      "modelo": "Versa",
      "anio": 2021,
      "color": "Rojo",
      "placa": "ABC1234",
      "asientos_disponibles": 4
    }
  ]
}
```
*(Regresa un arreglo vacío `[]` si el usuario no tiene vehículos registrados.)*

**`401 Unauthorized`** — mismo formato que 3.1.

**`500 Internal Server Error`**
```json
{
  "message": "Error al obtener los vehículos."
}
```

---

### 3.3. Obtener Vehículo por ID
Obtiene los datos de un vehículo específico. Cualquier usuario autenticado puede consultarlo (no solo el dueño) — necesario para mostrar el vehículo del conductor en un viaje.

- **Método:** `GET`
- **Ruta:** `/vehiculos/:id`
- **Acceso:** Privado (JWT) — sin restricción de dueño
- **Headers:** `Authorization: Bearer <token>`

#### Respuestas

**`200 OK`**
```json
{
  "vehicle": {
    "id": 1,
    "usuario_id": 3,
    "marca": "Nissan",
    "modelo": "Versa",
    "anio": 2021,
    "color": "Rojo",
    "placa": "ABC1234",
    "asientos_disponibles": 4
  }
}
```

**`401 Unauthorized`** — mismo formato que 3.1.

**`404 Not Found` - Vehículo no existe**
```json
{
  "message": "Vehículo no encontrado"
}
```

**`500 Internal Server Error`**
```json
{
  "message": "Error al obtener el vehículo."
}
```

---

### 3.4. Actualizar Vehículo
Actualiza los datos de un vehículo. Solo el dueño puede modificarlo. **Actualización completa** — se deben enviar todos los campos, no solo los que cambian.

- **Método:** `PATCH`
- **Ruta:** `/vehiculos/:id`
- **Acceso:** Privado (JWT) — solo el dueño
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`

#### Cuerpo de la Petición
Mismos campos y reglas que en 3.1 (Registrar Vehículo) — **todos son obligatorios en cada PATCH**.

##### Ejemplo de Payload:
```json
{
  "marca": "Nissan",
  "modelo": "Versa",
  "anio": 2021,
  "color": "Azul",
  "placa": "ABC1234",
  "asientos_disponibles": 4
}
```

#### Respuestas

**`200 OK`**
```json
{
  "message": "Vehículo actualizado correctamente.",
  "vehicle": {
    "id": 1,
    "usuario_id": 3,
    "marca": "Nissan",
    "modelo": "Versa",
    "anio": 2021,
    "color": "Azul",
    "placa": "ABC1234",
    "asientos_disponibles": 4
  }
}
```

**`400 Bad Request`** — mismo formato que 3.1.

**`401 Unauthorized`** — mismo formato que 3.1.

**`403 Forbidden` - No es el dueño del vehículo**
```json
{
  "message": "No tienes permiso para modificar este vehículo"
}
```

**`404 Not Found`** — mismo formato que 3.3.

**`409 Conflict` - Placa ya registrada en otro vehículo**
```json
{
  "message": "La placa ya está registrada"
}
```

**`500 Internal Server Error`**
```json
{
  "message": "Error al actualizar el vehículo."
}
```

---

### 3.5. Eliminar Vehículo
Elimina un vehículo. Solo el dueño puede eliminarlo.

- **Método:** `DELETE`
- **Ruta:** `/vehiculos/:id`
- **Acceso:** Privado (JWT) — solo el dueño
- **Headers:** `Authorization: Bearer <token>`

#### Respuestas

**`200 OK`**
```json
{
  "message": "Vehículo eliminado correctamente."
}
```

**`401 Unauthorized`** — mismo formato que 3.1.

**`403 Forbidden`** — mismo formato que 3.4.

**`404 Not Found`** — mismo formato que 3.3.

**`500 Internal Server Error`**
```json
{
  "message": "Error al eliminar el vehículo."
}
```

---

## 💻 4. Guía y Código de Ejemplo para Frontend (React / Fetch)

```javascript
// src/services/vehicleService.js
const API_URL = "http://localhost:3000";

function getAuthHeaders() {
  const token = localStorage.getItem("uniride_token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

export const vehicleService = {
  // 1. Registrar vehículo
  async create({ marca, modelo, anio, color, placa, asientos_disponibles }) {
    const res = await fetch(`${API_URL}/vehiculos`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ marca, modelo, anio, color, placa, asientos_disponibles }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al registrar el vehículo");
    return data.vehicle;
  },

  // 2. Listar mis vehículos
  async listMine() {
    const res = await fetch(`${API_URL}/vehiculos/mios`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al obtener los vehículos");
    return data.vehicles;
  },

  // 3. Obtener por ID
  async getById(id) {
    const res = await fetch(`${API_URL}/vehiculos/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al obtener el vehículo");
    return data.vehicle;
  },

  // 4. Actualizar (todos los campos)
  async update(id, { marca, modelo, anio, color, placa, asientos_disponibles }) {
    const res = await fetch(`${API_URL}/vehiculos/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ marca, modelo, anio, color, placa, asientos_disponibles }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al actualizar el vehículo");
    return data.vehicle;
  },

  // 5. Eliminar
  async remove(id) {
    const res = await fetch(`${API_URL}/vehiculos/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al eliminar el vehículo");
    return data;
  },
};
```

---

## 🧪 5. Ejemplos Rápidos con cURL para Pruebas

```bash
# Registrar vehículo (reemplazar <TOKEN>)
curl -X POST http://localhost:3000/vehiculos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"marca":"Nissan","modelo":"Versa","anio":2021,"color":"Rojo","placa":"ABC1234","asientos_disponibles":4}'

# Listar mis vehículos
curl -X GET http://localhost:3000/vehiculos/mios \
  -H "Authorization: Bearer <TOKEN>"

# Obtener por ID
curl -X GET http://localhost:3000/vehiculos/1 \
  -H "Authorization: Bearer <TOKEN>"

# Actualizar
curl -X PATCH http://localhost:3000/vehiculos/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"marca":"Nissan","modelo":"Versa","anio":2021,"color":"Azul","placa":"ABC1234","asientos_disponibles":4}'

# Eliminar
curl -X DELETE http://localhost:3000/vehiculos/1 \
  -H "Authorization: Bearer <TOKEN>"
```
