# Deploy Bloomskin

## Arquitectura recomendada de bajo costo

- `frontend`: Cloudflare Pages
- `backend`: Railway
- `database`: Azure SQL Database

Con esa combinacion puedes vender sin pagar un VPS completo y sin depender de tu computador.

## Frontend

Variables:

```env
VITE_API_BASE_URL=https://tu-api.com/api
```

Build:

```bash
cd frontend
npm install
npm run build
```

Publica la carpeta `dist/`.

## Backend

Variables minimas:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=una_clave_larga_y_secreta
FRONTEND_URL=https://tu-frontend.com
FRONTEND_URLS=https://tu-frontend.com,https://www.tu-frontend.com

DB_SERVER=tu-servidor-sql
DB_PORT=1433
DB_INSTANCE=
DB_DRIVER=
DB_TRUSTED_CONNECTION=false
DB_NAME=bloomskin
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=tu_usuario_smtp
SMTP_PASS=tu_clave_smtp
SMTP_FROM=Bloomskin <hola@tudominio.com>

GOOGLE_MAPS_API_KEY=tu_api_key_google_maps
```

## Persistencia obligatoria en Railway

El backend guarda tres cosas que no deben perderse entre despliegues:

- comprobantes de transferencia
- imagenes subidas desde admin
- configuracion editable del sitio

Por eso, en Railway debes crear un `Volume` y montarlo, por ejemplo, en:

```text
/data/bloomskin
```

Luego configura estas variables del backend:

```env
DATA_DIR=/data/bloomskin/data
SITE_SETTINGS_FILE=/data/bloomskin/data/site-settings.json
UPLOADS_DIR=/data/bloomskin/uploads
```

Con eso:

- los settings editados desde admin quedan persistentes
- las imagenes de productos sobreviven a reinicios
- los comprobantes no se pierden

## Backend: comandos

```bash
cd backend
npm install
npm start
```

## Base de datos

`DBeaver` no publica tu base de datos. Solo la administra.

Para vender de verdad, la base debe estar accesible desde el backend productivo. La opcion mas simple con este proyecto es:

- `Azure SQL Database`

Pasos generales:

1. Crear una base `bloomskin` en Azure SQL.
2. Ejecutar `database/schema.sql`.
3. Ejecutar las migraciones de `database/migrations`.
4. Cargar datos iniciales si quieres con `database/seed-catalogo.sql`.
5. Ajustar `DB_*` en Railway.

## Checklist antes de vender

- `ADMIN_PASSWORD` cambiado
- `JWT_SECRET` cambiado
- `SMTP_FROM` con dominio real
- Google Maps funcionando con key de produccion
- SQL Server accesible desde produccion
- volumen persistente creado en Railway
- frontend apuntando a la API productiva
- compra real probada de punta a punta
- subida de comprobante probada
- cambio de estados en admin probado
- stock probado al comprar y al cancelar

## Flujo comercial actual

Hoy la tienda ya sirve para vender con transferencia manual:

1. la clienta crea el pedido
2. ve los datos bancarios
3. sube su comprobante
4. tu validas y gestionas el pedido desde admin

Si despues quieres automatizar pagos, ahi ya tocaria integrar `Webpay`, `Flow` o `Mercado Pago`.
