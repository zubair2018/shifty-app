// server/index.js
import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import twilio from "twilio";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  areasInSameZone,
  getZoneName,
  getZoneForArea,
  getZoneForCoordinates,
  ZONES,
} from "./zones.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase init
if (!admin.apps.length) {
  let serviceAccount;
  if (process.env.SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
    console.log("✅ Using SERVICE_ACCOUNT_KEY from environment");
  } else {
    const filePath = join(__dirname, "serviceAccountKey.json");
    serviceAccount = JSON.parse(readFileSync(filePath, "utf8"));
    console.log("✅ Using serviceAccountKey.json from file");
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://shifty-app-jet.vercel.app",
      "https://shifty.in",
      "https://www.shifty.in",
      /\.vercel\.app$/,
    ],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// ---- Helper functions ----

function requireFields(body, fields) {
  return fields.filter((f) => !body[f] || body[f].toString().trim() === "");
}

function cleanPhone(phone) {
  return (phone || "").replace(/\D/g, "").slice(-10);
}

function truckTypeMatches(driverTrucks, bookingTruck) {
  if (!bookingTruck || !driverTrucks) return true;
  const booking = bookingTruck.trim().toLowerCase();
  const list = driverTrucks.split(",").map((t) => t.trim().toLowerCase());
  return list.includes(booking);
}

// ---- Google Geocoding — get coordinates for a place name ----
async function geocodePlace(placeName) {
  try {
    const encoded = encodeURIComponent(placeName + ", Kashmir, India");
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${process.env.GOOGLE_MAPS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      console.log(`📍 Geocoded "${placeName}" → lat:${lat}, lng:${lng}`);
      return { lat, lng };
    } else {
      console.log(`⚠️ Geocoding failed for "${placeName}": ${data.status}`);
      return null;
    }
  } catch (err) {
    console.error(`❌ Geocoding error for "${placeName}":`, err.message);
    return null;
  }
}

// ---- Smart zone detection — coordinates first, text fallback, geocode last ----
async function detectZone(placeName, coords) {
  // 1. Use coordinates from frontend if available
  if (coords && coords.lat && coords.lng) {
    const zone = getZoneForCoordinates(coords.lat, coords.lng);
    if (zone) {
      console.log(`✅ Zone from coordinates: "${placeName}" → ${zone.name}`);
      return { zone, coords };
    }
  }
  // 2. Try text matching (fast, no API call)
  const zoneByText = getZoneForArea(placeName);
  if (zoneByText) {
    console.log(`✅ Zone from text: "${placeName}" → ${zoneByText.name}`);
    return { zone: zoneByText, coords: null };
  }
  // 3. Fall back to Google Geocoding API
  console.log(`🔍 Geocoding "${placeName}"...`);
  const geocoded = await geocodePlace(placeName);
  if (geocoded) {
    const zone = getZoneForCoordinates(geocoded.lat, geocoded.lng);
    if (zone) {
      console.log(`✅ Zone from geocoding: "${placeName}" → ${zone.name}`);
      return { zone, coords: geocoded };
    }
  }
  console.log(`⚠️ Could not detect zone for "${placeName}"`);
  return { zone: null, coords: null };
}

// ---- SMS sender ----
async function sendSMS(phone, message) {
  const digits = cleanPhone(phone);
  if (digits.length !== 10) {
    console.log(`⚠️ Invalid phone skipped: ${phone}`);
    return;
  }
  const to = `+91${digits}`;
  try {
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_SMS_FROM,
      to,
      body: message,
    });
    console.log(`✅ SMS sent to ${to} | SID: ${msg.sid}`);
  } catch (err) {
    console.error(`❌ SMS failed for ${to}: ${err.message}`);
  }
}

// ---- SMS: Booking confirmation to customer ----
async function smsBookingConfirmation(booking) {
  await sendSMS(
    booking.phone,
    `Shifty: Booking Confirmed! ✅\n` +
    `Hi ${booking.name}, your booking has been received.\n` +
    `Pickup: ${booking.pickup}\n` +
    `Drop: ${booking.drop}\n` +
    `Vehicle: ${booking.vehicleType}\n` +
    `Time: ${booking.time}\n` +
    `Please wait while we find a matching driver for you. We will notify you shortly!`
  );
}

