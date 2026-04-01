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

    const bankAccount = orgData.organization?.bank_accounts?.[0];
    const bankAccountId = bankAccount?.id;
    const soldeReel = bankAccount?.balance_cents ? bankAccount.balance_cents / 100 : bankAccount?.balance;

    if (!bankAccountId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No bank account' }) };

    const txRes = await fetch(
      `https://thirdparty.qonto.com/v2/transactions?bank_account_id=${bankAccountId}&includes[]=attachments&per_page=100`,
      { headers: { 'Authorization': auth } }
    );
    const txData = await txRes.json();
    if (!txRes.ok) return { statusCode: txRes.status, headers, body: JSON.stringify(txData) };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        transactions: txData.transactions || [],
        solde_reel: soldeReel,
        iban: bankAccount?.iban,
        meta: txData.meta
      })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
