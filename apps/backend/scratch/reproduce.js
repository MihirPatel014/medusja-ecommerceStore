
const http = require('http');

async function post(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    }, res => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: rawData ? JSON.parse(rawData) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: rawData });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function get(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, res => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: rawData ? JSON.parse(rawData) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: rawData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function reproduce() {
  try {
    console.log('Logging in...');
    const loginRes = await post('http://localhost:9000/auth/user/emailpass', {
      email: 'admin@test.com',
      password: 'password123'
    });

    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.status, loginRes.data);
      return;
    }

    const token = loginRes.data.token;
    console.log('Logged in. Fetching price lists...');

    const res = await get('http://localhost:9000/admin/price-lists?limit=20&offset=0', token);
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

reproduce();
