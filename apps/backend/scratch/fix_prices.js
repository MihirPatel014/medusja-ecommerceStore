const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres123@127.0.0.1:5566/medusa_store_db');

async function run() {
  await client.connect();
  console.log('Connected to DB');
  
  const query = `
    INSERT INTO price (id, amount, currency_code, price_set_id, raw_amount, created_at, updated_at)
    SELECT 
      'price_inr_' || id, 
      (amount::numeric * 80), 
      'inr', 
      price_set_id, 
      jsonb_build_object('value', (amount::numeric * 80)::text, 'precision', 20),
      now(), 
      now()
    FROM price
    WHERE currency_code = 'usd'
    ON CONFLICT DO NOTHING;
  `;
  
  const res = await client.query(query);
  console.log(`Successfully created ${res.rowCount} INR prices`);
  
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
