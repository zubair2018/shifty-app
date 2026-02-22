// server/routes/bookings.js
const express = require("express");
const Booking = require("../models/Booking");
const Driver = require("../models/Driver");
const { store, newId } = require("../memoryStore");

const router = express.Router();

function normalizeLoadType(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase().trim();
  if (["mini", "medium", "heavy"].includes(v)) return v;
  // common legacy sizes
  if (["small", "sm", "mini"].includes(v)) return "mini";
  if (["mid", "medium"].includes(v)) return "medium";
  if (["large", "xl", "heavy"].includes(v)) return "heavy";
  return null;
}

function presentBooking(booking) {
  const b = booking && booking.toObject ? booking.toObject() : booking;
  if (!b) return b;
  return {
    ...b,
    // legacy aliases (older tests / payloads)
    name: b.customerName ?? b.name,
    phone: b.customerPhone ?? b.phone,
    pickup: b.pickupAddress ?? b.pickup,
    dropoff: b.dropAddress ?? b.dropoff,
  };
}

// POST /api/bookings - create booking + basic matching
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const customerName = body.customerName || body.name;
    const customerPhone = body.customerPhone || body.phone;
    const pickupAddress = body.pickupAddress || body.pickup;
    const dropAddress = body.dropAddress || body.drop || body.dropoff;

    const loadType =
      normalizeLoadType(body.loadType) ||
      normalizeLoadType(body.truckCategory) ||
      normalizeLoadType(body.size) ||
      "mini";

    if (!customerName || !customerPhone || !pickupAddress || !dropAddress) {
      return res.status(400).json({ success: false, error: "Missing required booking fields" });
    }

    const weightTons = body.weightTons ?? body.weight;
    const pickupCity = body.pickupCity;
    const dropCity = body.dropCity;
    const pickupDate = body.pickupDate || body.date;
    const pickupTime = body.pickupTime || body.time;
    const details = body.details || body.goodsType;

    if (req.app.locals.useMemory) {
      const booking = {
        _id: newId(),
        customerName,
        customerPhone,
        pickupAddress,
        dropAddress,
        pickupCity,
        dropCity,
        pickupDate,
        pickupTime,
        details,
        loadType,
        weightTons,
        status: "SEARCHING_DRIVER",
        requestedDrivers: [],
        assignedDriver: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const drivers = store.drivers
        .filter((d) => d.isAvailable === true && d.truckCategory === loadType)
        .slice(0, 10);

      booking.requestedDrivers = drivers.map((d) => d._id);

      if (drivers[0]) {
        booking.assignedDriver = drivers[0]; // keep object shape like populate()
        booking.status = "ASSIGNED";
      } else {
        booking.status = "PENDING";
      }

      store.bookings.unshift(booking);
      return res.status(201).json({ success: true, booking: presentBooking(booking), driverCount: drivers.length });
    }

    let booking = await Booking.create({
      customerName,
      customerPhone,
      pickupAddress,
      dropAddress,
      pickupCity,
      dropCity,
      pickupDate,
      pickupTime,
      details,
      loadType,
      weightTons,
      status: "SEARCHING_DRIVER",
    });

    const drivers = await Driver.find({ isAvailable: true, truckCategory: loadType }).limit(10);
    booking.requestedDrivers = drivers.map((d) => d._id);

    if (drivers[0]) {
      booking.assignedDriver = drivers[0]._id;
      booking.status = "ASSIGNED";
    } else {
      booking.status = "PENDING";
    }

    booking = await booking.save();

    return res.status(201).json({
      success: true,
      booking: presentBooking(booking),
      driverCount: drivers.length,
      firstDriver: drivers[0] || null,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/bookings - list bookings (admin)
router.get("/", async (req, res) => {
  try {
    if (req.app.locals.useMemory) {
      return res.json(store.bookings.map(presentBooking));
    }

    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .populate("assignedDriver", "name phone truckType city");
    return res.json(bookings.map(presentBooking));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/bookings/:id/status
router.post("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ success: false, error: "status is required" });

  try {
    if (req.app.locals.useMemory) {
      const idx = store.bookings.findIndex((b) => b._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, error: "Booking not found" });
      store.bookings[idx] = { ...store.bookings[idx], status, updatedAt: new Date().toISOString() };
      return res.json({ success: true, booking: presentBooking(store.bookings[idx]) });
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
    return res.json({ success: true, booking: presentBooking(booking) });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/bookings/:id/accept
router.post("/:id/accept", async (req, res) => {
  const { driverId } = req.body || {};
  if (!driverId) return res.status(400).json({ success: false, error: "driverId is required" });

  try {
    if (req.app.locals.useMemory) {
      const bIdx = store.bookings.findIndex((b) => b._id === req.params.id);
      if (bIdx === -1) return res.status(404).json({ success: false, error: "Booking not found" });
      const driver = store.drivers.find((d) => d._id === driverId);
      if (!driver) return res.status(404).json({ success: false, error: "Driver not found" });

      store.bookings[bIdx] = {
        ...store.bookings[bIdx],
        assignedDriver: driver,
        status: "IN_PROGRESS",
        updatedAt: new Date().toISOString(),
      };
      return res.json({ success: true, booking: presentBooking(store.bookings[bIdx]) });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, error: "Driver not found" });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });

    booking.assignedDriver = driver._id;
    booking.status = "IN_PROGRESS";
    await booking.save();
    return res.json({ success: true, booking: presentBooking(booking) });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/bookings/:id/reject
router.post("/:id/reject", async (req, res) => {
  const { driverId } = req.body || {};
  if (!driverId) return res.status(400).json({ success: false, error: "driverId is required" });

  try {
    if (req.app.locals.useMemory) {
      const bIdx = store.bookings.findIndex((b) => b._id === req.params.id);
      if (bIdx === -1) return res.status(404).json({ success: false, error: "Booking not found" });

      const current = store.bookings[bIdx];
      const assignedId = current.assignedDriver && current.assignedDriver._id;

      const next = {
        ...current,
        requestedDrivers: (current.requestedDrivers || []).filter((id) => id !== driverId),
        updatedAt: new Date().toISOString(),
      };

      if (assignedId === driverId) {
        next.assignedDriver = null;
        next.status = "PENDING";
      }

      store.bookings[bIdx] = next;
      return res.json({ success: true, booking: presentBooking(store.bookings[bIdx]) });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });

    booking.requestedDrivers = (booking.requestedDrivers || []).filter((id) => String(id) !== String(driverId));
    if (booking.assignedDriver && String(booking.assignedDriver) === String(driverId)) {
      booking.assignedDriver = undefined;
      booking.status = "PENDING";
    }

    await booking.save();
    return res.json({ success: true, booking: presentBooking(booking) });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
