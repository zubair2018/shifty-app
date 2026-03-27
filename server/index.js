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

// ---- Truck type exact match helper ----
function truckTypeMatches(driverTrucks, bookingTruck) {
  if (!bookingTruck || !driverTrucks) return true;
  const booking = bookingTruck.trim().toLowerCase();
  const driverList = driverTrucks
    .split(",")
    .map((t) => t.trim().toLowerCase());
  return driverList.includes(booking);
}

// ---- City match helper ----
function cityMatches(driverCity, bookingCity) {
  if (!driverCity || !bookingCity) return false;
  return (
    driverCity.trim().toLowerCase() === bookingCity.trim().toLowerCase()
  );
}

// ---- WhatsApp notification ----
async function notifyDriversInCity(booking) {
  try {
    const bookingCity = booking.pickup.trim().toLowerCase();
    const bookingTruck = (booking.vehicleType || "").trim().toLowerCase();

    console.log(`🔍 Finding drivers — city: ${bookingCity}, truck: ${bookingTruck}`);

    const snap = await db.collection("drivers")
      .where("status", "==", "active")
      .get();

    console.log(`📋 Total active drivers: ${snap.docs.length}`);

    const matchingDrivers = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((d) => {
        const cityOk = cityMatches(d.city, bookingCity);
        const truckOk = truckTypeMatches(d.truckTypes, bookingTruck);
        return cityOk && truckOk && d.phone;
      });

    console.log(`✅ Matching drivers: ${matchingDrivers.length}`);
    matchingDrivers.forEach((d) =>
      console.log(`  → ${d.name} | ${d.phone} | ${d.city} | ${d.truckTypes}`)
    );

    if (matchingDrivers.length === 0) {
      console.log("⚠️ No matching drivers found — no WhatsApp sent");
      return;
    }

    const message =
      `🚛 *New load available!*\n\n` +
      `📦 *Pickup:* ${booking.pickup}\n` +
      `📍 *Drop:* ${booking.drop}\n` +
      `🕐 *Time:* ${booking.time}\n` +
      `🚗 *Vehicle:* ${booking.vehicleType || "N/A"}\n` +
      `👤 *Customer:* ${booking.name}\n\n` +
      `First to accept gets the load!\n` +
      `👉 Login: http://localhost:5173/driver/login`;

    const promises = matchingDrivers.map((driver) => {
      const digits = driver.phone.replace(/\D/g, "").slice(-10);
      const last10 = digits.slice(-10);
      const toNumber = `whatsapp:+91${digits}`;
      console.log(`📤 Sending to: ${toNumber}`);
      return twilioClient.messages
        .create({
          from: process.env.TWILIO_WHATSAPP_FROM,
          to: toNumber,
          body: message,
        })
        .then((msg) => console.log(`✅ Sent! SID: ${msg.sid}`))
        .catch((err) =>
          console.error(`❌ Failed for ${driver.name}:`, err.message)
        );
    });

    await Promise.all(promises);
  } catch (err) {
    console.error("WhatsApp notification error:", err);
  }
}

// ---- Routes ----

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ShifT API running" });
});

