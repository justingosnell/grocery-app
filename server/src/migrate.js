const fs = require('node:fs/promises');
const path = require('node:path');
const { pool } = require('./db');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run migrations.');
  }

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    process.stdout.write(`Running ${file}...\n`);
    await pool.query(sql);
  }
}

migrate()
  .then(async () => {
    await pool.end();
    process.stdout.write('Migrations complete.\n');
  })
  .catch(async (error) => {
    await pool.end().catch(() => {});
    console.error(error);
    process.exitCode = 1;
  });
