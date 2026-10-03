# Contrato de API: Reservaciones (Solicitudes de viaje)

Base URL local: `http://localhost:3000`
Autenticación: `Authorization: Bearer <token>` (JWT). Opcional: `X-Active-Role: <rol>`.

> Issue relacionado: #66 (Aceptar o rechazar solicitudes)

## Estados de una solicitud (`SolicitudesViaje.estado`)

| Estado | Significado | ¿Descuenta cupo? |
|---|---|---|
| `pendiente` | Creada por el pasajero, espera respuesta del conductor | No |
| `aceptada` | El conductor la confirmó | Sí, al pasar a este estado |
| `rechazada` | El conductor la rechazó | No |

Transiciones permitidas con este endpoint: `pendiente → aceptada` y `pendiente → rechazada`.
Una solicitud ya resuelta no puede cambiar de estado.

---

## PATCH `/api/reservations/:id`

El conductor dueño del viaje acepta o rechaza una solicitud de pasajero.

**Auth:** requerida. Solo puede usarlo el conductor dueño del viaje (`Viajes.conductor_id = usuario del token`).

**Parámetros de ruta**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | entero positivo | ID de la solicitud (`SolicitudesViaje.id`) |

**Body (JSON)**

```json
{ "estado": "aceptada" }
```

| Campo | Tipo | Valores |
|---|---|---|
| `estado` | string | `"aceptada"` o `"rechazada"` (no distingue mayúsculas) |

**Respuesta 200**

```json
{
  "message": "Solicitud aceptada correctamente.",
  "reservation": {
    "id": 2,
    "viaje_id": 2,
    "pasajero_id": 3,
    "estado": "aceptada",
    "asientos_restantes": 1
  }
}
```

`asientos_restantes` es el cupo del viaje después de la operación. Con `rechazada` no cambia.

**Errores**

| Código | Cuándo | Ejemplo de `message` |
|---|---|---|
| 400 | ID no válido | `El ID de la solicitud debe ser un número entero positivo.` |
| 400 | `estado` distinto de `aceptada`/`rechazada` | `El estado debe ser 'aceptada' o 'rechazada'.` |
| 400 | Al aceptar: viaje cancelado/completado o ya salió | `El viaje ya no admite solicitudes.` |
| 401 | Sin token, token inválido o expirado | `Acceso no autorizado: Token no proporcionado.` |
| 403 | El usuario no es el conductor dueño del viaje | `Solo el conductor dueño del viaje puede gestionar esta solicitud.` |
| 404 | La solicitud no existe | `La solicitud no existe.` |
| 409 | La solicitud ya no está `pendiente` | `La solicitud ya fue resuelta (estado actual: aceptada).` |
| 409 | Al aceptar: el viaje no tiene cupo | `No hay cupo disponible en este viaje.` |

**Notas**
- Aceptar descuenta 1 de `Viajes.cupo_disponible` en la misma transacción que el cambio de estado. Si falla algo, no se guarda nada.
- Rechazar no modifica el cupo.

**Ejemplo (curl)**

```bash
curl -X PATCH http://localhost:3000/api/reservations/2 \
  -H "Authorization: Bearer <TOKEN_CONDUCTOR>" \
  -H "Content-Type: application/json" \
  -d '{"estado":"aceptada"}'
```

---

## Cambio en POST `/api/trips/:id/book` (comportamiento)

Antes: al reservar se descontaba 1 de `cupo_disponible`.
Ahora: solo crea la solicitud en estado `pendiente`. **El cupo ya no baja al reservar**; baja cuando el conductor acepta (`PATCH /api/reservations/:id`).

Respuesta 201 (sin cambio de forma):

```json
{
  "message": "Reserva realizada correctamente.",
  "booking": {
    "id": 7,
    "viaje_id": 1,
    "pasajero_id": 9,
    "estado": "pendiente",
    "fecha_solicitud": "2026-10-03T20:00:00.000Z",
    "asientos_restantes": 3
  }
}
```

`asientos_restantes` ahora es el cupo actual del viaje, sin descuento.

Implicación para frontend y otros issues:
- Un viaje puede tener más solicitudes `pendiente` que cupo. El conductor decide a quién aceptar; al aceptar con cupo 0 recibe 409.
- Cancelaciones (#67, #68): cancelar una solicitud `aceptada` debe devolver 1 cupo; cancelar una `pendiente` no.
