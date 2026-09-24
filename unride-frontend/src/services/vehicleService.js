import { apiRequest } from "./api";

/*
|--------------------------------------------------------------------------
| MAPPER
|--------------------------------------------------------------------------
| Backend: anio, placa, asientos_disponibles, activo
| Vista:   año,  placas, asientos,            activo
|
| NOTA para el módulo de viajes: "asientos" son los asientos TOTALES del
| vehículo (incluye al conductor). Cupo real para pasajeros = asientos - 1.
|--------------------------------------------------------------------------
*/

export const desdeApi = (v) => ({
  id: v.id,
  marca: v.marca ?? "",
  modelo: v.modelo ?? "",
  año: v.anio != null ? String(v.anio) : "",
  color: v.color ?? "",
  placas: v.placa ?? "",
  asientos: v.asientos_disponibles != null ? String(v.asientos_disponibles) : "",
  // Si la columna viene null se considera activo
  activo: v.activo !== false && v.activo !== 0,
});

export const haciaApi = (formulario) => ({
  marca: formulario.marca.trim(),
  modelo: formulario.modelo.trim(),
  anio: Number(formulario.año),
  color: formulario.color.trim(),
  placa: formulario.placas.trim().toUpperCase(),
  asientos_disponibles: Number(formulario.asientos),
});

/*
|--------------------------------------------------------------------------
| PETICIONES
|--------------------------------------------------------------------------
*/

export async function listarMisVehiculos() {
  const data = await apiRequest("/api/vehicles/user");
  return (data.vehicles || []).map(desdeApi);
}

export async function crearVehiculo(formulario) {
  const data = await apiRequest("/api/vehicles", {
    method: "POST",
    body: haciaApi(formulario),
  });
  return {
    mensaje: data.message,
    vehiculo: desdeApi(data.vehicle),
    // Solo viene en el primer vehículo: el usuario se volvió Conductor
    // y el backend manda un token nuevo con sus roles actualizados
    sesion: data.token ? { token: data.token, user: data.user } : null,
    rolAgregado: data.rolAgregado || null,
  };
}

export async function actualizarVehiculo(id, formulario) {
  const data = await apiRequest(`/api/vehicles/${id}`, {
    method: "PUT",
    body: haciaApi(formulario),
  });
  return { mensaje: data.message, vehiculo: desdeApi(data.vehicle) };
}

export async function cambiarEstadoVehiculo(id, activo) {
  const data = await apiRequest(`/api/vehicles/${id}/status`, {
    method: "PATCH",
    body: { activo },
  });
  return { mensaje: data.message, vehiculo: desdeApi(data.vehicle) };
}
