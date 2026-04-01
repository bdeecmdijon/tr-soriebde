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

    const accounts = orgData.organization?.bank_accounts || [];
    
    // Appels parallèles pour tous les comptes
    const results = await Promise.all(
      accounts.map(acc =>
        fetch(`https://thirdparty.qonto.com/v2/transactions?iban=${acc.iban}&includes[]=attachments&per_page=50`, {
          headers: { 'Authorization': auth }
        }).then(r => r.json()).then(d => ({
          iban: acc.iban,
          name: acc.name || acc.iban,
          balance: acc.balance_cents ? acc.balance_cents / 100 : (acc.balance || 0),
          transactions: (d.transactions || []).filter(t => 
            !(t.operation_type === 'transfer' && t.label === 'Compte principal')
          )
        }))
      )
    );

    const allTx = results.flatMap(r => r.transactions)
      .sort((a, b) => new Date(b.settled_at || b.emitted_at) - new Date(a.settled_at || a.emitted_at));
    
    const soldeTotal = results.reduce((s, r) => s + r.balance, 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        transactions: allTx,
        solde_reel: soldeTotal,
        tous_comptes: results.map(r => ({ iban: r.iban, name: r.name, balance: r.balance })),
        meta: { total_count: allTx.length }
      })
    };

  } catch (err) {
    return { statusCod
