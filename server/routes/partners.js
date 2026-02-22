const express = require("express");
const Driver = require("../models/Driver");
const { store, newId } = require("../memoryStore");

const router = express.Router();

// POST /api/partners
// Frontend "Partner with Shifty" form submits:
// { name, phone, city, truckTypes, fleetSize }
// We treat it as creating a Driver record (offline by default).
router.post("/", async (req, res) => {
  const { name, phone, city, truckTypes, fleetSize, truckCategory } = req.body || {};

  if (!name || !phone || !city) {
    return res.status(400).json({ success: false, error: "name, phone, and city are required" });
  }

  const normalized = {
    name,
    phone,
    city,
    truckType: truckTypes || req.body.truckType || "unknown",
    notes: fleetSize ? `fleetSize=${fleetSize}` : undefined,
    truckCategory: truckCategory || "mini",
    isAvailable: false,
    currentCity: city,
  };

  try {
    if (req.app.locals.useMemory) {
      const driver = {
        _id: newId(),
        ...normalized,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.drivers.unshift(driver);
      return res.status(201).json({ success: true, driver });
    }

    const driver = await Driver.create(normalized);
    return res.status(201).json({ success: true, driver });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;

