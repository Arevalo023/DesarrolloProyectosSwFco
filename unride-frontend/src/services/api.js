/*
|--------------------------------------------------------------------------
| CLIENTE HTTP
|--------------------------------------------------------------------------
| Envuelve fetch para todas las llamadas al backend:
| - Agrega el token JWT (Authorization: Bearer ...)
| - Convierte la respuesta a JSON
| - Lanza un Error con el message del backend si la respuesta no es 2xx
| - Si el backend responde 401, limpia la sesión y avisa a App.jsx
|--------------------------------------------------------------------------
*/

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function apiRequest(ruta, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");

  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
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

  // Sesión expirada o token inválido: cerrar sesión en toda la app
  if (respuesta.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.dispatchEvent(new Event("auth:logout"));
  }

  if (!respuesta.ok) {
    const error = new Error(
      data.message || `Error ${respuesta.status} al comunicarse con el servidor.`
    );
    error.status = respuesta.status;
    throw error;
  }

  return data;
}
