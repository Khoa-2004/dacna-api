import { Router } from "express";
import { register, login } from "../controllers/userController.js";
const r = Router();

// Register new users
r.post("/register", register);

// Login users
r.post("/login", login);

export default r;