// Get city bookings — MUST be before /bookings/:id
app.get("/bookings/city/:city", async (req, res) => {
  try {
    const city = req.params.city.trim().toLowerCase();
    const driverId = req.query.driverId || null;
    const truckType = req.query.truckType || "";

    const pendingSnap = await db
      .collection("bookings")
      .where("status", "==", "pending")
      .get();

    let assignedSnap = { docs: [] };
    if (driverId) {
      assignedSnap = await db
        .collection("bookings")
        .where("driverId", "==", driverId)
        .get();
    }

    const pendingData = pendingSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((b) => {
        const cityOk = b.pickup &&
          b.pickup.trim().toLowerCase() === city;
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
    const snap = await db
      .collection("bookings")
      .orderBy("createdAt", "desc")
      .get();
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (err) {
    console.error("Get bookings failed", err);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

// Create booking — auto notifies matching drivers
app.post("/bookings", async (req, res) => {
  try {
    const { name, phone, pickup, drop, time, vehicleType } = req.body;
    const missing = requireFields(req.body, [
      "name", "phone", "pickup", "drop", "time",
    ]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }
    const booking = {
      name: String(name).trim(),
      phone: String(phone).trim(),
      pickup: String(pickup).trim(),
      drop: String(drop).trim(),
      time: String(time).trim(),
      vehicleType: String(vehicleType || "mini").trim(),
      status: "pending",
      driverId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await db.collection("bookings").add(booking);

    // Fire and forget
    notifyDriversInCity(booking);

    return res.status(201).json({ id: docRef.id, ...booking });
  } catch (err) {
    console.error("Create booking failed", err);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

// Create driver
app.post("/drivers", async (req, res) => {
  try {
    const {
      name, phone, city, truckTypes,
      fleetSize, drivingLicenseNo, aadharNumber,
    } = req.body;
    const missing = requireFields(req.body, ["name", "phone", "city"]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }
    const driver = {
      name: String(name).trim(),
      phone: String(phone).trim(),
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
      const snap = await db
        .collection("drivers")
        .where("authUid", "==", req.query.authUid)
        .get();
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return res.json(data);
    }
    const snap = await db
      .collection("drivers")
      .orderBy("createdAt", "desc")
      .get();
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (err) {
    console.error("Get drivers failed", err);
    res.status(500).json({ error: "Failed to load drivers" });
  }
});

// Admin approves driver
app.patch("/drivers/:id/approve", async (req, res) => {
  try {
    const driverRef = db.collection("drivers").doc(req.params.id);
    const snap = await driverRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Driver not found" });
    await driverRef.update({
      status: "active",
      updatedAt: new Date().toISOString(),
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Approve driver failed", err);
    return res.status(500).json({ error: "Failed to approve driver" });
  }
});

// Admin deactivates driver
app.patch("/drivers/:id/deactivate", async (req, res) => {
  try {
    const driverRef = db.collection("drivers").doc(req.params.id);
    const snap = await driverRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Driver not found" });
    await driverRef.update({
      status: "inactive",
      updatedAt: new Date().toISOString(),
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Deactivate driver failed", err);
    return res.status(500).json({ error: "Failed to deactivate driver" });
  }
});

// Link authUid to driver doc
app.patch("/drivers/:id/link-auth", async (req, res) => {
  try {
    const { authUid } = req.body;
    if (!authUid) return res.status(400).json({ error: "authUid is required" });
    const driverRef = db.collection("drivers").doc(req.params.id);
    const snap = await driverRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Driver not found" });
    await driverRef.update({ authUid, updatedAt: new Date().toISOString() });
    return res.json({ success: true });
  } catch (err) {
    console.error("Link auth failed", err);
    return res.status(500).json({ error: "Failed to link auth" });
  }
});

// Assign booking to driver (admin)
app.patch("/bookings/:id/assign-driver", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "driverId is required" });
    const bookingRef = db.collection("bookings").doc(req.params.id);
    const snap = await bookingRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Booking not found" });
    await bookingRef.update({
      driverId,
      status: "assigned",
      updatedAt: new Date().toISOString(),
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Assign driver failed", err);
    return res.status(500).json({ error: "Failed to assign driver" });
  }
});

// Update booking status (admin complete/cancel)
app.patch("/bookings/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "assigned", "accepted", "on_trip", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const bookingRef = db.collection("bookings").doc(req.params.id);
    const snap = await bookingRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Booking not found" });
    await bookingRef.update({ status, updatedAt: new Date().toISOString() });
    return res.json({ success: true });
  } catch (err) {
    console.error("Update booking status failed", err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

// Driver self-accepts from city pool (atomic)
app.patch("/bookings/:id/self-assign", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "driverId is required" });
    const bookingRef = db.collection("bookings").doc(req.params.id);
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(bookingRef);
      if (!doc.exists) throw new Error("Booking not found");
      const booking = doc.data();
      if (booking.status !== "pending") {
        return { success: false, reason: "Booking already taken by another driver" };
      }
      t.update(bookingRef, {
        driverId,
        status: "accepted",
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    });
    if (!result.success) {
      return res.status(409).json({ error: result.reason });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Self assign failed", err);
    return res.status(500).json({ error: "Failed to accept booking" });
  }
});

// Driver releases load back to pool
app.patch("/bookings/:id/release", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "driverId is required" });
    const bookingRef = db.collection("bookings").doc(req.params.id);
    const snap = await bookingRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Booking not found" });
    const booking = snap.data();
    if (booking.driverId !== driverId) {
      return res.status(403).json({ error: "This booking is not assigned to you" });
    }
    await bookingRef.update({
      driverId: null,
      status: "pending",
      updatedAt: new Date().toISOString(),
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Release booking failed", err);
    return res.status(500).json({ error: "Failed to release booking" });
  }
});

// Driver accepts/rejects admin-assigned load
app.patch("/bookings/:id/driver-response", async (req, res) => {
  try {
    const { action } = req.body;
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }
    const bookingRef = db.collection("bookings").doc(req.params.id);
    const snap = await bookingRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Booking not found" });
    const newStatus = action === "accept" ? "accepted" : "pending";
    await bookingRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
    return res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error("Driver response failed", err);
    return res.status(500).json({ error: "Failed to update booking" });
  }
});

// Get all bookings for a specific driver
app.get("/drivers/:id/bookings", async (req, res) => {
  try {
    const { id } = req.params;
    const snap = await db
      .collection("bookings")
      .where("driverId", "==", id)
      .get();
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(data);
  } catch (err) {
    console.error("Get driver bookings failed", err);
    res.status(500).json({ error: "Failed to load driver bookings" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API server listening on http://localhost:${PORT}`);
});