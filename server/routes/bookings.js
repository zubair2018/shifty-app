// server/routes/bookings.js
import { Router } from "express";
import {
  createBooking,
  listBookings,
  getBookingById,
  setBookingStatus,
  assignDriverToBooking
} from "../models/Booking.js";
import { getDriverById } from "../models/Driver.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Customer creates booking
router.post("/", (req, res) => {
  const {
    customerName,
    customerPhone,
    pickupAddress,
    dropAddress,
    date,
    time,
    truckType,   // NEW
    loadDetails
  } = req.body;

  if (
    !customerName ||
    !customerPhone ||
    !pickupAddress ||
    !dropAddress ||
    !date ||
    !time
  ) {
    return res
      .status(400)
      .json({ error: "Missing required fields for booking." });
  }

  const booking = createBooking({
    customerName,
    customerPhone,
    pickupAddress,
    dropAddress,
    date,
    time,
    truckType,
    loadDetails
  });

  // later: notify drivers here
  res.status(201).json({ ok: true, booking });
});

// Admin: list all bookings (dashboard)
router.get("/", requireAdmin, (_req, res) => {
  const bookings = listBookings();
  res.json({ ok: true, bookings });
});

// Admin: get single booking
router.get("/:id", requireAdmin, (req, res) => {
  const booking = getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  res.json({ ok: true, booking });
});

// Driver accepts booking
router.post("/:id/accept", (req, res) => {
  const { id } = req.params;
  const { driverId } = req.body;

  if (!driverId) {
    return res.status(400).json({ error: "driverId is required." });
  }

  const driver = getDriverById(driverId);
  if (!driver) return res.status(404).json({ error: "Driver not found." });
  if (driver.status !== "verified") {
    return res.status(403).json({ error: "Driver is not verified." });
  }

  const booking = assignDriverToBooking(id, driverId);
  if (!booking) return res.status(404).json({ error: "Booking not found." });

  // later: notify customer
  res.json({ ok: true, booking });
});

// Admin: update booking status
router.patch("/:id/status", requireAdmin, (req, res) => {
  const { status } = req.body;
  const allowed = [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "cancelled"
  ];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const booking = setBookingStatus(req.params.id, status);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found." });
  }

  res.json({ ok: true, booking });
});

export default router;
