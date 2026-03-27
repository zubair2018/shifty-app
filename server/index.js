// server/index.js
import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import { createRequire } from "module";
import twilio from "twilio";
import * as dotenv from "dotenv";
dotenv.config();

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

const app = express();
const PORT = process.env.PORT || 4000;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

function requireFields(body, fields) {
  const missing = fields.filter(
    (f) => !body[f] || body[f].toString().trim() === ""
  );
  return missing;
}

function cleanPhone(phone) {
  return (phone || "").replace(/\D/g, "").slice(-10);
}

function truckTypeMatches(driverTrucks, bookingTruck) {
  if (!bookingTruck || !driverTrucks) return true;
  const booking = bookingTruck.trim().toLowerCase();
  const driverList = driverTrucks.split(",").map((t) => t.trim().toLowerCase());
  return driverList.includes(booking);
}

function cityMatches(driverCity, bookingCity) {
  if (!driverCity || !bookingCity) return false;
  return driverCity.trim().toLowerCase() === bookingCity.trim().toLowerCase();
}

async function sendWhatsApp(phone, message) {
  const digits = cleanPhone(phone);
  if (digits.length !== 10) {
    console.log(`⚠️ Invalid phone skipped: ${phone}`);
    return;
  }
  const toNumber = `whatsapp:+91${digits}`;
  try {
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
      body: message,
    });
    console.log(`✅ WhatsApp sent to ${toNumber} SID: ${msg.sid}`);
  } catch (err) {
    console.error(`❌ WhatsApp failed for ${toNumber}:`, err.message);
  }
}

async function notifyMatchingDrivers(booking) {
  try {
    const bookingCity = (booking.pickup || "").trim().toLowerCase();
    const bookingTruck = (booking.vehicleType || "").trim().toLowerCase();
    console.log(`🔍 Finding drivers — city:"${bookingCity}" truck:"${bookingTruck}"`);

    const snap = await db.collection("drivers").where("status", "==", "active").get();
    console.log(`📋 Active drivers total: ${snap.docs.length}`);

    const matching = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((d) => {
        const c = cityMatches(d.city, bookingCity);
        const t = truckTypeMatches(d.truckTypes, bookingTruck);
        console.log(`  → ${d.name} | city:${d.city}(${c}) | truck:${d.truckTypes}(${t})`);
        return c && t && d.phone;
      });

    console.log(`✅ Matching: ${matching.length}`);
    if (matching.length === 0) return;

    const message =
      `🚛 *New load available!*\n\n` +
      `📦 *Pickup:* ${booking.pickup}\n` +
      `📍 *Drop:* ${booking.drop}\n` +
      `🕐 *Time:* ${booking.time}\n` +
      `🚗 *Vehicle:* ${booking.vehicleType || "N/A"}\n` +
      `👤 *Customer:* ${booking.name}\n\n` +
      `First to accept gets the load!\n` +
      `👉 Login: http://localhost:5173/driver`;

    await Promise.all(matching.map((d) => sendWhatsApp(d.phone, message)));
  } catch (err) {
    console.error("❌ notifyMatchingDrivers error:", err);
  }
}

async function notifySpecificDriver(driverId, booking) {
  try {
    const snap = await db.collection("drivers").doc(driverId).get();
    if (!snap.exists) return;
    const driver = snap.data();
    if (!driver.phone) return;

    const message =
      `🚛 *Load assigned to you!*\n\n` +
      `📦 *Pickup:* ${booking.pickup}\n` +
      `📍 *Drop:* ${booking.drop}\n` +
      `🕐 *Time:* ${booking.time}\n` +
      `🚗 *Vehicle:* ${booking.vehicleType || "N/A"}\n` +
      `👤 *Customer:* ${booking.name}\n\n` +
      `👉 View load: http://localhost:5173/driver`;

    await sendWhatsApp(driver.phone, message);
  } catch (err) {
    console.error("❌ notifySpecificDriver error:", err);
  }
}

// ---- Routes ----

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ShifT API running" });
});

// City bookings — MUST be before /bookings/:id
app.get("/bookings/city/:city", async (req, res) => {
  try {
    const city = req.params.city.trim().toLowerCase();
    const driverId = req.query.driverId || null;
    const truckType = req.query.truckType || "";

    const pendingSnap = await db.collection("bookings").where("status", "==", "pending").get();

    let assignedSnap = { docs: [] };
    if (driverId) {
      assignedSnap = await db.collection("bookings").where("driverId", "==", driverId).get();
    }

    const pendingData = pendingSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((b) => {
        const cityOk = b.pickup && b.pickup.trim().toLowerCase() === city;
        const truckOk = truckTypeMatches(truckType, b.vehicleType);
        return cityOk && truckOk;
      });

    const assignedData = assignedSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((b) => b.status !== "pending");

    const all = [...pendingData, ...assignedData];
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(all);
  } catch (err) {
    console.error("Get city bookings failed", err);
    res.status(500).json({ error: "Failed to load city bookings" });
  }
});

