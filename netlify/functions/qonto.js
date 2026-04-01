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
  if (!auth) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing authorization' }) };
  }

  try {
    // Étape 1 : récupérer le bank_account_id
    const orgRes = await fetch('https://thirdparty.qonto.com/v2/organization', {
      headers: { 'Authorization': auth }
    });
    const orgData = await orgRes.json();
    if (!orgRes.ok) return { statusCode: orgRes.status, headers, body: JSON.stringify(orgData) };

    const bankAccountId = orgData.organization?.bank_accounts?.[0]?.id;
    if (!bankAccountId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No bank account found' }) };

    // Étape 2 : récupérer les transactions
    const txRes = await fetch(`https://thirdparty.qonto.com/v2/transactions?bank_account_id=${bankAccountId}&includes[]=attachments`, {
      headers: { 'Authorization': auth }
    });
    const txData = await txRes.json();
    if (!txRes.ok) return { statusCode: txRes.status, headers, body: JSON.stringify(txData) };

    return { statusCode: 200, headers, body: JSON.stringify(txData) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
