import { pool } from "../db.js";

// Create a user
export async function createUser({ username, email, pw, phone }) {
  const [result] = await pool.execute(
    `INSERT INTO Users (username, email, phone, pw, roles, created_at, updated_at)
     VALUES (:username, LOWER(:email), :phone, :pw, 'customer', NOW(), NOW())`,
    { username, email, phone, pw }
  );
  return result.insertId;
}

// Find a user  by username or email
export async function findUserByUsernameOrEmail(u) {
  const [rows] = await pool.execute(
    `SELECT * FROM Users 
     WHERE LOWER(username)=LOWER(:u) OR LOWER(email)=LOWER(:u)
     LIMIT 1`,
    { u }
  );
  return rows[0];
}
