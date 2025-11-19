import express from "express";
import { pool } from "../config/db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { isValidPassword } from "../utils/passwordPolicy.js";
import bcrypt from "bcryptjs";

export const adminRouter = express.Router();

adminRouter.use(authMiddleware, requireRole("admin"));

// Dashboard counts
adminRouter.get("/dashboard", async (req, res) => {
  const [u, s, r] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM users"),
    pool.query("SELECT COUNT(*) FROM stores"),
    pool.query("SELECT COUNT(*) FROM ratings"),
  ]);
  res.json({
    totalUsers: Number(u.rows[0].count),
    totalStores: Number(s.rows[0].count),
    totalRatings: Number(r.rows[0].count),
  });
});

// Create user (normal/admin/store_owner)
adminRouter.post("/users", async (req, res) => {
  const { name, email, address, password, role } = req.body;

  if (!["admin", "normal_user", "store_owner"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  if (!isValidPassword(password || "")) {
    return res.status(400).json({ message: "Password does not meet policy" });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, address, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, address, role`,
      [name, email, address, hash, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not create user" });
  }
});

// List users with filters + sorting
adminRouter.get("/users", async (req, res) => {
  const {
    name,
    email,
    address,
    role,
    sortBy = "name",
    order = "asc",
  } = req.query;

  const allowedSort = ["name", "email", "address", "role"];
  const allowedOrder = ["asc", "desc"];

  const sortCol = allowedSort.includes(sortBy) ? sortBy : "name";
  const sortDir = allowedOrder.includes(order.toLowerCase())
    ? order.toUpperCase()
    : "ASC";

  const conditions = [];
  const values = [];
  let idx = 1;

  if (name) {
    conditions.push(`name ILIKE $${idx++}`);
    values.push(`%${name}%`);
  }
  if (email) {
    conditions.push(`email ILIKE $${idx++}`);
    values.push(`%${email}%`);
  }
  if (address) {
    conditions.push(`address ILIKE $${idx++}`);
    values.push(`%${address}%`);
  }
  if (role) {
    conditions.push(`role = $${idx++}`);
    values.push(role);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const query = `
    SELECT id, name, email, address, role
    FROM users
    ${where}
    ORDER BY ${sortCol} ${sortDir}
  `;
  const result = await pool.query(query, values);
  res.json(result.rows);
});

// List stores with rating, sorting/filter
adminRouter.get("/stores", async (req, res) => {
  const { name, email, address, sortBy = "name", order = "asc" } = req.query;

  const allowedSort = ["name", "email", "address", "avg_rating"];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : "name";
  const sortDir = order && order.toLowerCase() === "desc" ? "DESC" : "ASC";

  const conditions = [];
  const values = [];
  let idx = 1;

  if (name) {
    conditions.push(`name ILIKE $${idx++}`);
    values.push(`%${name}%`);
  }
  if (email) {
    conditions.push(`email ILIKE $${idx++}`);
    values.push(`%${email}%`);
  }
  if (address) {
    conditions.push(`address ILIKE $${idx++}`);
    values.push(`%${address}%`);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const query = `
    SELECT id, name, email, address, avg_rating, ratings_count
    FROM store_with_rating
    ${where}
    ORDER BY ${sortCol} ${sortDir}
  `;
  const result = await pool.query(query, values);
  res.json(result.rows);
});

// Admin adds store
adminRouter.post("/stores", async (req, res) => {
  const { name, email, address, ownerId } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO stores (name, email, address, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, address, owner_id`,
      [name, email, address, ownerId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not create store" });
  }
});

// Admin detailed user info + rating if store_owner
adminRouter.get("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const userRes = await pool.query(
    "SELECT id, name, email, address, role FROM users WHERE id = $1",
    [id]
  );
  const user = userRes.rows[0];
  if (!user) return res.status(404).json({ message: "Not found" });

  let ownerRating = null;
  if (user.role === "store_owner") {
    const storeRes = await pool.query(
      `SELECT AVG(r.rating)::numeric(3,2) AS avg_rating
       FROM stores s
       LEFT JOIN ratings r ON r.store_id = s.id
       WHERE s.owner_id = $1`,
      [id]
    );
    ownerRating = storeRes.rows[0].avg_rating || 0;
  }

  res.json({ ...user, ownerRating });
});
