exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const auth = event.headers['authorization'] || event.headers['Authorization'];
  if (!auth) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing authorization' }) };

  const IBAN_PRINCIPAL = 'FR7616958000019046881798063';
  const IBAN_SECONDAIRE = 'FR7616958000015333825637533';

  try {
    const [r1, r2] = await Promise.all([
      fetch(`https://thirdparty.qonto.com/v2/transactions?iban=${IBAN_PRINCIPAL}&includes[]=attachments&per_page=50`, {
        headers: { 'Authorization': auth }
      }).then(r => r.json()),
      fetch(`https://thirdparty.qonto.com/v2/transactions?iban=${IBAN_SECONDAIRE}&includes[]=attachments&per_page=50`, {
        headers: { 'Authorization': auth }
      }).then(r => r.json())
    ]);

    const tx1 = (r1.transactions || []);
    const tx2 = (r2.transactions || []);
    
    const allTx = [...tx1, ...tx2]
      .filter(t => !(t.operation_type === 'transfer' && t.label === 'Compte principal'))
      .sort((a, b) => new Date(b.settled_at || b.emitted_at) - new Date(a.settled_at || a.emitted_at));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        transactions: allTx,
        meta: { total_count: allTx.length }
      })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
