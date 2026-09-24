/*
|--------------------------------------------------------------------------
| SESIÓN
|--------------------------------------------------------------------------
| Único lugar que lee/escribe la sesión en localStorage:
| token, usuario y rol activo.
|--------------------------------------------------------------------------
*/

const CLAVE_TOKEN = "token";
const CLAVE_USUARIO = "usuario";
const CLAVE_ROL_ACTIVO = "rolActivo";

export const obtenerToken = () => localStorage.getItem(CLAVE_TOKEN);

export const obtenerUsuario = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_USUARIO));
  } catch {
    return null;
  }
};

export const guardarUsuario = (usuario) => {
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
};

// Lista de roles del usuario, ej. ["Pasajero", "Conductor"]
export const rolesDe = (usuario) => {
  const roles = usuario?.roles ?? usuario?.rol;
  return Array.isArray(roles) ? roles : roles ? [roles] : [];
};

export const mismoRol = (a, b) =>
  String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

export const obtenerRolActivo = () => localStorage.getItem(CLAVE_ROL_ACTIVO);

export const guardarRolActivo = (rol) => {
  if (rol) {
    localStorage.setItem(CLAVE_ROL_ACTIVO, rol);
  } else {
    localStorage.removeItem(CLAVE_ROL_ACTIVO);
  }
};

// Rol principal del usuario (el que usa el backend si no hay header)
export const rolPrincipal = (usuario) => usuario?.rol || rolesDe(usuario)[0] || null;

export const iniciarSesion = ({ token, user }) => {
  localStorage.setItem(CLAVE_TOKEN, token);
  guardarUsuario(user);
  guardarRolActivo(rolPrincipal(user));
};

export const cerrarSesion = () => {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
  localStorage.removeItem(CLAVE_ROL_ACTIVO);
};
