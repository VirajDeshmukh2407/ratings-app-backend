// import express from "express";
// import { pool } from "../config/db.js";
// import { authMiddleware } from "../middleware/auth.js";

// export const storeRouter = express.Router();

// // Public / logged-in list of stores with optional search + user rating
// storeRouter.get("/", authMiddleware, async (req, res) => {
//   const { name, address } = req.query;
//   const conditions = [];
//   const values = [];
//   let idx = 1;

//   if (name) {
//     conditions.push(`s.name ILIKE $${idx++}`);
//     values.push(`%${name}%`);
//   }
//   if (address) {
//     conditions.push(`s.address ILIKE $${idx++}`);
//     values.push(`%${address}%`);
//   }

//   const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

//   const q = `
//     SELECT
//       s.id,
//       s.name,
//       s.address,
//       COALESCE(AVG(r.rating), 0)::numeric(3,2) AS overall_rating,
//       COUNT(r.id) AS ratings_count,
//       (
//         SELECT rating
//         FROM ratings ur
//         WHERE ur.user_id = $${idx}
//           AND ur.store_id = s.id
//       ) AS user_rating
//     FROM stores s
//     LEFT JOIN ratings r ON r.store_id = s.id
//     ${where}
//     GROUP BY s.id
//     ORDER BY s.name ASC
//   `;
//   values.push(req.user.id);

//   const result = await pool.query(q, values);
//   res.json(result.rows);
// });

// // Submit or modify rating
// storeRouter.post("/:storeId/rate", authMiddleware, async (req, res) => {
//   const storeId = Number(req.params.storeId);
//   const { rating } = req.body;

//   if (rating < 1 || rating > 5) {
//     return res.status(400).json({ message: "Rating must be 1-5" });
//   }

//   await pool.query(
//     `INSERT INTO ratings (user_id, store_id, rating)
//      VALUES ($1, $2, $3)
//      ON CONFLICT (user_id, store_id)
//      DO UPDATE SET rating = EXCLUDED.rating`,
//     [req.user.id, storeId, rating]
//   );

//   res.json({ message: "Rating saved" });
// });

import express from "express";
import { pool } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

export const storeRouter = express.Router();

// Fetch stores with search + user rating
storeRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const { name, address } = req.query;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (name) {
      conditions.push(`s.name ILIKE $${idx++}`);
      values.push(`%${name}%`);
    }
    if (address) {
      conditions.push(`s.address ILIKE $${idx++}`);
      values.push(`%${address}%`);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const q = `
      SELECT
        s.id,
        s.name,
        s.address,
        COALESCE(AVG(r.rating), 0)::numeric(3,2) AS overall_rating,
        COUNT(r.id) AS ratings_count,
        (
          SELECT rating
          FROM ratings ur
          WHERE ur.user_id = $${idx}
            AND ur.store_id = s.id
        ) AS user_rating
      FROM stores s
      LEFT JOIN ratings r ON r.store_id = s.id
      ${where}
      GROUP BY s.id
      ORDER BY s.name ASC
    `;
    values.push(req.user.id);

    const result = await pool.query(q, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Rate a store
storeRouter.post("/:storeId/rate", authMiddleware, async (req, res) => {
  try {
    const storeId = Number(req.params.storeId);
    const { rating } = req.body;

    if (!storeId || storeId <= 0)
      return res.status(400).json({ message: "Invalid store ID" });

    const exists = await pool.query(`SELECT id FROM stores WHERE id = $1`, [
      storeId,
    ]);
    if (exists.rowCount === 0)
      return res.status(404).json({ message: "Store not found" });

    if (rating < 1 || rating > 5)
      return res.status(400).json({ message: "Rating must be 1–5" });

    await pool.query(
      `INSERT INTO ratings (user_id, store_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, store_id)
       DO UPDATE SET rating = EXCLUDED.rating`,
      [req.user.id, storeId, rating]
    );

    res.json({ message: "Rating saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
