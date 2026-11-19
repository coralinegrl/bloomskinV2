if (process.env.NODE_ENV !== 'test' || !/^bloomskin_qa_\d+$/.test(process.env.DB_NAME || '')) throw new Error('Flow mock is QA-only');
const nativeFetch = global.fetch;
const payments = new Map();
global.fetch = async (url, options) => {
  if (!String(url).startsWith('https://sandbox.flow.cl/api/')) return nativeFetch(url, options);
  if (String(url).includes('payment/create')) {
    const form = new URLSearchParams(options.body);
    const token = `qa_token_${form.get('commerceOrder')}`;
    payments.set(token, { status: 2, currency: 'CLP', amount: Number(form.get('amount')), commerceOrder: form.get('commerceOrder') });
    return Response.json({url:'https://sandbox.flow.cl/app/web/pay.php',token});
  }
  const token = new URL(url).searchParams.get('token');
  const payment = payments.get(token);
  return Response.json(payment || {}, {status:payment ? 200 : 404});
};