// ---- SMS: Notify matching drivers ----
async function smsNotifyMatchingDrivers(booking) {
  try {
    const bookingTruck = (booking.vehicleType || "").trim().toLowerCase();

    let bookingZone;
    if (booking.pickupLat && booking.pickupLng) {
      bookingZone = getZoneForCoordinates(booking.pickupLat, booking.pickupLng);
    } else {
      bookingZone = getZoneForArea(booking.pickup);
    }

    if (!bookingZone) {
      console.log(`⚠️ No zone for pickup "${booking.pickup}" — no drivers notified`);
      return;
    }

    console.log(`🔍 Notifying drivers in zone: ${bookingZone.name}`);
    const snap = await db.collection("drivers").get();
    console.log(`📋 Total drivers in DB: ${snap.docs.length}`);

    const matching = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((d) => {
        const isActive = (d.status || "").trim() === "active";
        let zoneMatch;
        if (d.cityLat && d.cityLng) {
          const driverZone = getZoneForCoordinates(d.cityLat, d.cityLng);
          zoneMatch = driverZone && driverZone.id === bookingZone.id;
        } else {
          zoneMatch = areasInSameZone(d.city, booking.pickup);
        }
        const truckOk = truckTypeMatches(d.truckTypes, bookingTruck);
        console.log(`  → ${d.name} | active:${isActive} | zoneMatch:${zoneMatch} | truck:${truckOk}`);
        return isActive && zoneMatch && truckOk && d.phone;
      });

    console.log(`✅ Matching drivers: ${matching.length}`);
    if (matching.length === 0) return;

    const message =
      `Shifty: New Load Available in ${bookingZone.name}! 🚛\n` +
      `A load has been matched in your area.\n` +
      `Pickup: ${booking.pickup}\n` +
      `Drop: ${booking.drop}\n` +
      `Vehicle: ${booking.vehicleType}\n` +
      `Time: ${booking.time}\n` +
      `Login now to accept: https://shifty.in/driver`;

    await Promise.all(matching.map((d) => sendSMS(d.phone, message)));
  } catch (err) {
    console.error("❌ smsNotifyMatchingDrivers error:", err);
  }
}

// ---- SMS: Customer notified when driver assigned ----
async function smsDriverAssignedToCustomer(booking, driver) {
  await sendSMS(
    booking.phone,
    `Shifty: Driver Assigned! 🚛\n` +
    `Hi ${booking.name}, great news!\n` +
    `${driver.name} has been assigned as your driver.\n` +
    `Driver Phone: +91${cleanPhone(driver.phone)}\n` +
    `Vehicle: ${driver.truckTypes || booking.vehicleType}\n` +
    `Route: ${booking.pickup} → ${booking.drop}\n` +
    `Time: ${booking.time}\n` +
    `You can contact your driver directly on the number above.`
  );
}

// ---- SMS: Driver notified when assigned ----
async function smsDriverAssigned(driver, booking) {
  await sendSMS(
    driver.phone,
    `Shifty: Load Assigned to You! 🚛\n` +
    `Hi ${driver.name}, you have a new load.\n` +
    `Pickup: ${booking.pickup}\n` +
    `Drop: ${booking.drop}\n` +
    `Vehicle: ${booking.vehicleType}\n` +
    `Customer: ${booking.name}\n` +
    `Customer Phone: +91${cleanPhone(booking.phone)}\n` +
    `Time: ${booking.time}\n` +
    `Login to manage: https://shifty.in/driver`
  );
}

// ---- Routes ----

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Shifty API running" });
});

app.get("/zones", (req, res) => {
  res.json(ZONES.map((z) => ({ id: z.id, name: z.name, areas: z.areas })));
});

