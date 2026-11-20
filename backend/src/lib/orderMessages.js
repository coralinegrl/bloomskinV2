const { storeBaseUrl } = require('./publicUrl');
const code = id => `BS-${String(id).padStart(4, '0')}`;
const money = value => '$' + Number(value || 0).toLocaleString('es-CL');
const paymentLabel = order => order.metodo_pago === 'flow' ? 'Flow' : 'Transferencia bancaria';
const deliveryLabel = order => order.metodo_envio === 'store_pickup' ? 'Retiro en Oficina Lina 210, Antofagasta' : order.direccion_envio || 'Despacho a domicilio';

function customerOrderContent(order, state, actionUrl) {
  const messages = {
    pending_payment: ['Recibimos tu pedido', 'Tu pedido está reservado, pero todavía no está pagado.', order.metodo_pago === 'flow'
      ? 'Abre tu pedido para continuar el pago seguro con Flow. Te confirmaremos cuando el pago esté aprobado.'
      : 'Transfiere el total exacto y sube el comprobante desde tu pedido. Lo revisaremos antes de confirmar el pago.'],
    payment_submitted: ['Recibimos tu comprobante', 'Estamos revisando tu transferencia. Este correo no confirma el pago; te avisaremos cuando esté validado.'],
    paid: ['Tu pago está confirmado', 'Recibimos tu pago y comenzaremos a preparar tu pedido. No necesitas volver a pagar.'],
    shipped: ['Tu pedido está en camino', 'Tu pedido fue despachado. Puedes revisar su estado desde el enlace seguro.'],
    pickup_ready: ['Tu pedido está listo para retirar', 'Ya puedes coordinar el retiro de tu pedido en Oficina Lina 210, Antofagasta.'],
    delivered: ['Gracias por comprar en Bloomskin', 'Tu pedido fue marcado como entregado. Esperamos que lo disfrutes. Si compraste con tu cuenta, puedes compartir tu experiencia desde Mis pedidos.'],
    cancelled: ['Tu pedido fue cancelado', 'La reserva de stock fue liberada. Si alcanzaste a pagar, no vuelvas a hacerlo: responde este correo para revisar tu caso.'],
  };
  const message = messages[state];
  if (!message) return null;
  const details = [['Pedido', code(order.id)], ['Total', money(order.total_clp)], ['Medio de pago', paymentLabel(order)], ['Entrega', deliveryLabel(order)]];
  if (state === 'pending_payment' && order.comprobante_limite_en) details.push(['Paga antes de', new Date(order.comprobante_limite_en).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }) + ' (hora de Chile)']);
  return { subject: `${message[0]} · ${code(order.id)}`, title: message[0], name: order.cliente_nombre,
    paragraphs: message.slice(1), details, actionUrl, actionLabel: 'Ver mi pedido' };
}

function adminOrderContent(order, state, items = []) {
  const messages = {
    pending_payment: ['Nuevo pedido reservado', 'Todavía no está pagado. No prepares el pedido hasta confirmar el pago.'],
    payment_submitted: ['Comprobante por revisar', 'Revisa el comprobante y verifica el abono en tu banco antes de marcar el pedido como pagado.'],
    paid: ['Pago confirmado: preparar pedido', 'El pago está confirmado. Ya puedes preparar el pedido y coordinar la entrega.'],
    manual_review: ['Pago Flow requiere revisión', 'Flow informó un pago que no se puede aplicar automáticamente. No prepares el pedido sin conciliarlo: revisa monto, estado y stock antes de coordinar entrega o devolución.'],
  };
  const message = messages[state];
  if (!message) return null;
  return { subject: `${message[0]} · ${code(order.id)}`, title: message[0], name: 'Bloomskin',
    paragraphs: [message[1], ...items.map(item => `${item.cantidad} x ${item.nombre}${item.tono_seleccionado ? ` (${item.tono_seleccionado})` : ''}`)],
    details: [['Pedido', code(order.id)], ['Total', money(order.total_clp)], ['Medio de pago', paymentLabel(order)],
      ['Clienta', order.cliente_nombre || ''], ['Correo', order.cliente_email || ''], ['Teléfono', order.cliente_telefono || ''], ['Entrega', deliveryLabel(order)]],
    actionUrl: `${storeBaseUrl()}/admin`, actionLabel: 'Revisar pedidos' };
}

module.exports = { customerOrderContent, adminOrderContent };
