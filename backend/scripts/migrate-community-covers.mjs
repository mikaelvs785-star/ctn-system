import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL antes da migração.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  const sql = await readFile(new URL('../deploy/community-covers.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  console.log('Coluna de capas de comunidades preparada. Cadastros existentes preservados.');
} finally { await pool.end(); }
