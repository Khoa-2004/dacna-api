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

const router = Router();

router.post("/", create);

// Product details
router.get("/:id", detail);

router.post("/:id/items", addItem);

router.delete("/:id/items/:productId", removeItem);

// Calculate the total (includes shipping)
router.post("/:id/checkout", checkout);

router.post("/:id/pay", pay);

// (shipping, delivered, cancelled,...)
router.post("/:id/status", updateStatus);

export default router;
