import express from "express";
import { pool } from "../config/db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

export const ownerRouter = express.Router();

ownerRouter.use(authMiddleware, requireRole("store_owner"));

/* ========================
   GET OWNER DASHBOARD DATA
   ======================== */
ownerRouter.get("/dashboard", async (req, res) => {
  try {
    const ownerId = req.user.id;

    const storesRes = await pool.query(
      `SELECT id, name, email, address
       FROM stores
       WHERE owner_id = $1
       ORDER BY id ASC`,
      [ownerId]
    );

    const ratingRes = await pool.query(
      `SELECT
         r.store_id,
         u.name AS user_name,
         u.email AS user_email,
         r.rating
       FROM ratings r
       JOIN users u ON u.id = r.user_id
       WHERE r.store_id IN (SELECT id FROM stores WHERE owner_id = $1)
       ORDER BY r.store_id ASC`,
      [ownerId]
    );

    const avgRes = await pool.query(
      `SELECT 
         store_id,
         COALESCE(AVG(rating),0)::numeric(3,2) AS avg
       FROM ratings
       WHERE store_id IN (SELECT id FROM stores WHERE owner_id = $1)
       GROUP BY store_id`,
      [ownerId]
    );

    res.json({
      stores: storesRes.rows,
      ratings: ratingRes.rows,
      averages: avgRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ========================
   CREATE STORE
   ======================== */
ownerRouter.post("/store", async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { name, address } = req.body;

    if (!name || !address)
      return res.status(400).json({ error: "Name & address required" });

    const emailRes = await pool.query(`SELECT email FROM users WHERE id = $1`, [
      ownerId,
    ]);

    const ownerEmail = emailRes.rows[0].email;

    const result = await pool.query(
      `INSERT INTO stores (name, email, address, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, ownerEmail, address, ownerId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ========================
   UPDATE STORE
   ======================== */
ownerRouter.put("/store/:id", async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const { name, address } = req.body;

    const storeRes = await pool.query(
      `SELECT owner_id FROM stores WHERE id = $1`,
      [id]
    );

    if (storeRes.rowCount === 0)
      return res.status(404).json({ error: "Store not found" });

    if (storeRes.rows[0].owner_id !== ownerId)
      return res.status(403).json({ error: "Not your store" });

    const updated = await pool.query(
      `UPDATE stores
       SET name = $1,
           address = $2
       WHERE id = $3
       RETURNING *`,
      [name, address, id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ========================
   DELETE STORE
   ======================== */
ownerRouter.delete("/store/:id", async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;

    const storeRes = await pool.query(
      `SELECT owner_id FROM stores WHERE id = $1`,
      [id]
    );

    if (storeRes.rowCount === 0)
      return res.status(404).json({ error: "Store not found" });

    if (storeRes.rows[0].owner_id !== ownerId)
      return res.status(403).json({ error: "Not your store" });

    await pool.query(`DELETE FROM stores WHERE id = $1`, [id]);

    res.json({ message: "Store deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
