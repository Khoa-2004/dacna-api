import * as Product from "../models/productModel.js";

// Create new products
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
    next(err);
  }
}

// Get product list
export async function list(req, res, next) {
  try {
    const data = await Product.listProducts();
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
}
