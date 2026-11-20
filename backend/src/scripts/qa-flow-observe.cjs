if (process.env.NODE_ENV !== 'test' || process.env.FLOW_ENV !== 'sandbox' || !/^bloomskin_qa_\d+$/.test(process.env.DB_NAME || '')) throw new Error('Flow observer is QA-only');
const originalFetch = global.fetch;
global.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (!response.ok && String(args[0]).startsWith('https://sandbox.flow.cl/api/')) {
    const data = await response.clone().json().catch(()=>({}));
    let message = String(data.message || '').slice(0,500);
    for (const key of ['FLOW_API_KEY','FLOW_SECRET_KEY','FLOW_SANDBOX_API_KEY','FLOW_SANDBOX_SECRET_KEY']) {
      if (process.env[key]) message=message.split(process.env[key]).join('[redacted]');
    }
    console.error('Sandbox API error:',JSON.stringify({httpStatus:response.status,code:typeof data.code==='number'?data.code:undefined,message}));
  }
  return response;
};
