import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

let sql;

export async function connectDB() {
  if (!sql) {
    sql = await mysql.createConnection(MYSQL_CONFIG);
  }
  return sql;
}

export async function closeDB() {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

export function getTableBase(hostname) {
  // Remove username@ if present, then replace . with _
  return hostname.replace(/^.*@/, '').replace(/[.]/g, '_');
}
