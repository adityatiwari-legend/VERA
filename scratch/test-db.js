const { Client } = require('pg');

const passwords = ['', 'postgres', 'admin', 'root', 'password', '123456', '1234', 'postgrespassword', 'vera', 'fundtrail'];

async function test() {
  for (const p of passwords) {
    const c = new Client({
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: p,
      database: 'postgres'
    });
    try {
      await c.connect();
      console.log('SUCCESSFUL PASSWORD:', JSON.stringify(p));
      await c.end();
      return;
    } catch (err) {
      // try next
    }
  }
  console.log('No common password matched on port 5432');
}

test();
