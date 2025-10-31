import { pool } from "../db.js";

// Tạo ng dùng
export async function createUser({ username, email, pw, phone }) {
  const [result] = await pool.execute(
    `INSERT INTO Users (username, email, phone, pw, roles, created_at, updated_at)
     VALUES (:username, LOWER(:email), :phone, :pw, 'customer', NOW(), NOW())`,
    { username, email, phone, pw }
  );
  return result.insertId;
}

// Tìm ng dùng = userame/email
export async function findUserByUsernameOrEmail(value) {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1",
    [value, value]
  );
  return rows.length ? rows[0] : null;
}
