# Flow y correos de Bloomskin

## Estado de Flow

Flow fue habilitado en produccion el 19 de noviembre de 2026, despues de
verificar las credenciales y completar las pruebas reales de Sandbox.
La transferencia bancaria sigue disponible como alternativa.
Queda pendiente la primera compra real controlada por el comercio.

1. Entra a tu cuenta de Flow y verifica que tu comercio este habilitado.
2. Consulta la documentacion oficial: https://developers.flow.cl/api.
   Solicita acceso/credenciales API de pruebas y de produccion a Flow si
   no aparecen en tu panel. Son entornos y credenciales diferentes.
3. Configura en `backend/.env`, directamente en el servidor, sin compartir
   claves por chat ni agregarlas a Git:

   ```dotenv
   FLOW_ENABLED=false
   FLOW_ENV=production
   FLOW_API_KEY=
   FLOW_SECRET_KEY=
   FLOW_SANDBOX_API_KEY=
   FLOW_SANDBOX_SECRET_KEY=
   STORE_BASE_URL=https://bloomskin.cl
   ```

4. Las claves reales quedan en `FLOW_API_KEY` y `FLOW_SECRET_KEY`.
   Guarda las de pruebas en `FLOW_SANDBOX_API_KEY` y `FLOW_SANDBOX_SECRET_KEY`.
   El script aislado de Sandbox selecciona las de pruebas solo en su proceso;
   no cambia las variables activas de la tienda.
5. Para publicar, usa las claves reales, `FLOW_ENV=production` y
   `FLOW_ENABLED=true`, reinicia el backend y revisa "Correos y pagos".
6. Haz una compra real controlada y verifica monto, stock, pedido y correo
   antes de anunciar el nuevo medio de pago.

Notificacion del servidor: `POST https://bloomskin.cl/api/flow/confirm`.
Retorno de la compradora: `POST https://bloomskin.cl/api/flow/return`.
La aplicacion envia ambas URLs al crear el pago. No marques un pedido
como pagado solo porque la compradora regreso del proveedor: el backend
consulta el estado firmado y verifica moneda, monto y numero de pedido.

Flow se abre en otra pestana desde el checkout y desde el enlace privado
del pedido. La pestana original conserva el resumen y consulta el estado
al recuperar el foco y cada 15 segundos mientras permanece visible y
pendiente de pago. Si el navegador bloquea la apertura, se puede continuar
desde el mismo pedido; no se crea otro pedido para volver a abrir Flow.
Las pestanas preparatorias se cierran si falla la operacion y la pagina
externa no conserva acceso a la ventana de origen.

Si Flow informa un pago cuando el pedido ya estaba cancelado, no se vuelve
a descontar stock ni a preparar el pedido automaticamente. Aparece en
"Correos y pagos" para conciliar el pago y coordinar entrega o devolucion.

## Cuando se envian los correos

| Momento | Mensaje |
| --- | --- |
| Registro de cuenta | Bienvenida y acceso a Mi cuenta |
| Solicitud de recuperacion | Enlace temporal para cambiar contrasena |
| Pedido creado | Resumen, plazo de pago y enlace privado al pedido |
| Comprobante recibido | Acuse de recibo; NO afirma que el pago este validado |
| Pago validado / Flow confirmado | Confirmacion de pago y preparacion |
| Despacho / retiro listo | Mensaje distinto segun la modalidad |
| Entregado | Agradecimiento e invitacion a resenar desde la cuenta |
| Cancelado, incluso por plazo vencido | Liberacion de reserva y ayuda si ya pago |

Los mensajes de pedidos se registran una vez por pedido y estado.
Si SMTP falla, se reintenta cada cinco minutos hasta cinco intentos,
solo si el mensaje sigue correspondiendo al estado actual del pedido.
Una aceptacion SMTP no garantiza llegada a la bandeja principal.

El panel "Correos y pagos" permite verificar SMTP, enviar una prueba a
un correo elegido y revisar los ultimos eventos. No envia pruebas solo
por abrir la seccion. Las newsletters conservan su envio manual.

Los enlaces privados vencen a los 30 dias y permiten consultar o completar
solo ese pedido. No los compartas ni los publiques. No dan acceso a una
cuenta, a otros pedidos o al panel de administracion.

## Verificacion tecnica

