// server/routes/driverRoutes.js
import express from "express";
import {
  createDriver,
  listDrivers,
  listPendingDrivers,
  getDriverById,
  setDriverStatus,
} from "../models/Driver.js";

const router = express.Router();

// POST /drivers - partner submits details
router.post("/", async (req, res) => {
  try {
    const { name, phone, city } = req.body;

    if (!name || !phone || !city) {
      return res
        .status(400)
        .json({ error: "name, phone and city are required" });
    }

    const driver = await createDriver(req.body);
    res.status(201).json(driver);
  } catch (err) {
    console.error("Error creating driver:", err);
    res.status(500).json({ error: "Failed to create driver" });
  }
});

// GET /drivers - list all drivers (admin)
router.get("/", async (req, res) => {
  try {
    const drivers = await listDrivers();
    res.json(drivers);
  } catch (err) {
    console.error("Error listing drivers:", err);
    res.status(500).json({ error: "Failed to list drivers" });
  }
});

// GET /drivers/pending - list pending drivers
router.get("/pending", async (req, res) => {
  try {
    const drivers = await listPendingDrivers();
    res.json(drivers);
  } catch (err) {
    console.error("Error listing pending drivers:", err);
    res.status(500).json({ error: "Failed to list pending drivers" });
  }
});

// GET /drivers/:id - get one driver
router.get("/:id", async (req, res) => {
  try {
    const driver = await getDriverById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }
    res.json(driver);
  } catch (err) {
    console.error("Error getting driver:", err);
    res.status(500).json({ error: "Failed to get driver" });
  }
});

// PATCH /drivers/:id/status - update status (admin)
router.patch("/:id/status", async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const driver = await setDriverStatus(req.params.id, status, notes);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    res.json(driver);
  } catch (err) {
    console.error("Error updating driver status:", err);
    res.status(500).json({ error: "Failed to update driver status" });
  }
});

export default router;
