// server/routes/owners.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listBookings } from "../models/Booking.js";

const router = Router();

// Example owner dashboard: see all bookings (later filter by owner)
router.get("/bookings", requireAuth, (_req, res) => {
  const bookings = listBookings();
  res.json({ ok: true, bookings });
});

export default router;
