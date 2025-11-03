import { pool } from "../db.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

dotenv.config();

// Đăng ký tài khoản mới (tạo user + gửi otp)
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ ok: false, message: "Thiếu thông tin" });

    // Kiểm tra email trùng
    const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length)
      return res.status(400).json({ ok: false, message: "Email đã tồn tại" });

    // Mã hóa mật khẩu
    const bcrypt = (await import("bcrypt")).default;
    const hashed = await bcrypt.hash(password, 10);

    // Tạo user mới
    await pool.query(
      "INSERT INTO users (username, email, pw, auth_provider, roles, verified) VALUES (?, ?, ?, 'local', 'customer', 0)",
      [name, email, hashed]
    );

    // Tạo otp xác minh email
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      "INSERT INTO otp_codes (email, otp_code, purpose, expires_at, is_used, attempts, locked_until) VALUES (?, ?, 'register', ?, 0, 0, NULL)",
      [email, otp, expiresAt]
    );

    // Gửi mail otp
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"DACNA Support" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Mã xác thực đăng ký tài khoản",
      text: `Mã OTP của bạn là: ${otp} (hiệu lực trong 5 phút)`,
    });

    return res.json({
      ok: true,
      message: "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
    });
  } catch (err) {
    console.error("Lỗi register:", err);
    res.status(500).json({ ok: false, message: "Lỗi máy chủ khi đăng ký" });
  }
}


// Hàm sinh otp + gửi email
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(email, otp) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"DACNA Support" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Mã OTP xác thực tài khoản",
    text: `Mã OTP của bạn là: ${otp}\nHiệu lực trong 5 phút.`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Đã gửi OTP ${otp} tới ${email}`);
}

// Gửi otp (đăng ký / quên mật khẩu)
async function requestOtpGeneric(req, res, purpose) {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ ok: false, message: "Thiếu email" });

    // Ngăn spam gửi otp
    const [recent] = await pool.query(
      "SELECT * FROM otp_codes WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1",
      [email, purpose]
    );

    if (recent[0] && new Date() - new Date(recent[0].created_at) < 60 * 1000)
      return res.status(429).json({
        ok: false,
        message: "Vui lòng chờ 1 phút trước khi yêu cầu mã OTP mới.",
      });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      "INSERT INTO otp_codes (email, otp_code, purpose, expires_at, is_used, attempts, locked_until) VALUES (?, ?, ?, ?, 0, 0, NULL)",
      [email, otp, purpose, expiresAt]
    );

    await sendOTP(email, otp);
    res.json({ ok: true, message: "OTP đã được gửi qua email." });
  } catch (err) {
    console.error("Lỗi gửi OTP:", err);
    res.status(500).json({ ok: false, message: "Lỗi máy chủ khi gửi OTP" });
  }
}

export async function requestRegisterOTP(req, res) {
  await requestOtpGeneric(req, res, "register");
}

export async function requestResetOTP(req, res) {
  await requestOtpGeneric(req, res, "reset");
}

// Xác minh otp (đăng ký / reset mật khẩu)
async function verifyOtpGeneric(req, res, purpose) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp)
      return res.status(400).json({ ok: false, message: "Thiếu thông tin" });

    const [rows] = await pool.query(
      "SELECT * FROM otp_codes WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1",
      [email, purpose]
    );
    const record = rows[0];
    if (!record)
      return res.status(400).json({
        ok: false,
        message: "Không tìm thấy OTP, vui lòng yêu cầu lại.",
      });

    // Khóa tạm thời nếu nhập sai nhiều
    if (record.locked_until && new Date(record.locked_until) > new Date()) {
      const diff = Math.ceil(
        (new Date(record.locked_until) - new Date()) / 1000
      );
      return res.status(429).json({
        ok: false,
        message: `Bạn nhập sai quá nhiều. Thử lại sau ${diff} giây.`,
      });
    }

    // Hết hạn
    if (new Date(record.expires_at) < new Date())
      return res.status(400).json({ ok: false, message: "OTP đã hết hạn" });

    // Đã dùng
    if (record.is_used)
      return res.status(400).json({ ok: false, message: "OTP đã được sử dụng" });

    // Sai OTP
    if (record.otp_code !== otp) {
      const attempts = record.attempts + 1;
      let lockedUntil = null;
      if (attempts >= 3)
        lockedUntil = new Date(Date.now() + 2 * 60 * 1000);

      await pool.query(
        "UPDATE otp_codes SET attempts = ?, locked_until = ? WHERE id = ?",
        [attempts, lockedUntil, record.id]
      );

      return res.status(400).json({
        ok: false,
        message:
          attempts >= 3
            ? "Bạn đã nhập sai quá 3 lần, OTP bị khóa 2 phút."
            : `OTP sai (${attempts}/3 lần).`,
      });
    }

    // Otp đúng
    await pool.query(
      "UPDATE otp_codes SET is_used = 1, attempts = 0, locked_until = NULL WHERE id = ?",
      [record.id]
    );

    // Nếu là reset password
    if (purpose === "reset") {
      if (!newPassword)
        return res
          .status(400)
          .json({ ok: false, message: "Thiếu mật khẩu mới" });

      const bcrypt = (await import("bcrypt")).default;
      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query("UPDATE users SET pw = ? WHERE email = ?", [
        hashed,
        email,
      ]);

      return res.json({ ok: true, message: "Đặt lại mật khẩu thành công" });
    }

    // Nếu là verify đăng ký
    if (purpose === "register") {
      await pool.query("UPDATE users SET verified = 1 WHERE email = ?", [
        email,
      ]);
      return res.json({ ok: true, message: "Xác minh tài khoản thành công" });
    }
  } catch (err) {
    console.error("Lỗi verify OTP:", err);
    res
      .status(500)
      .json({ ok: false, message: "Lỗi máy chủ khi xác minh OTP" });
  }
}

export async function verifyRegisterOTP(req, res) {
  await verifyOtpGeneric(req, res, "register");
}

export async function verifyResetOTP(req, res) {
  await verifyOtpGeneric(req, res, "reset");
}

// Đăng nhập thường (email + password) → trả JWT
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ ok: false, message: "Thiếu thông tin đăng nhập" });

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    const user = rows[0];
    if (!user)
      return res.status(400).json({ ok: false, message: "Email không tồn tại" });

    const bcrypt = (await import("bcrypt")).default;
    const isMatch = await bcrypt.compare(password, user.pw);

    if (!isMatch)
      return res.status(400).json({ ok: false, message: "Sai mật khẩu" });

    if (!user.verified)
      return res.status(403).json({
        ok: false,
        message: "Tài khoản chưa xác minh email. Vui lòng kiểm tra hộp thư.",
      });

    // Tạo JWT để các route /api/* xài
    const payload = {
      id: user.id,
      email: user.email,
      role: user.roles,
    };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "dacna_secret",
      { expiresIn: "1d" }
    );

    res.json({
      ok: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.roles,
      },
    });
  } catch (err) {
    console.error("Lỗi login:", err);
    res
      .status(500)
      .json({ ok: false, message: "Lỗi máy chủ khi đăng nhập" });
  }
}
