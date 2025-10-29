import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Middleware authenticates users using JWT
// Used for routes that require login

export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ ok: false, error: "Missing or invalid token" });

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "dacna_secret";

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // Assign to req for controller to use
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
}

//Middleware checks admin/staff permissions
export function roleMiddleware(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, error: "Unauthorized" });
    if (!roles.includes(req.user.roles))
      return res.status(403).json({ ok: false, error: "Forbidden: insufficient privileges" });
    next();
  };
}
