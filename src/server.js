import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "./utils/passport.js"; // Passport có cấu hình GoogleStrategy
import { errorHandler } from "./middlewares/errorHandler.js";

// Import routes
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import authRoutes from "./routes/auth.js";   // /auth, /auth/google, /auth/login
import otpRoutes from "./routes/otp.js";     // /auth/otp/*

dotenv.config();

const app = express();

// CORS cho FE
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

// Parse JSON body
app.use(express.json());

// Session (bắt buộc cho passport OAuth)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dacna_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // true nếu HTTPS
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get("/", (req, res) =>
  res.json({ ok: true, app: "DACNA API (Node)", time: new Date() })
);

// Routes
app.use("/auth", authRoutes);
app.use("/auth/otp", otpRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// Error handler (cuối cùng)
app.use(errorHandler);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
