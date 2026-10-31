const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5433,
    user: 'postgres',
    database: 'postgres'
  });

  await client.connect();

  await client.query('CREATE DATABASE fundtrail');
  await client.query('CREATE DATABASE vera');
  console.log('Created fundtrail and vera successfully!');

  await client.end();
}

main().catch(console.error);
