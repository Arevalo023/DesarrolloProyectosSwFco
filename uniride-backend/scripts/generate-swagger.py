import json

with open("UniRide.postman_collection.json", "r", encoding="utf-8") as f:
    postman = json.load(f)

openapi = {
    "openapi": "3.0.3",
    "info": {
        "title": "UniRide API - Documentación Oficial",
        "version": "1.0.0",
        "description": "Especificación interactiva Swagger / OpenAPI 3.0 de la API REST de UniRide (plataforma de Carpooling universitario para la Universidad Autónoma de Coahuila).\n\n### Autenticación y Seguridad\nLos endpoints protegidos requieren autenticación mediante JSON Web Tokens (JWT) en el encabezado `Authorization: Bearer <token>`.\n\nPara probar peticiones protegidas en esta interfaz interactiva:\n1. Utiliza `POST /users/login` con credenciales válidas (ej. `jorge.torres@uadec.edu.mx` / `Demo1234!`) para obtener un token JWT.\n2. Haz clic en el botón verde **Authorize** (arriba a la derecha) y pega el token en el campo `bearerAuth`.\n3. Opcionalmente, para cuentas con múltiples roles (ej. Pasajero y Conductor), puedes indicar el rol activo mediante el encabezado `X-Active-Role`.",
        "contact": {
            "name": "Equipo de Desarrollo UniRide - UAdeC",
            "url": "https://github.com/Arevalo023/DesarrolloProyectosSwFco"
        }
    },
    "servers": [
        {
            "url": "http://localhost:3000",
            "description": "Servidor local de desarrollo"
        }
    ],
    "tags": [
        {"name": "Health Check", "description": "Monitoreo del estado y disponibilidad del backend"},
        {"name": "Usuarios y Autenticación", "description": "Registro institucional, login JWT, consulta y actualización de perfiles y campus"},
        {"name": "Vehículos", "description": "Gestión de vehículos asociados a conductores (registro, consulta, edición y activación)"},
        {"name": "Viajes", "description": "Búsqueda de viajes disponibles, publicación, inicio, finalización y reservaciones"},
        {"name": "Reservaciones y Solicitudes", "description": "Aceptación y rechazo por parte del conductor y cancelación por pasajeros"},
        {"name": "Notificaciones", "description": "Consulta y lectura de notificaciones del sistema"},
        {"name": "Calificaciones", "description": "Sistema bilateral de reseñas y reputación para conductores y pasajeros"},
        {"name": "Administración", "description": "Panel administrativo: métricas globales, consulta y cancelación administrativa"}
    ],
    "paths": {},
    "components": {
        "securitySchemes": {
            "bearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "Token JWT emitido al iniciar sesión en /users/login. Debe enviarse como Bearer <token>."
            },
            "activeRoleHeader": {
                "type": "apiKey",
                "in": "header",
                "name": "X-Active-Role",
                "description": "Encabezado opcional para alternar el rol activo del usuario (Pasajero, Conductor, Administrador)."
            }
        },
        "schemas": {
            "ErrorResponse": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "example": "Descripción clara del error."}
                }
            },
            "RoleErrorResponse": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "example": "Cambia a modo Conductor para realizar esta acción."},
                    "code": {"type": "string", "example": "ROLE_NOT_ACTIVE"},
                    "requiredRole": {"type": "string", "example": "Conductor"}
                }
            },
            "HealthResponse": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "example": "UP"},
                    "message": {"type": "string", "example": "Server is healthy"}
                }
            },
            "AdminSummaryResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean", "example": True},
                    "data": {
                        "type": "object",
                        "properties": {
                            "metricas": {
                                "type": "object",
                                "properties": {
                                    "usuarios": {"type": "integer", "example": 12},
                                    "viajes": {"type": "integer", "example": 8},
                                    "reservaciones": {"type": "integer", "example": 21}
                                }
                            }
                        }
                    },
                    "metricas": {
                        "type": "object",
                        "properties": {
                            "usuarios": {"type": "integer", "example": 12},
                            "viajes": {"type": "integer", "example": 8},
                            "reservaciones": {"type": "integer", "example": 21}
                        }
                    }
                }
            }
        }
    }
}

tag_mapping = {
    "1. Health Check": "Health Check",
    "2. Autenticación y Usuarios": "Usuarios y Autenticación",
    "3. Vehículos": "Vehículos",
    "4. Viajes": "Viajes",
    "5. Reservaciones y Solicitudes": "Reservaciones y Solicitudes",
    "6. Notificaciones": "Notificaciones",
    "7. Calificaciones": "Calificaciones",
    "8. Administración": "Administración"
}

for folder in postman.get("item", []):
    folder_name = folder.get("name")
    target_tag = tag_mapping.get(folder_name, "General")
    
    for item in folder.get("item", []):
        req = item.get("request", {})
        name = item.get("name")
        desc = req.get("description", "")
        method = req.get("method", "GET").lower()
        url_obj = req.get("url", {})
        
        path_segments = url_obj.get("path", [])
        swagger_path_parts = []
        path_params = []
        for seg in path_segments:
            if seg.isdigit():
                param_name = "id"
                swagger_path_parts.append(f"{{{param_name}}}")
                if param_name not in [p["name"] for p in path_params]:
                    path_params.append({
                        "name": param_name,
                        "in": "path",
                        "required": True,
                        "schema": {"type": "integer", "example": int(seg)},
                        "description": f"Identificador numérico ({param_name})"
                    })
            else:
                swagger_path_parts.append(seg)
        
        swagger_path = "/" + "/".join(swagger_path_parts)
        if swagger_path not in openapi["paths"]:
            openapi["paths"][swagger_path] = {}
            
        query_params = []
        for q in url_obj.get("query", []):
            query_params.append({
                "name": q.get("key"),
                "in": "query",
                "required": False,
                "schema": {"type": "string", "example": q.get("value", "")},
                "description": q.get("description", "")
            })
            
        headers = {h.get("key", "").lower(): h.get("value") for h in req.get("header", [])}
        security = []
        if "authorization" in headers:
            security.append({"bearerAuth": []})
            
        parameters = path_params + query_params
        
        op = {
            "tags": [target_tag],
            "summary": name,
            "description": desc,
            "parameters": parameters,
            "responses": {
                "200": {"description": "Operación exitosa"}
            }
        }
        
        if security:
            op["security"] = security
            
        body = req.get("body", {})
        if body.get("mode") == "raw" and body.get("raw"):
            raw_text = body.get("raw")
            try:
                parsed_json = json.loads(raw_text)
                op["requestBody"] = {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "example": parsed_json
                            }
                        }
                    }
                }
            except Exception:
                op["requestBody"] = {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"type": "string", "example": raw_text}
                        }
                    }
                }
                
        if method == "post":
            op["responses"] = {
                "201": {"description": "Recurso creado exitosamente"},
                "400": {"description": "Datos faltantes o formato de entrada inválido"}
            }
        elif method == "patch" or method == "put":
            op["responses"] = {
                "200": {"description": "Actualización aplicada exitosamente"},
                "400": {"description": "Parámetros inválidos o regla de negocio rechazada"}
            }
            
        if security:
            op["responses"]["401"] = {"description": "No autorizado: Token ausente, inválido o expirado"}
            op["responses"]["403"] = {"description": "Acceso denegado: Permisos insuficientes o rol no activo"}
            
        openapi["paths"][swagger_path][method] = op

with open("uniride-backend/swagger.json", "w", encoding="utf-8") as f:
    json.dump(openapi, f, indent=2, ensure_ascii=False)
    f.write("\n")

print("Generated uniride-backend/swagger.json successfully!")
