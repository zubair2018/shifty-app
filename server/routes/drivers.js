// server/routes/drivers.js
const express = require("express");
const Driver = require("../models/Driver");
const { store, newId } = require("../memoryStore");

const router = express.Router();

// POST /api/drivers - create driver
router.post("/", async (req, res) => {
  try {
    const {
      name,
      phone,
      truckType,
      city,
      notes,
      aadharNumber,
      dlNumber,
      truckCategory,
    } = req.body;

    const payload = {
      name,
      phone,
      truckType,
      city,
      notes,
      aadharNumber,
      dlNumber,
      truckCategory: truckCategory || "mini",
      isAvailable: false,
      currentCity: city,
    };

    if (req.app.locals.useMemory) {
      if (!payload.name || !payload.phone || !payload.truckType || !payload.city) {
        return res.status(400).json({ success: false, error: "name, phone, truckType, city are required" });
      }
      const driver = {
        _id: newId(),
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.drivers.unshift(driver);
      return res.status(201).json(driver);
    }

    const driver = await Driver.create(payload);
    return res.status(201).json(driver);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/drivers - list drivers
router.get("/", async (req, res) => {
  try {
    if (req.app.locals.useMemory) {
      return res.json(store.drivers);
    }

    const drivers = await Driver.find().sort({ createdAt: -1 });
    return res.json(drivers);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/drivers/:id/availability - go online / offline
router.patch("/:id/availability", async (req, res) => {
  try {
    const { isAvailable, currentCity } = req.body;

    if (req.app.locals.useMemory) {
      const idx = store.drivers.findIndex((d) => d._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, error: "Driver not found" });
      store.drivers[idx] = {
        ...store.drivers[idx],
        isAvailable: !!isAvailable,
        ...(currentCity ? { currentCity } : {}),
        updatedAt: new Date().toISOString(),
      };
      return res.json(store.drivers[idx]);
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        isAvailable: !!isAvailable,
        ...(currentCity && { currentCity }),
      },
      { new: true }
    );
    if (!driver) return res.status(404).json({ success: false, error: "Driver not found" });
    return res.json(driver);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
