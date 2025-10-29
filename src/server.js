import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

// Import middlewares
import { errorHandler } from "./middlewares/errorHandler.js";

// Import routes
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Health check
app.get("/", (req, res) => res.json({ ok: true, app: "DACNA API (Node)", time: new Date() }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// Error handler (cuối cùng)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
