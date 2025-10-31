import { Router } from "express";
import {
  create,
  detail,
  addItem,
  removeItem,
  checkout,
  pay,
  updateStatus,
} from "../controllers/orderController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = Router();

router.post("/", create);

router.get("/:id", authMiddleware, detail);

router.post("/:id/items", authMiddleware, addItem);

router.delete("/:id/items/:productId", removeItem);

// Tính tổng giá tiền (có ship)
router.post("/:id/checkout", checkout);

router.post("/:id/pay", pay);

// Trạng thái (shipping, delivered, cancelled,...) chỉ admin/staff là thay đổi đc
router.patch("/:id/status", authMiddleware, roleMiddleware(["admin", "staff"]), updateStatus);

router.delete("/:orderId/items/:productId", authMiddleware, removeItem);
export default router;
