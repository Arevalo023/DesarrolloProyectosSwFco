import {
  obtenerToken,
  obtenerUsuario,
  obtenerRolActivo,
  guardarRolActivo,
  rolPrincipal,
  cerrarSesion,
} from "./session";

/*
|--------------------------------------------------------------------------
| CLIENTE HTTP
|--------------------------------------------------------------------------
| Envuelve fetch para todas las llamadas al backend:
| - Adjunta el JWT (Authorization: Bearer ...) y el rol activo
|   (X-Active-Role) en rutas privadas
| - Convierte la respuesta a JSON
| - Lanza un Error con el message del backend si la respuesta no es 2xx
| - 401 en ruta privada -> cierra sesión y avisa a App.jsx (auth:logout)
| - 403 por rol activo inválido -> vuelve al rol principal (auth:rol-activo)
|
| Rutas públicas (login, registro): pasar { auth: false }
|--------------------------------------------------------------------------
*/

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function apiRequest(ruta, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = obtenerToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const rolActivo = obtenerRolActivo();
    if (rolActivo) {
      headers["X-Active-Role"] = rolActivo;
    }
  }

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Verifica que el backend esté encendido."
    );
  }

  let data = {};
  try {
    data = await respuesta.json();
  } catch {
    data = {};
  }

  if (auth && respuesta.status === 401) {
    // Sesión expirada o token inválido: cerrar sesión en toda la app
    cerrarSesion();
    window.dispatchEvent(new Event("auth:logout"));
  }

  if (auth && respuesta.status === 403 && data.code === "INVALID_ACTIVE_ROLE") {
    // El rol guardado ya no es válido: volver al rol principal
    const rol = rolPrincipal(obtenerUsuario());
    guardarRolActivo(rol);
    window.dispatchEvent(new CustomEvent("auth:rol-activo", { detail: rol }));
  }

  if (!respuesta.ok) {
    const error = new Error(
      data.message || `Error ${respuesta.status} al comunicarse con el servidor.`
    );
    error.status = respuesta.status;
    error.code = data.code;
    throw error;
  }

  return data;
}
