import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/authRoutes.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { storeRouter } from "./routes/storeRoutes.js";
import { ownerRouter } from "./routes/ownerRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/stores", storeRouter);
app.use("/api/owner", ownerRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
