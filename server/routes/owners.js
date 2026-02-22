const express = require("express");
const Driver = require("../models/Driver");
const { store, newId } = require("../memoryStore");

const router = express.Router();

// Legacy-compatible alias for "truck owners" submissions.
// Tests expect /api/owners to exist.

router.post("/", async (req, res) => {
  const { name, phone, truckType, city, notes, truckCategory } = req.body || {};
  if (!name || !phone || !truckType || !city) {
    return res.status(400).json({ success: false, error: "name, phone, truckType, city are required" });
  }

  const payload = {
    name,
    phone,
    truckType,
    city,
    notes,
    truckCategory: truckCategory || "mini",
    isAvailable: false,
    currentCity: city,
  };

  try {
    if (req.app.locals.useMemory) {
      const owner = {
        _id: newId(),
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.drivers.unshift(owner);
      return res.status(201).json({ success: true, owner });
    }

    const owner = await Driver.create(payload);
    return res.status(201).json({ success: true, owner });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    if (req.app.locals.useMemory) {
      return res.json(store.drivers);
    }
    const owners = await Driver.find().sort({ createdAt: -1 });
    return res.json(owners);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