// List all bookings
app.get("/bookings", async (req, res) => {
  try {
    const snap = await db.collection("bookings").orderBy("createdAt", "desc").get();
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (err) {
    console.error("Get bookings failed", err);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

// Create booking
app.post("/bookings", async (req, res) => {
  try {
    const { name, phone, pickup, drop, time, vehicleType, loadDetails } = req.body;
    const missing = requireFields(req.body, ["name", "phone", "pickup", "drop", "time"]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
    }
    const booking = {
      name: String(name).trim(),
      phone: cleanPhone(phone),
      pickup: String(pickup).trim(),
      drop: String(drop).trim(),
      time: String(time).trim(),
      vehicleType: String(vehicleType || "mini-truck").trim(),
      loadDetails: String(loadDetails || "").trim(),
      status: "pending",
      driverId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await db.collection("bookings").add(booking);
    notifyMatchingDrivers(booking);
    return res.status(201).json({ id: docRef.id, ...booking });
  } catch (err) {
    console.error("Create booking failed", err);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

// Create driver
app.post("/drivers", async (req, res) => {
  try {
    const { name, phone, city, truckTypes, fleetSize, drivingLicenseNo, aadharNumber } = req.body;
    const missing = requireFields(req.body, ["name", "phone", "city"]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
    }
    const driver = {
      name: String(name).trim(),
      phone: cleanPhone(phone),
      city: String(city).trim(),
      truckTypes: String(truckTypes || "").trim(),
      fleetSize: String(fleetSize || "").trim(),
      drivingLicenseNo: String(drivingLicenseNo || "").trim(),
      aadharNumber: String(aadharNumber || "").trim(),
      licenseDocUrl: "",
      aadharDocUrl: "",
      status: "pending",
      rating: 0,
      authUid: null,
      fcmToken: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await db.collection("drivers").add(driver);
    return res.status(201).json({ id: docRef.id, ...driver });
  } catch (err) {
    console.error("Create driver failed", err);
    return res.status(500).json({ error: "Failed to create driver" });
  }
});

// List drivers
app.get("/drivers", async (req, res) => {
  try {
    if (req.query.authUid) {
      const snap = await db.collection("drivers").where("authUid", "==", req.query.authUid).get();
      return res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }
    const snap = await db.collection("drivers").orderBy("createdAt", "desc").get();
    res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    console.error("Get drivers failed", err);
    res.status(500).json({ error: "Failed to load drivers" });
  }
});

// Approve driver
app.patch("/drivers/:id/approve", async (req, res) => {
  try {
    const ref = db.collection("drivers").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Driver not found" });
    await ref.update({ status: "active", updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve driver" });
  }
});

// Deactivate driver
app.patch("/drivers/:id/deactivate", async (req, res) => {
  try {
    const ref = db.collection("drivers").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Driver not found" });
    await ref.update({ status: "inactive", updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to deactivate driver" });
  }
});

// Link authUid
app.patch("/drivers/:id/link-auth", async (req, res) => {
  try {
    const { authUid } = req.body;
    if (!authUid) return res.status(400).json({ error: "authUid required" });
    const ref = db.collection("drivers").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Driver not found" });
    await ref.update({ authUid, updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to link auth" });
  }
});

// Assign driver (admin) — notifies driver via WhatsApp
app.patch("/bookings/:id/assign-driver", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "driverId required" });
    const ref = db.collection("bookings").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Booking not found" });
    await ref.update({ driverId, status: "assigned", updatedAt: new Date().toISOString() });
    notifySpecificDriver(driverId, { ...snap.data(), id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign driver" });
  }
});

// Update booking status (admin complete/cancel)
app.patch("/bookings/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "assigned", "accepted", "on_trip", "completed", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const ref = db.collection("bookings").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Booking not found" });
    await ref.update({ status, updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Self-assign (atomic — first come first served)
app.patch("/bookings/:id/self-assign", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "driverId required" });
    const ref = db.collection("bookings").doc(req.params.id);
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(ref);
      if (!doc.exists) throw new Error("Booking not found");
      if (doc.data().status !== "pending") return { success: false };
      t.update(ref, { driverId, status: "accepted", updatedAt: new Date().toISOString() });
      return { success: true };
    });
    if (!result.success) return res.status(409).json({ error: "Booking already taken" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to accept booking" });
  }
});

// Release load
app.patch("/bookings/:id/release", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "driverId required" });
    const ref = db.collection("bookings").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Booking not found" });
    if (snap.data().driverId !== driverId) return res.status(403).json({ error: "Not your booking" });
    await ref.update({ driverId: null, status: "pending", updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to release booking" });
  }
});

// Driver response (accept/reject admin-assigned)
app.patch("/bookings/:id/driver-response", async (req, res) => {
  try {
    const { action } = req.body;
    if (!["accept", "reject"].includes(action)) return res.status(400).json({ error: "Invalid action" });
    const ref = db.collection("bookings").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Booking not found" });
    const newStatus = action === "accept" ? "accepted" : "pending";
    await ref.update({ status: newStatus, updatedAt: new Date().toISOString() });
    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// Get driver's bookings
app.get("/drivers/:id/bookings", async (req, res) => {
  try {
    const snap = await db.collection("bookings").where("driverId", "==", req.params.id).get();
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load driver bookings" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ ShifT API running on http://localhost:${PORT}`);
});