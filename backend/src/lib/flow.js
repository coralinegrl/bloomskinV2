const crypto = require('crypto');

function flowConfig() {
  const sandbox = process.env.FLOW_ENV !== 'production';
  return { ready: process.env.FLOW_ENABLED === 'true' && Boolean(process.env.FLOW_API_KEY && process.env.FLOW_SECRET_KEY),
    sandbox, base: sandbox ? 'https://sandbox.flow.cl/api' : 'https://www.flow.cl/api' };
}

function signParameters(params, secret) {
  const value = Object.keys(params).filter(key => key !== 's').sort().map(key => `${key}${params[key]}`).join('');
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

async function flowRequest(method, params, post = false) {
  const config = flowConfig();
  if (!config.ready) throw new Error('Flow aún no está habilitado. Puedes pagar por transferencia.');
  const signed = { ...params, apiKey: process.env.FLOW_API_KEY };
  signed.s = signParameters(signed, process.env.FLOW_SECRET_KEY);
  const form = new URLSearchParams(signed);
  const response = await fetch(`${config.base}/${method}${post ? '' : `?${form}`}`, {
    method: post ? 'POST' : 'GET', headers: post ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {},
    body: post ? form.toString() : undefined, signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Flow no pudo procesar la solicitud. No vuelvas a pagar si ya recibiste un cargo.');
  return response.json();
}

function validatePayment(status, order) {
  return status.currency === 'CLP' && Number(status.amount) === Number(order.total_clp)
    && String(status.commerceOrder) === `BS-${String(order.id).padStart(4, '0')}`;
}

module.exports = { flowConfig, flowRequest, signParameters, validatePayment };
