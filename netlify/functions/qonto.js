exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const auth = event.headers['authorization'] || event.headers['Authorization'];
  if (!auth) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing authorization' }) };
  }

  const path = event.queryStringParameters?.path || 'transactions';
  const url = `https://thirdparty.qonto.com/v2/${path}?status=completed&includes[]=attachments&per_page=50`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.message || 'Qonto API error', details: data })
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
