// server/routes/drivers.js
import { Router } from "express";
import {
  createDriver,
  listDrivers,
  listPendingDrivers,
  getDriverById,
  setDriverStatus
} from "../models/Driver.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Driver submits form + docs (strings/URLs)
router.post("/register", (req, res) => {
  const {
    name,
    phone,
    city,
    truckTypes,
    fleetSize,
    drivingLicenseNo,
    aadharNumber,
    licenseDocUrl,
    aadharDocUrl
  } = req.body;

  if (!name || !phone || !city) {
    return res
      .status(400)
      .json({ error: "Name, phone and city are required." });
  }

  const driver = createDriver({
    name,
    phone,
    city,
    truckTypes,
    fleetSize,
    drivingLicenseNo,
    aadharNumber,
    licenseDocUrl,
    aadharDocUrl
  });

  // later: notify admin
  res.status(201).json({ ok: true, driver });
});

// Admin: all drivers
router.get("/", requireAdmin, (_req, res) => {
  const drivers = listDrivers();
  res.json({ ok: true, drivers });
});

// Admin: pending drivers
router.get("/pending", requireAdmin, (_req, res) => {
  const drivers = listPendingDrivers();
  res.json({ ok: true, drivers });
});

// Admin: single driver
router.get("/:id", requireAdmin, (req, res) => {
  const driver = getDriverById(req.params.id);
  if (!driver) return res.status(404).json({ error: "Driver not found." });
  res.json({ ok: true, driver });
});

// Admin: verify
router.post("/:id/verify", requireAdmin, (req, res) => {
  const { notes } = req.body;
  const driver = setDriverStatus(req.params.id, "verified", notes || "");
  if (!driver) return res.status(404).json({ error: "Driver not found." });
  res.json({ ok: true, driver });
});

// Admin: reject
router.post("/:id/reject", requireAdmin, (req, res) => {
  const { notes } = req.body;
  const driver = setDriverStatus(req.params.id, "rejected", notes || "");
  if (!driver) return res.status(404).json({ error: "Driver not found." });
  res.json({ ok: true, driver });
});

export default router;
