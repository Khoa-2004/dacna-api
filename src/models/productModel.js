import { pool } from "../db.js";

/** 📦 Tạo sản phẩm mới */
export async function createProduct({
  sku,
  name,
  brand_name,
  category_name,
  price,
  sale_price,
  stock_qty,
  warranty_months,
  thumbnail_url,
  specs_json,
  is_active,
}) {
  const [result] = await pool.execute(
    `INSERT INTO products
     (sku, name, brand_name, category_name, price, sale_price, stock_qty, 
      warranty_months, thumbnail_url, specs_json, is_active, created_at, updated_at)
     VALUES
     (:sku, :name, :brand_name, :category_name, :price, :sale_price, :stock_qty,
      :warranty_months, :thumbnail_url, :specs_json, :is_active, NOW(), NOW())`,
    {
      sku,
      name,
      brand_name,
      category_name,
      price,
      sale_price,
      stock_qty,
      warranty_months,
      thumbnail_url,
      specs_json,
      is_active,
    }
  );
  return result.insertId;
}

// Get list of active products
export async function listProducts() {
  const [rows] = await pool.query(
    `SELECT id, sku, name, brand_name, category_name, price, sale_price, stock_qty, thumbnail_url
     FROM products 
     WHERE is_active = 1
     ORDER BY created_at DESC`
  );
  return rows;
}