Desde `backend`: `node --test src/lib/commerce.test.js src/lib/siteSettings.test.js`.
Desde la raiz: `node --test frontend/tests/flowPayment.test.mjs`.
Con el frontend local en el puerto 4185 y Playwright disponible,
`node frontend/tests/flowTabs.browser.cjs` verifica Chrome, Edge y WebKit
en movil y escritorio. `PLAYWRIGHT_MODULE_PATH` admite una instalacion
externa y `QA_BASE_URL` otro servidor. Todas las llamadas API y paginas
de Flow de esa prueba se simulan: no crea pedidos ni cobros reales.

`node src/scripts/qa-commerce.js` crea una base `bloomskin_qa_<fecha>`,
sin modificar pedidos ni existencias de produccion. Simula Flow y desactiva
SMTP; no genera cargos ni correos reales. Usa el puerto 3001, que debe
estar libre. Conserva la base QA para poder inspeccionar resultados.

### Prueba real de Sandbox

`node src/scripts/qa-flow-sandbox.js` crea una base QA, desactiva el SMTP
de la aplicacion y publica temporalmente SOLO los callbacks de Flow,
los recursos estaticos y la consulta privada del pedido de prueba.
Requiere el ejecutable oficial de Cloudflare (`CLOUDFLARED_PATH`) para
recibir la notificacion real de Flow; no cambia IIS ni el dominio real.
El correo del pagador de prueba debe ser propio: usa `FLOW_SANDBOX_TEST_EMAIL`
o, por defecto, el remitente configurado en `SMTP_FROM`.
Flow Sandbox puede generar sus propios avisos al correo del comercio.

El script escribe una fixture privada en la carpeta temporal del sistema.
`qa-flow-browser.cjs` permite completar el simulador de Flow con Playwright
mediante las acciones `pay` y `reject`. Requiere Playwright instalado
o una ruta en `PLAYWRIGHT_MODULE_PATH`.
`qa-flow-check.js audit` verifica confirmacion, callbacks duplicados,
stock por variante y un solo evento de correo. `create-reject`,
`create-retry` y `audit-retry` verifican el rechazo y posterior reintento.
`create-cancel` y `audit-late` verifican un pago posterior a la cancelacion,
incluida la advertencia en admin y la exclusion de los totales de ventas.
Los recibos de auditoria y capturas quedan en la carpeta temporal de la prueba.

Cada intento conserva su token en `flow_payment_attempts`. Solo se permite
generar otro intento si Flow confirma que el anterior fue rechazado o
anulado; un pago en estado incierto nunca se recrea automaticamente.
Una notificacion antigua de rechazo no puede revertir un pago aprobado.
Un cobro tardio de un intento anterior queda marcado para conciliacion.

El retorno del navegador admite un POST desde dominios HTTPS de Flow
exclusivamente en `/api/flow/return`; el resto de la API conserva sus
restricciones de origen y autenticacion.

### Resultados del 19 de noviembre de 2026

Se completo el simulador real de Flow Sandbox, no solo respuestas mock:

- Pago aprobado y retorno automatico al pedido con "Pago confirmado".
- Rechazo seguido de un nuevo intento aprobado sobre el mismo pedido.
- Notificaciones duplicadas y notificacion antigua de rechazo sin volver
  a descontar stock ni duplicar el evento de correo de pago.
- Pago tardio de un pedido cancelado: queda cancelado, stock disponible,
  alerta de conciliacion en admin y sin inflar el resumen de ventas.
- Credenciales productivas verificadas mediante una consulta sin cobro.

Flow en produccion esta habilitado. Falta efectuar una primera compra
real controlada por el comercio; Sandbox no prueba la
liquidacion bancaria real ni garantiza entrega de correos a la bandeja.

## Mantenimiento pendiente

La auditoria de dependencias del backend quedo sin alertas altas ni
criticas; conserva cinco moderadas, incluidas dependencias indirectas
de ExcelJS y herramientas de desarrollo. No se aplicaron downgrades ni
actualizaciones forzadas que alteraran la exportacion de ventas.
El servidor usa Node 20.9; algunas dependencias ya declaran Node 22.
Conviene programar la actualizacion del runtime con pruebas del driver
nativo de SQL Server y del arranque automatico de PM2. Las verificaciones
de esta entrega no equivalen a una auditoria de seguridad completa.
