import { Router } from "express";
import { create, list, setActive } from "../controllers/productController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = Router();

router.get("/", list);

// Tạo product mới (chỉ admin, staff)
router.post("/", authMiddleware, roleMiddleware(["admin", "staff"]), create);

// Admin mới được phép thay đổi trạng thái sản phẩm
router.patch("/:id/active", authMiddleware, roleMiddleware(["admin"]), setActive);

export default router;
