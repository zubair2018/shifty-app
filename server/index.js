// server/index.js
import express from "express";
import cors from "cors";
import { config } from "./config.js";

import bookingRoutes from "./routes/bookings.js";
import driverRoutes from "./routes/drivers.js";
import ownerRoutes from "./routes/owners.js";
import partnerRoutes from "./routes/partners.js";
import authRoutes from "./routes/auth.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/partners", partnerRoutes);

app.listen(config.port, () => {
  console.log(`Shifty API running on http://localhost:${config.port}`);
});
