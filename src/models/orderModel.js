import { pool } from "../db.js";

// Tạo order mới
export async function createOrder({
  user_id,
  address_street,
  address_district,
  address_ward,
  address_city,
}) {
  // Tạo mã order ngẫu nhiên
  const order_code = `OD${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const [result] = await pool.query(
    `INSERT INTO orders (order_code, user_id, address_street, address_district, address_ward, address_city)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [order_code, user_id, address_street, address_district, address_ward, address_city]
  );

  return { id: result.insertId, order_code };
}

// Lấy thông tin order theo ID
export async function getOrderById(orderId) {
  const [rows] = await pool.query(
    "SELECT id, user_id, order_code, order_status FROM orders WHERE id = ?",
    [orderId]
  );
  return rows.length ? rows[0] : null;
}

// Lấy chi tiết order (kèm items)
export async function getOrderDetail(orderId) {
  const [orders] = await pool.query(
    "SELECT id, user_id, order_code, order_status, subtotal, shipping_fee, grand_total, payment_status, created_at, updated_at FROM orders WHERE id = ?",
    [orderId]
  );
  if (!orders.length) return null;

  const order = orders[0];
  const [items] = await pool.query(
    "SELECT product_id, item_name_snapshot, unit_price, qty, amount FROM order_items WHERE order_id = ?",
    [orderId]
  );
  order.items = items;
  return order;
}

// Lấy danh sách item theo order
export async function getOrderItems(orderId) {
  const [rows] = await pool.query(
    "SELECT * FROM order_items WHERE order_id = ?",
    [orderId]
  );
  return rows;
}

// Thêm hoặc cập nhật item trong order
export async function upsertItem(orderId, productId, qty) {
  // Lấy thông tin sản phẩm
  const [products] = await pool.query(
    "SELECT name, sale_price FROM products WHERE id = ? AND is_active = 1",
    [productId]
  );
  if (!products.length)
    throw new Error("Sản phẩm không tồn tại hoặc ngừng kinh doanh");

  const product = products[0];

  // Thêm hoặc cập nhật item
  await pool.query(
    `INSERT INTO order_items (order_id, product_id, item_name_snapshot, unit_price, qty)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       qty = VALUES(qty), 
       unit_price = VALUES(unit_price),
       item_name_snapshot = VALUES(item_name_snapshot)`,
    [orderId, productId, product.name, product.sale_price, qty]
  );
}

// Xóa item khỏi order
export async function removeItem(orderId, productId) {
  const [result] = await pool.query(
    "DELETE FROM order_items WHERE order_id = ? AND product_id = ?",
    [orderId, productId]
  );

  if (result.affectedRows === 0)
    throw new Error("Sản phẩm không tồn tại trong đơn hàng");
}

// Tính lại subtotal, phí ship, grand_total
export async function recalculateTotals(orderId) {
  const [rows] = await pool.query(
    "SELECT SUM(amount) AS subtotal FROM order_items WHERE order_id = ?",
    [orderId]
  );

  const subtotal = rows[0].subtotal || 0;
  const shipping_fee = subtotal > 0 && subtotal < 500000 ? 30000 : 0;

  await pool.query(
    `UPDATE orders
     SET subtotal = ?, 
         shipping_fee = ?, 
         grand_total = subtotal + shipping_fee - discount_total
     WHERE id = ?`,
    [subtotal, shipping_fee, orderId]
  );
}

// Checkout
export async function checkoutOrder(orderId) {
  const [orderRows] = await pool.query("SELECT order_status FROM orders WHERE id = ?", [orderId]);
  if (!orderRows.length) throw new Error("Không tìm thấy đơn hàng");

  const order = orderRows[0];
  if (order.order_status !== "cart")
    throw new Error("Đơn hàng đã được checkout");

  await pool.query(
    "UPDATE orders SET order_status = 'awaiting_payment' WHERE id = ?",
    [orderId]
  );
}

// Thanh toán
export async function payOrder(orderId, method) {
  const [orders] = await pool.query("SELECT order_status FROM orders WHERE id = ?", [orderId]);
  if (!orders.length) throw new Error("Không tìm thấy đơn hàng");

  const order = orders[0];
  if (!["awaiting_payment", "created"].includes(order.order_status))
    throw new Error("Không thể thanh toán đơn hàng ở trạng thái hiện tại");

  await pool.query(
    `UPDATE orders 
     SET payment_method = ?, 
         payment_status = 'paid',
         order_status = 'paid',
         updated_at = NOW()
     WHERE id = ?`,
    [method, orderId]
  );
}

// Cập nhật trạng thái đơn (Admin/Staff)
export async function updateStatus(orderId, newStatus) {
  const validStatuses = [
    "created",
    "awaiting_payment",
    "paid",
    "processing",
    "shipping",
    "delivered",
    "failed",
    "cancelled",
  ];

  if (!validStatuses.includes(newStatus))
    throw new Error("Trạng thái không hợp lệ");

  await pool.query(
    "UPDATE orders SET order_status = ?, updated_at = NOW() WHERE id = ?",
    [newStatus, orderId]
  );
}
