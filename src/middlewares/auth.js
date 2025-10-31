import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Middleware xác thực JWT
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ ok: false, error: "Missing or invalid token" });

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "dacna_secret";

    // Giải token
    const decoded = jwt.verify(token, secret);

    // Gán thông tin user vào req
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role, // <- chú ý, KHÔNG phải decoded.roles
    };

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
}

// Middleware kiểm tra role
export function roleMiddleware(roles = []) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ ok: false, error: "Unauthorized" });

    if (!roles.includes(req.user.role))
      return res.status(403).json({ ok: false, error: "Forbidden: insufficient privileges" });

    next();
  };
}
