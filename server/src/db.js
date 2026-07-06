const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const ssl = process.env.DATABASE_SSL === 'false'
  ? false
  : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString,
  ssl,
  max: Number(process.env.DATABASE_POOL_MAX || 10),
});

async function withClient(callback) {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

async function withTransaction(callback) {
  return withClient(async (client) => {
    await client.query('begin');
    try {
      const result = await callback(client);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  });
}

module.exports = {
  pool,
  withClient,
  withTransaction,
};
