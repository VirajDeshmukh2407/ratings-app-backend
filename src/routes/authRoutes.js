import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import { validateSignup } from "../middleware/validate.js";
import { authMiddleware } from "../middleware/auth.js";
import { isValidPassword } from "../utils/passwordPolicy.js";

export const authRouter = express.Router();

// Normal user signup
authRouter.post("/signup", validateSignup, async (req, res) => {
  try {
    const { name, email, address, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, address, password_hash, role)
       VALUES ($1, $2, $3, $4, 'normal_user')
       RETURNING id, name, email, address, role`,
      [name, email, address, hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ message: "Email already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login (all roles)
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const q = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = q.rows[0];
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// Change password
authRouter.post("/change-password", authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!isValidPassword(newPassword || "")) {
    return res.status(400).json({ message: "Password does not meet policy" });
  }

  const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [
    req.user.id,
  ]);
  const user = userRes.rows[0];
  const ok = await bcrypt.compare(oldPassword, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Old password wrong" });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    hash,
    req.user.id,
  ]);
  res.json({ message: "Password updated" });
});
