# UniRide

UniRide es una aplicación web de movilidad compartida para comunidades
universitarias. Permite que estudiantes publiquen viajes, encuentren opciones
para trasladarse juntos y gestionen sus reservaciones desde una sola
plataforma. La aplicación también ofrece herramientas para conductores y un
área de administración.

## Funcionalidades principales

- Registro e inicio de sesión con cuentas institucionales.
- Perfiles de usuario y soporte para cuentas con más de un rol.
- Publicación y búsqueda de viajes con filtros por ruta, fecha, horario y cupo.
- Gestión de vehículos y viajes por parte de los conductores.
- Solicitudes de reservación para pasajeros y respuesta del conductor.
- Notificaciones de solicitudes, cambios de reservación y ciclo de vida del
  viaje.
- Calificaciones y consulta del historial de viajes.
- Panel administrativo con navegación de resumen, usuarios, viajes, reportes y
  configuración.

## Arquitectura y tecnologías

El repositorio contiene un frontend independiente, una API backend y los
recursos para configurar la base de datos:

| Componente | Tecnologías | Ubicación |
|---|---|---|
| Frontend | React, Vite, Tailwind CSS y lucide-react | [`unride-frontend/`](./unride-frontend/) |
| API | Node.js, Express y JWT | [`uniride-backend/`](./uniride-backend/) |
| Persistencia | Microsoft SQL Server | [`database/`](./database/) |
| Entorno local de base de datos | Docker Compose | [`docker-compose.yml`](./docker-compose.yml) |

La API ofrece endpoints para usuarios, vehículos, viajes, reservaciones,
notificaciones y calificaciones. El contrato de integración está documentado
en [`API_CONTRACT.md`](./API_CONTRACT.md), [`API_CONTRACT_RESERVACIONES.md`](./API_CONTRACT_RESERVACIONES.md)
y [`API_CONTRACT_VEHICULOS.md`](./API_CONTRACT_VEHICULOS.md). La colección para
probar la API está en [`UniRide.postman_collection.json`](./UniRide.postman_collection.json).

## Requisitos

- Node.js 20.19 o posterior y npm.
- Docker Desktop con Docker Compose, o una instancia disponible de SQL Server.
- Git para clonar el repositorio.

## Inicio rápido en desarrollo

### 1. Obtener el código

```bash
git clone <URL_DEL_REPOSITORIO>
cd DesarrolloProyectosSwFco
```

### 2. Iniciar SQL Server con Docker

Desde la raíz del repositorio:

```bash
docker compose up -d
```

El archivo Compose expone SQL Server en el puerto `11433` del equipo. Antes de
usar este entorno fuera de desarrollo local, cambia la contraseña de SQL Server
en `docker-compose.yml` y usa el mismo valor en la configuración del backend.

### 3. Configurar e inicializar el backend

En una terminal:

```bash
cd uniride-backend
npm install
```

Copia `.env.example` como `.env` y configura las credenciales de SQL Server y
una clave JWT propia. Con el Docker Compose del repositorio, los valores de
conexión habituales son:

```dotenv
PORT=3000
DB_USER=sa
DB_PASSWORD=<CONTRASEÑA_DE_SQL_SERVER>
DB_SERVER=localhost
DB_NAME=uniride
DB_PORT=11433
JWT_SECRET=<CLAVE_SECRETA_LARGA_Y_ALEATORIA>
JWT_EXPIRES_IN=24h
```

Inicializa el esquema y, opcionalmente, los datos de demostración:

```bash
npm run db:init
npm run db:seed
```

Inicia la API:

```bash
npm run dev
```

El backend queda disponible normalmente en `http://localhost:3000`. Puedes
comprobar el estado del servidor en `http://localhost:3000/health`.

### 4. Configurar e iniciar el frontend

En otra terminal, desde la raíz del repositorio:

```bash
cd unride-frontend
npm install
```

Copia `.env.development.example` a `.env.development` y revisa la URL de la API:

```dotenv
VITE_API_URL=http://localhost:3000
```

Inicia Vite:

```bash
npm run dev
```

Abre la URL local que muestre Vite, normalmente `http://localhost:5173`.

> En PowerShell, puedes crear los archivos de entorno de ejemplo con
> `Copy-Item .env.example .env` dentro de `uniride-backend` y con
> `Copy-Item .env.development.example .env.development` dentro de
> `unride-frontend`.

## Pruebas y validaciones

### Backend

Desde `uniride-backend/`:

```bash
npm test
npm run test:integration
```

Las pruebas de integración requieren SQL Server y una base de datos de prueba
con un nombre que termine en `_test`. No las ejecutes contra una base con datos
reales.

### Frontend

Desde `unride-frontend/`:

```bash
npm test
npm run lint
npm run build
```

## Estructura del repositorio

```text
.
├── database/              # Esquema y datos de demostración
├── uniride-backend/
│   ├── config/             # Configuración de base de datos
│   ├── controllers/        # Controladores HTTP
│   ├── middlewares/        # Autenticación, roles y validaciones
│   ├── models/             # Consultas y acceso a datos
│   ├── routes/             # Rutas de la API
│   ├── services/           # Lógica de negocio
│   └── tests/              # Pruebas unitarias y de integración
├── unride-frontend/
│   └── src/
│       ├── components/     # Componentes reutilizables
│       ├── pages/          # Pantallas de la aplicación
│       ├── services/       # Sesión y comunicación con la API
│       └── tests/          # Pruebas del frontend
├── API_CONTRACT.md
├── API_CONTRACT_RESERVACIONES.md
├── API_CONTRACT_VEHICULOS.md
└── docker-compose.yml
```

## Seguridad y configuración

- No subas archivos `.env` ni credenciales al repositorio.
- `VITE_*` se incluye en el código del frontend durante la compilación: no
  almacenes secretos en esas variables.
- Cambia las credenciales de ejemplo antes de exponer servicios fuera de tu
  equipo.
- Las operaciones protegidas de la API usan JWT y autorización por roles.

Para instrucciones específicas de la base de datos, consulta
[`database/README.md`](./database/README.md). Para configuración detallada del
cliente web, consulta [`unride-frontend/README.md`](./unride-frontend/README.md).
