import express from "express";
import passport from "../utils/passport.js";
import {
  register,
  login,
} from "../controllers/authController.js";

const router = express.Router();

// Google OAuth2 login (bước 1: chuyển sang Google)
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

// Google OAuth2 callback (bước 2: Google gọi về)
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login/failed" }),
  (req, res) => {
    const user = req.user;
    if (!user)
      return res
        .status(401)
        .json({ ok: false, error: "Không tìm thấy thông tin user" });

    return res.status(200).json({
      ok: true,
      message: "Đăng nhập Google thành công",
      user,
    });
  }
);

// Đăng ký local
router.post("/register", register);

// Đăng nhập local (trả JWT)
router.post("/login", login);

// Đăng nhập thất bại
router.get("/login/failed", (req, res) => {
  res.status(401).json({ ok: false, message: "Đăng nhập thất bại" });
});

// Kiểm tra trạng thái đăng nhập
router.get("/status", (req, res) => {
  // Passport tự thêm hàm này nếu bạn dùng express-session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({
      ok: true,
      message: "Đang đăng nhập",
      user: req.user,
    });
  } else {
    return res.json({
      ok: false,
      message: "Chưa đăng nhập",
    });
  }
});


export default router;
