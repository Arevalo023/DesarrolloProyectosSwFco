# UniRide frontend

Frontend de UniRide construido con React y Vite.

## Configuración

Vite carga las variables según el modo de ejecución:

- Desarrollo: copia `.env.development.example` a `.env.development`.
- Producción: copia `.env.production.example` a `.env.production`.

`VITE_API_URL` debe contener la URL base del backend, sin una barra final. Las
variables `VITE_*` se incorporan al bundle, así que no deben contener secretos.

## Comandos

```bash
npm install
npm run dev       # servidor local con modo development
npm run test      # pruebas unitarias
npm run lint      # revisión estática
npm run build     # empaquetado de producción
npm run preview   # servir el bundle generado
```

Para probar la sesión y las peticiones protegidas, inicia también el backend en
`http://localhost:3000`, crea un usuario de prueba e inicia sesión desde el frontend.
