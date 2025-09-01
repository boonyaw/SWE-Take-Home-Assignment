import mysql from "mysql2/promise";

let pool;

export async function initDb() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "password",
    database: process.env.DB_NAME || "salary_app",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Create schema & seed
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        name   VARCHAR(255) PRIMARY KEY,
        salary DECIMAL(10,2) NOT NULL CHECK (salary >= 0.0)
      );
    `);

    const [rows] = await conn.query("SELECT COUNT(*) as c FROM users;");
    if (rows[0].c === 0) {
      await conn.beginTransaction();
      try {
        await conn.query(`INSERT INTO users (name, salary) VALUES ?`, [
          [
            ["Alex", 3000.0],
            ["Bryan", 3500.0],
            ["Cara", 0.0],
            ["Derek", 4100.0],
            ["Eve", 200.5],
          ],
        ]);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      }
    }
  } finally {
    conn.release();
  }

  return pool;
}

export function getDb() {
  return pool;
}
