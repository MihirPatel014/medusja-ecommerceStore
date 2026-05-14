
const { Client } = require('pg');

async function checkSchemas() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres123@127.0.0.1:5566/medusa_store_db"
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'price_list';
    `);
    console.log('price_list tables:');
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSchemas();
