import * as Order from "../models/orderModel.js";

// Create an order
export async function create(req, res, next) {
  try {
    const { user_id, address_street, address_district, address_ward, address_city } = req.body;
    if (!user_id || !address_street || !address_city)
      throw new Error("Thiếu thông tin địa chỉ");

    const data = await Order.createOrder({
      user_id,
      address_street,
      address_district,
      address_ward,
      address_city,
    });

    res.status(201).json({
      ok: true,
      message: "Đơn hàng được tạo thành công",
      ...data,
    });
  } catch (err) {
    next(err);
  }
}

// Get order details
export async function detail(req, res, next) {
  try {
    const id = +req.params.id;
    const order = await Order.getOrderDetail(id);
    if (!order) return res.status(404).json({ ok: false, error: "Không tìm thấy đơn hàng" });
    res.json({ ok: true, data: order });
  } catch (err) {
    next(err);
  }
}

// Add/Update item
export async function addItem(req, res, next) {
  try {
    const id = +req.params.id;
    const { product_id, qty } = req.body;
    if (!product_id || !qty || qty <= 0) throw new Error("Số lượng không hợp lệ");

    await Order.upsertItem(id, product_id, qty);
    res.json({ ok: true, message: "Thêm hoặc cập nhật sản phẩm thành công" });
  } catch (err) {
    next(err);
  }
}

// Delete item
export async function removeItem(req, res, next) {
  try {
    const { id, productId } = req.params;
    await Order.removeItem(+id, +productId);
    res.json({ ok: true, message: "Xóa sản phẩm khỏi đơn hàng thành công" });
  } catch (err) {
    next(err);
  }
}

// Checkout
export async function checkout(req, res, next) {
  try {
    const id = +req.params.id;
    await Order.checkoutOrder(id);
    res.json({ ok: true, message: "Checkout thành công" });
  } catch (err) {
    next(err);
  }
}

// Payment
export async function pay(req, res, next) {
  try {
    const id = +req.params.id;
    const { method } = req.body;
    await Order.payOrder(id, method);
    res.json({ ok: true, message: "Thanh toán thành công" });
  } catch (err) {
    next(err);
  }
}

// Update order status
export async function updateStatus(req, res, next) {
  try {
    const id = +req.params.id;
    const { order_status } = req.body;
    await Order.updateStatus(id, order_status);
    res.json({ ok: true, message: "Cập nhật trạng thái thành công" });
  } catch (err) {
    next(err);
  }
}
