// server/routes/bookingRoutes.js
import express from "express";
import { createBooking, getAllBookings } from "../models/Booking.js";

const router = express.Router();

// GET /bookings - list all bookings
router.get("/", async (req, res) => {
  try {
    const bookings = await getAllBookings();
    res.json(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// POST /bookings - create a booking
router.post("/", async (req, res) => {
  try {
    const booking = await createBooking(req.body);
    res.status(201).json(booking);
  } catch (err) {
    console.error("Error creating booking:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
