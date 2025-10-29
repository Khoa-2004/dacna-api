import { Router } from "express";
import { create, list } from "../controllers/productController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = Router();

// Get product lists
router.get("/", list);

// Create a new product (only admin, staff)
router.post("/", authMiddleware, roleMiddleware(["admin", "staff"]), create);


export default router;
