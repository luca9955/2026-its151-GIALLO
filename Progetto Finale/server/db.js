import mariadb from "mariadb";
import dotenv from "dotenv";

dotenv.config();

export const pool = mariadb.createPool({
  host: process.env.MARIADB_HOST || "localhost",
  port: Number(process.env.MARIADB_PORT || 3306),
  database: process.env.MARIADB_DATABASE || "ficsit_restaurant",
  user: process.env.MARIADB_USER || "ficsit_app",
  password: process.env.MARIADB_PASSWORD || "",
  connectionLimit: Number(process.env.MARIADB_CONNECTION_LIMIT || 5),
  acquireTimeout: Number(process.env.MARIADB_TIMEOUT || 10000),
});

export async function withConnection(callback) {
  let connection;
  try {
    connection = await pool.getConnection();
    return await callback(connection);
  } finally {
    if (connection) connection.release();
  }
}

export async function withTransaction(callback) {
  return withConnection(async (connection) => {
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}
