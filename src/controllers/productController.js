import * as Product from "../models/productModel.js";
import { pool } from "../db.js";


// Tạo sản phẩm mới
export async function create(req, res, next) {
  try {
    const {
      sku,
      name,
      brand_name = null,
      category_name = null,
      price,
      sale_price,
      stock_qty = 0,
      warranty_months = null,
      thumbnail_url = null,
      specs_json = null,
      is_active = true,
    } = req.body;

    if (!sku || !name || price == null || sale_price == null)
      throw new Error("Thiếu dữ liệu sản phẩm");

    const id = await Product.createProduct({
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
      is_active: is_active ? 1 : 0,
    });

    res.status(201).json({
      ok: true,
      message: "Tạo sản phẩm thành công",
      product_id: id,
    });
  } catch (err) {
    // Bắt lỗi từ MySQL và thông báo
    if (err.code === "ER_DUP_ENTRY") {
      err.message = "SKU hoặc tên sản phẩm đã tồn tại";
    } else if (err.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
      err.message = "sale_price không thể lớn hơn price";
    }
    res.status(400).json({ ok: false, error: err.message });
  }
}

// Lấy ds sản phẩm
export async function list(req, res, next) {
  try {
    const data = await Product.listProducts();
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
}

// Bật / tắt sản phẩm
export async function setActive(req, res, next) {
  try {
    const id = +req.params.id;
    const { is_active } = req.body;

    if (![0, 1].includes(is_active))
      throw new Error("Giá trị is_active phải là 0 hoặc 1");

    const [result] = await pool.query(
      "UPDATE products SET is_active = ? WHERE id = ?",
      [is_active, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ ok: false, error: "Không tìm thấy sản phẩm" });

    res.json({
      ok: true,
      message: is_active ? "Sản phẩm đã được kích hoạt" : "Sản phẩm đã bị vô hiệu hóa",
    });
  } catch (err) {
    next(err);
  }
}
