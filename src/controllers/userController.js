import * as User from "../models/userModel.js";
import jwt from "jsonwebtoken";

// Đăng kí
export async function register(req, res, next) {
  try {
    const { username, email, pw, phone } = req.body;
    if (!username || !email || !pw) throw new Error("Thiếu dữ liệu bắt buộc");
    
    // Check coi có đúng định dạng email ko
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Email không hợp lệ");


    // Coi có trùng email/sđt ko
    const exist = await User.findUserByUsernameOrEmail(email);
    if (exist) throw new Error("Tài khoản đã tồn tại");

    const id = await User.createUser({ username, email, pw, phone });
    res.status(201).json({
      ok: true,
      message: "Đăng ký thành công",
      user: { id, username, email, roles: "customer" },
    });
  } catch (err) {
    next(err);
  }
}

// Đăng nhập
export async function login(req, res, next) {
  try {
    const { usernameOrEmail, pw } = req.body;
    if (!usernameOrEmail || !pw) throw new Error("Thiếu dữ liệu đăng nhập");

    const user = await User.findUserByUsernameOrEmail(usernameOrEmail);
    if (!user || user.pw !== pw)
      return res
        .status(401)
        .json({ ok: false, error: "Sai thông tin đăng nhập" });

    // Tạo token jwt
    const token = jwt.sign(
      { id: user.id, role: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      ok: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (err) {
    next(err);
  }
}
