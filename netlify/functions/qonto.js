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

  try {
    const orgRes = await fetch('https://thirdparty.qonto.com/v2/organization', {
      headers: { 'Authorization': auth }
    });
    const orgData = await orgRes.json();
    if (!orgRes.ok) return { statusCode: orgRes.status, headers, body: JSON.stringify(orgData) };

    const bankAccounts = orgData.organization?.bank_accounts || [];
    
    // Récupérer les transactions de TOUS les comptes
    let allTransactions = [];
    let soldeTotal = 0;
    let allComptes = [];

    for (const account of bankAccounts) {
      soldeTotal += account.balance_cents ? account.balance_cents / 100 : (account.balance ||
