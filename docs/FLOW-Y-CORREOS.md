# Flow y correos de Bloomskin

## Estado de Flow

La integracion esta preparada, pero NO debe activarse en produccion hasta
configurar las credenciales y completar una prueba real de sandbox.
La transferencia bancaria sigue disponible mientras tanto.

1. Entra a tu cuenta de Flow y verifica que tu comercio este habilitado.
2. Consulta la documentacion oficial: https://developers.flow.cl/api.
   Solicita acceso/credenciales API de pruebas y de produccion a Flow si
   no aparecen en tu panel. Son entornos y credenciales diferentes.
3. Configura en `backend/.env`, directamente en el servidor, sin compartir
   claves por chat ni agregarlas a Git:

   ```dotenv
   FLOW_ENABLED=false
   FLOW_ENV=sandbox
   FLOW_API_KEY=
   FLOW_SECRET_KEY=
   STORE_BASE_URL=https://bloomskin.cl
   ```

4. En un entorno de pruebas con su propia base de datos, habilita Flow.
   Comprueba un pago aprobado, uno rechazado, regreso sin pago y
   notificaciones repetidas. La prueba automatizada usa respuestas simuladas:
   no sustituye esta certificacion con Flow.
5. Para publicar, usa las claves reales, `FLOW_ENV=production` y
   `FLOW_ENABLED=true`, reinicia el backend y revisa "Correos y pagos".
6. Haz una compra real controlada y verifica monto, stock, pedido y correo
   antes de anunciar el nuevo medio de pago.

Notificacion del servidor: `POST https://bloomskin.cl/api/flow/confirm`.
Retorno de la compradora: `POST https://bloomskin.cl/api/flow/return`.
La aplicacion envia ambas URLs al crear el pago. No marques un pedido
como pagado solo porque la compradora regreso del proveedor: el backend
consulta el estado firmado y verifica moneda, monto y numero de pedido.

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
`node src/scripts/qa-commerce.js` crea una base `bloomskin_qa_<fecha>`,
sin modificar pedidos ni existencias de produccion. Simula Flow y desactiva
SMTP; no genera cargos ni correos reales. Usa el puerto 3001, que debe
estar libre. Conserva la base QA para poder inspeccionar resultados.

## Mantenimiento pendiente

La auditoria de dependencias del backend quedo sin alertas altas ni
criticas; conserva cinco moderadas, incluidas dependencias indirectas
de ExcelJS y herramientas de desarrollo. No se aplicaron downgrades ni
actualizaciones forzadas que alteraran la exportacion de ventas.
El servidor usa Node 20.9; algunas dependencias ya declaran Node 22.
Conviene programar la actualizacion del runtime con pruebas del driver
nativo de SQL Server y del arranque automatico de PM2. Las verificaciones
de esta entrega no equivalen a una auditoria de seguridad completa.
