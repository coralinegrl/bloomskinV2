# Deploy Bloomskin

## Arquitectura recomendada

- `frontend`: sitio estatico (`Vite`)
- `backend`: API Node.js
- `database`: SQL Server accesible desde el backend

## Frontend

Variables:

```env
VITE_API_BASE_URL=https://tu-api.com/api
```

Pasos:

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

Pasos:

```bash
cd backend
npm install
npm start
```

## Checklist antes de vender

- `ADMIN_PASSWORD` cambiado
- `JWT_SECRET` cambiado
- `SMTP_FROM` con dominio propio
- SQL Server accesible desde produccion
- `frontend` apuntando a la API productiva
- pruebas reales de:
  - home
  - catalogo
  - registro/login clienta
  - compra con cuenta
  - panel admin
  - newsletter

## Bloqueador comercial actual

Hoy el sitio puede captar pedidos, pero no tiene pasarela de pago integrada. Si lo publicas asi, estaras vendiendo con flujo tipo:

1. clienta crea pedido
2. tu gestionas el cobro por fuera
3. tu confirmas el pedido manualmente en admin

Para venta automatizada falta integrar pago real (`Webpay`, `Flow`, `Mercado Pago`, etc.).