// City bookings — MUST be before /bookings/:id
app.get("/bookings/city/:city", async (req, res) => {
  try {
    const city = req.params.city.trim();
    const driverId = req.query.driverId || null;
    const truckType = req.query.truckType || "";
    const driverLat = parseFloat(req.query.lat) || null;
    const driverLng = parseFloat(req.query.lng) || null;

    const pendingSnap = await db.collection("bookings").where("status", "==", "pending").get();
    let assignedSnap = { docs: [] };
    if (driverId) {
      assignedSnap = await db.collection("bookings").where("driverId", "==", driverId).get();
    }

    let driverZone;
    if (driverLat && driverLng) {
      driverZone = getZoneForCoordinates(driverLat, driverLng);
    } else {
      driverZone = getZoneForArea(city);
    }

    const pendingData = pendingSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((b) => {
        let zoneMatch;
        if (driverZone && b.pickupLat && b.pickupLng) {
          const bZone = getZoneForCoordinates(b.pickupLat, b.pickupLng);
          zoneMatch = bZone && bZone.id === driverZone.id;
        } else {
          zoneMatch = areasInSameZone(city, b.pickup);
        }
        return zoneMatch && truckTypeMatches(truckType, b.vehicleType);
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

app.get("/bookings", async (req, res) => {
  try {
    const snap = await db.collection("bookings").orderBy("createdAt", "desc").get();
    res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

// Create booking
app.post("/bookings", async (req, res) => {
  try {
    const { name, phone, pickup, drop, time, vehicleType, loadDetails, pickupLat, pickupLng, dropLat, dropLng } = req.body;
    const missing = requireFields(req.body, ["name", "phone", "pickup", "drop", "time"]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
    }

    const { zone, coords } = await detectZone(pickup, { lat: pickupLat, lng: pickupLng });

    const booking = {
      name: String(name).trim(),
      phone: cleanPhone(phone),
      pickup: String(pickup).trim(),
      drop: String(drop).trim(),
      time: String(time).trim(),
      vehicleType: String(vehicleType || "mini-truck").trim(),
      loadDetails: String(loadDetails || "").trim(),
      pickupLat: coords?.lat || pickupLat || null,
      pickupLng: coords?.lng || pickupLng || null,
      dropLat: dropLat || null,
      dropLng: dropLng || null,
      zone: zone ? zone.id : null,
      zoneName: zone ? zone.name : null,
      status: "pending",
      driverId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("bookings").add(booking);
    smsBookingConfirmation(booking);
    smsNotifyMatchingDrivers(booking);
    return res.status(201).json({ id: docRef.id, ...booking });
  } catch (err) {
    console.error("Create booking failed", err);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

// Create driver
app.post("/drivers", async (req, res) => {
  try {
    const { name, phone, city, truckTypes, fleetSize, drivingLicenseNo, aadharNumber, cityLat, cityLng } = req.body;
    const missing = requireFields(req.body, ["name", "phone", "city"]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
    }

    let zone;
    if (cityLat && cityLng) zone = getZoneForCoordinates(cityLat, cityLng);
    if (!zone) zone = getZoneForArea(city);

    const driver = {
      name: String(name).trim(),
      phone: cleanPhone(phone),
      city: String(city).trim(),
      cityLat: cityLat || null,
      cityLng: cityLng || null,
      zone: zone ? zone.id : null,
      zoneName: zone ? zone.name : null,
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

// Get driver by phone — MUST be before /drivers/:id
app.get("/drivers/by-phone/:phone", async (req, res) => {
  try {
    const phone = cleanPhone(req.params.phone);
    const snap = await db.collection("drivers").where("phone", "==", phone).get();
    if (snap.empty) return res.status(404).json({ error: "Driver not found" });
    const doc = snap.docs[0];
    return res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to find driver" });
  }
});

app.get("/drivers", async (req, res) => {
  try {
    if (req.query.authUid) {
      const snap = await db.collection("drivers").where("authUid", "==", req.query.authUid).get();
      return res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }
    const snap = await db.collection("drivers").orderBy("createdAt", "desc").get();
    res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to load drivers" });
  }
});

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

app.patch("/bookings/:id/assign-driver", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "driverId required" });
    const bookingRef = db.collection("bookings").doc(req.params.id);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) return res.status(404).json({ error: "Booking not found" });
    const driverRef = db.collection("drivers").doc(driverId);
    const driverSnap = await driverRef.get();
    if (!driverSnap.exists) return res.status(404).json({ error: "Driver not found" });
    await bookingRef.update({ driverId, status: "assigned", updatedAt: new Date().toISOString() });
    const booking = { ...bookingSnap.data(), id: req.params.id };
    const driver = { ...driverSnap.data(), id: driverId };
    smsDriverAssigned(driver, booking);
    smsDriverAssignedToCustomer(booking, driver);
    res.json({ success: true });
  } catch (err) {
    console.error("Assign driver failed", err);
    res.status(500).json({ error: "Failed to assign driver" });
  }
});

app.patch("/bookings/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "assigned", "accepted", "on_trip", "completed", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const ref = db.collection("bookings").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Booking not found" });
    await ref.update({ status, updatedAt: new Date().toISOString() });
    const booking = snap.data();
    if (status === "on_trip" && booking.phone) {
      sendSMS(booking.phone,
        `Shifty: Your Trip Has Started! 🚛\n` +
        `Hi ${booking.name}, your driver is on the way.\n` +
        `Route: ${booking.pickup} → ${booking.drop}`
      );
    }
    if (status === "completed" && booking.phone) {
      sendSMS(booking.phone,
        `Shifty: Delivery Completed! ✅\n` +
        `Hi ${booking.name}, your delivery is done.\n` +
        `Route: ${booking.pickup} → ${booking.drop}\n` +
        `Thank you for using Shifty! We hope to serve you again.`
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

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
      return { success: true, booking: doc.data() };
    });
    if (!result.success) return res.status(409).json({ error: "Booking already taken" });
    const driverSnap = await db.collection("drivers").doc(driverId).get();
    if (driverSnap.exists) {
      const driver = { id: driverId, ...driverSnap.data() };
      const booking = { id: req.params.id, ...result.booking };
      smsDriverAssignedToCustomer(booking, driver);
      smsDriverAssigned(driver, booking);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Self-assign failed:", err);
    res.status(500).json({ error: "Failed to accept booking" });
  }
});

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

app.patch("/bookings/:id/driver-response", async (req, res) => {
  try {
    const { action, driverId } = req.body;
    if (!["accept", "reject"].includes(action)) return res.status(400).json({ error: "Invalid action" });
    if (!driverId) return res.status(400).json({ error: "driverId required" });
    const ref = db.collection("bookings").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Booking not found" });
    if (snap.data().driverId !== driverId) return res.status(403).json({ error: "This booking is not assigned to you" });
    const newStatus = action === "accept" ? "accepted" : "pending";
    await ref.update({ status: newStatus, updatedAt: new Date().toISOString() });
    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: "Failed to update booking" });
  }
});

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
  console.log(`✅ Shifty API running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV === "production") {
    setInterval(async () => {
      try {
        await fetch(process.env.API_URL || "https://shifty-backend-tvhs.onrender.com/");
        console.log("🏓 Keep-alive ping sent");
      } catch (e) {}
    }, 14 * 60 * 1000);
  }
});