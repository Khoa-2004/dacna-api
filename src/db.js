// src/db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Nạp biến môi trường từ file .env
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DB || "dacna",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

// ✅ Thêm dòng log này giúp kiểm tra nhanh khi lỗi “Access denied”
console.log("MySQL Config Loaded:", {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD ? "******" : "(empty)",
  db: process.env.MYSQL_DB,
});

