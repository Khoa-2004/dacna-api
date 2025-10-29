import { pool } from "../db.js";
import { newOrderCode } from "../utils/helpers.js";

// Create and empty cart (status = cart)
export async function createOrder({ user_id, address_street, address_district, address_ward, address_city }) {
  const order_code = newOrderCode();
  const [result] = await pool.execute(
    `INSERT INTO orders
     (order_code, user_id, address_street, address_district, address_ward, address_city,
      subtotal, shipping_fee, discount_total, grand_total,
      payment_method, payment_status, order_status,
      created_at, updated_at)
     VALUES
     (:order_code, :user_id, :street, :district, :ward, :city,
      0, 0, 0, 0, 'cod', 'unpaid', 'cart', NOW(), NOW())`,
    { order_code, user_id, street: address_street, district: address_district, ward: address_ward, city: address_city }
  );
  return { id: result.insertId, order_code };
}

// Get order detais and items
export async function getOrderDetail(id) {
  const [[order]] = await pool.query(`SELECT * FROM orders WHERE id=:id`, { id });
  if (!order) return null;
  const [items] = await pool.query(
    `SELECT product_id, item_name_snapshot, unit_price, qty, amount 
     FROM order_items WHERE order_id=:id`,
    { id }
  );
  order.items = items;
  return order;
}

// Add or update items
export async function upsertItem(order_id, product_id, qty) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query(`SELECT order_status FROM orders WHERE id=:id`, { id: order_id });
    if (!order) throw new Error("Order not found");
    if (order.order_status !== "cart") throw new Error("Order is not editable");

    const [[p]] = await conn.query(`SELECT id, name, sale_price, is_active FROM products WHERE id=:pid`, { pid: product_id });
    if (!p || p.is_active !== 1) throw new Error("Invalid product");

    const [[exist]] = await conn.query(
      `SELECT id FROM order_items WHERE order_id=:oid AND product_id=:pid`,
      { oid: order_id, pid: product_id }
    );

    if (!exist) {
      await conn.execute(
        `INSERT INTO order_items
         (order_id, product_id, item_name_snapshot, unit_price, qty, created_at)
         VALUES (:oid, :pid, :name, :price, :qty, NOW())`,
        { oid: order_id, pid: product_id, name: p.name, price: p.sale_price, qty }
      );
    } else {
      await conn.execute(
        `UPDATE order_items SET qty=:qty, unit_price=:price WHERE id=:id`,
        { qty, price: p.sale_price, id: exist.id }
      );
    }

    await recalcTotals(conn, order_id);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Delete item from order
export async function removeItem(order_id, product_id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[o]] = await conn.query(`SELECT order_status FROM orders WHERE id=:id`, { id: order_id });
    if (!o) throw new Error("Order not found");
    if (o.order_status !== "cart") throw new Error("Order is not editable");

    await conn.execute(`DELETE FROM order_items WHERE order_id=:oid AND product_id=:pid`, { oid: order_id, pid: product_id });
    await recalcTotals(conn, order_id);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Update subtotal and grandtotal
export async function recalcTotals(conn, order_id) {
  const [[{ subtotal }]] = await conn.query(
    `SELECT COALESCE(SUM(amount),0) AS subtotal FROM order_items WHERE order_id=:id`,
    { id: order_id }
  );
  await conn.execute(
    `UPDATE orders SET subtotal=:subtotal, grand_total=(subtotal + shipping_fee - discount_total) WHERE id=:id`,
    { subtotal, id: order_id }
  );
}

// Checkout
export async function checkoutOrder(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[o]] = await conn.query(`SELECT order_status FROM orders WHERE id=:id`, { id });
    if (!o) throw new Error("Order not found");
    if (o.order_status !== "cart") throw new Error("Order is not a cart");

    const [[{ items }]] = await conn.query(`SELECT COUNT(*) AS items FROM order_items WHERE order_id=:id`, { id });
    if (items === 0) throw new Error("Cart is empty");

    await recalcTotals(conn, id);
    const [[{ subtotal }]] = await conn.query(`SELECT subtotal FROM orders WHERE id=:id`, { id });
    const shipping_fee = subtotal >= 500000 ? 0 : 30000;

    await conn.execute(
      `UPDATE orders
       SET shipping_fee=:sf, grand_total=(subtotal + :sf - discount_total),
           order_status='awaiting_payment', updated_at=NOW()
       WHERE id=:id`,
      { sf: shipping_fee, id }
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Order payment
export async function payOrder(id, method) {
  const [r] = await pool.query(`SELECT order_status FROM orders WHERE id=:id`, { id });
  if (!r.length) throw new Error("Order not found");
  const st = r[0].order_status;
  if (!["awaiting_payment", "created"].includes(st)) throw new Error("Order not awaiting payment");

  await pool.execute(
    `UPDATE orders
     SET payment_method=:pm, payment_status='paid', order_status='paid', updated_at=NOW()
     WHERE id=:id`,
    { pm: method === "card" ? "card" : "cod", id }
  );
}

// Update order status
export async function updateStatus(id, newStatus) {
  const valid = ["created", "awaiting_payment", "paid", "processing", "shipping", "delivered", "failed", "cancelled"];
  if (!valid.includes(newStatus)) throw new Error("Invalid status");

  let shipped = null, delivered = null;
  if (newStatus === "shipping") shipped = new Date();
  if (newStatus === "delivered") delivered = new Date();

  await pool.execute(
    `UPDATE orders
     SET order_status=:st,
         shipped_at=IF(:shipped IS NULL, shipped_at, :shipped),
         delivered_at=IF(:delivered IS NULL, delivered_at, :delivered),
         updated_at=NOW()
     WHERE id=:id`,
    { st: newStatus, shipped, delivered, id }
  );
}
