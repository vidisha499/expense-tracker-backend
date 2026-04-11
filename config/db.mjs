// config/db.mjs
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect((err, client, release) => {
  if (err) {
    return console.error('❌ NeonDB connection failed:', err.stack);
  }
  console.log('✅ Successfully connected to NeonDB (PostgreSQL)');
  release();
});

export default db;