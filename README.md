# Bloomskin

Tienda online de K-Beauty para Chile con:

- `frontend`: Vue 3 + Vite
- `backend`: Node.js + Express
- `database`: SQL Server

## Estado actual

El proyecto ya soporta:

- catálogo público
- home editable en gran parte desde admin
- carrito y checkout con cuenta
- cálculo de envío
- pedidos con transferencia bancaria
- subida de comprobante
- panel admin para productos, pedidos, clientes, mensajes, newsletter y contenido del sitio
- wishlist por usuaria

No incluye pago automático integrado. El flujo comercial actual es:

1. la clienta crea el pedido
2. transfiere manualmente
3. sube comprobante
4. admin valida y mueve el pedido por estados

## Estructura

```text
bloomskin/
  backend/
  database/
  frontend/
  DEPLOY.md
```

## Desarrollo local

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run check-db
npm run seed-admin
npm run dev
```

API local:

- `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Sitio local:

- `http://localhost:5173`

Admin:

- `http://localhost:5173/admin/login`

## Variables importantes

Backend:

- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FRONTEND_URL`
- `FRONTEND_URLS`
- `DB_SERVER`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `GOOGLE_MAPS_API_KEY`

Frontend:

- `VITE_API_BASE_URL`

## Deploy

Revisa [DEPLOY.md](/C:/Users/asaldana/Documents/New%20project/bloomskin/DEPLOY.md) para el checklist de despliegue y operación.

## Nota operativa

Antes de producción conviene:

- rotar la API key de Google Maps si fue expuesta
- cambiar credenciales admin
- definir datos bancarios finales desde el panel admin
- probar compra completa con una cuenta real
- validar persistencia de archivos subidos en el hosting final
