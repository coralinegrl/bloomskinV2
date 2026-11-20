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

Incluye pagos online con Flow y transferencia manual. La confirmación de Flow se verifica en el servidor; abrir la página de pago no confirma una venta. El flujo de transferencia es:

1. la clienta crea el pedido
2. transfiere manualmente
3. sube comprobante
4. admin valida y mueve el pedido por estados

## Autogestión

- **Resumen**: pendientes por revisar, preparar y entregar. En móvil, las métricas se despliegan por separado.
- **Mi tienda**: dirección y horarios de retiro, cobertura, tarifas por distancia, envío gratis y pausa de nuevas compras. No modifica pedidos ya creados.
- **Inventario**: disponible y reservado por variante, ajustes con motivo e historial desde su activación. Los cambios de precio también aparecen en Actividad.
- **Ventas**: lista de preparación, contacto, dirección y seguimiento. Solo los pedidos con pago confirmado pueden prepararse.
- **Catálogo**: borradores, duplicación sin stock heredado, vista previa, publicación y archivo. Los borradores no se pueden comprar.
- **Contenido**: apartados, vista previa sin publicar y versiones recuperables. La vista previa no permite compras.
- **Correos y pagos**: momentos de envío, mensaje adicional, vista previa con datos ficticios e historial con reintento de correos fallidos vigentes.
- **Historial y respaldos**: copia automática diaria verificada de datos e imágenes, conservando siete copias en `DATA_DIR/backups`. La descarga contiene los datos y configuración en JSON comprimido, no las imágenes ni las variables secretas del servidor. Mantén una copia adicional fuera del servidor; el respaldo local no protege contra la pérdida de ese servidor. La restauración desde el panel es solo de contenido, nunca de pedidos o inventario.

Las clientas pueden solicitar un aviso de reposición por tipo y volver a comprar un pedido con precios y disponibilidad actuales. Los avisos de reposición no reservan unidades ni suscriben al newsletter.

Pruebas aisladas de gestión: `cd backend` y `node src/scripts/qa-management.js`. No usa pedidos reales ni envía correos.

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
