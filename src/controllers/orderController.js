import * as Order from "../models/orderModel.js";

// Tạo order
export async function create(req, res, next) {
  try {
    const { user_id, address_street, address_district, address_ward, address_city } = req.body;

    if (!user_id || !address_street || !address_city)
      throw new Error("Thiếu thông tin địa chỉ giao hàng");

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
      data,
    });
  } catch (err) {
    next(err);
  }
}

//  Lấy dữ liệu order
export async function detail(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "Unauthorized" });
    const id = +req.params.id;
    const order = await Order.getOrderDetail(id);

    if (!order)
      return res.status(404).json({ ok: false, error: "Không tìm thấy đơn hàng" });

    if (req.user.role === "customer" && order.user_id !== req.user.id)
      return res.status(403).json({ ok: false, error: "Không có quyền xem đơn hàng này" });

    res.json({ ok: true, data: order });
  } catch (err) {
    next(err);
  }
}

// Thêm hoặc cập nhật đơn hàng
export async function addItem(req, res, next) {
  try {
    const id = +req.params.id;
    const { product_id, qty } = req.body;

    if (!product_id || !qty || qty <= 0)
      throw new Error("Số lượng không hợp lệ");

    const order = await Order.getOrderById(id);
    if (!order)
      return res.status(404).json({ ok: false, error: "Không tìm thấy đơn hàng" });

    // KH chỉ được thêm vào đơn của chính mình
    if (req.user.role === "customer" && order.user_id !== req.user.id)
      return res.status(403).json({ ok: false, error: "Không có quyền thêm sản phẩm vào đơn hàng này" });

    if (order.order_status !== "cart")
      return res.status(400).json({ ok: false, error: "Không thể thêm sản phẩm sau khi đã checkout" });

    await Order.upsertItem(id, product_id, qty);
    await Order.recalculateTotals(id);

    res.json({ ok: true, message: "Thêm hoặc cập nhật sản phẩm thành công" });
  } catch (err) {
    next(err);
  }
}


// Xóa item trong order
export async function removeItem(req, res, next) {
  try {
    const { id, productId } = req.params;

    const order = await Order.getOrderById(+id);
    if (!order)
      return res.status(404).json({ ok: false, error: "Không tìm thấy đơn hàng" });

    if (order.order_status !== "cart")
      return res.status(400).json({ ok: false, error: "Không thể xoá item trong đơn hàng đã checkout" });

    await Order.removeItem(+id, +productId);
    await Order.recalculateTotals(+id); // cập nhật lại tổng tiền

    res.json({ ok: true, message: "Xóa sản phẩm khỏi đơn hàng thành công" });
  } catch (err) {
    next(err);
  }
}

// Thanh toán
export async function checkout(req, res, next) {
  try {
    const id = +req.params.id;
    const items = await Order.getOrderItems(id);

    if (!items.length)
      return res.status(400).json({ ok: false, error: "Không thể checkout đơn hàng trống" });

    await Order.checkoutOrder(id);
    await Order.recalculateTotals(id);

    res.json({ ok: true, message: "Checkout thành công" });
  } catch (err) {
    next(err);
  }
}

// Phương thức TT
export async function pay(req, res, next) {
  try {
    const id = +req.params.id;
    const { method } = req.body;

    if (!method)
      return res.status(400).json({ ok: false, error: "Thiếu phương thức thanh toán" });

    await Order.payOrder(id, method);
    res.json({ ok: true, message: "Thanh toán thành công" });
  } catch (err) {
    next(err);
  }
}

// Update trạng thái (admin/staff)
export async function updateStatus(req, res, next) {
  try {
    const id = +req.params.id;
    const { order_status } = req.body;

    if (!order_status)
      return res.status(400).json({ ok: false, error: "Thiếu trạng thái mới" });

    await Order.updateStatus(id, order_status);
    res.json({ ok: true, message: "Cập nhật trạng thái thành công" });
  } catch (err) {
    next(err);
  }
}
