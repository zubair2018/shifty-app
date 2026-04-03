// server/index.js
import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import twilio from "twilio";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase init — works locally and on Render
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
      /\.vercel\.app$/,
    ],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

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

function cityMatches(driverCity, bookingCity) {
  if (!driverCity || !bookingCity) return false;
  return driverCity.trim().toLowerCase() === bookingCity.trim().toLowerCase();
}

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

async function smsBookingConfirmation(booking) {
  await sendSMS(
    booking.phone,
    `ShifT: Booking Received!\n` +
    `Hi ${booking.name}, your booking is confirmed.\n` +
    `Pickup: ${booking.pickup}\n` +
    `Drop: ${booking.drop}\n` +
    `Vehicle: ${booking.vehicleType}\n` +
    `Time: ${booking.time}\n` +
    `We will notify you once a driver is assigned.`
  );
}

async function smsNotifyMatchingDrivers(booking) {
  try {
    const bookingCity = (booking.pickup || "").trim().toLowerCase();
    const bookingTruck = (booking.vehicleType || "").trim().toLowerCase();
    console.log(`🔍 Finding drivers — city:"${bookingCity}" truck:"${bookingTruck}"`);

    const snap = await db.collection("drivers").get();
    const matching = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((d) => {
        const isActive = (d.status || "").trim() === "active";
        const c = cityMatches(d.city, bookingCity);
        const t = truckTypeMatches(d.truckTypes, bookingTruck);
        console.log(`  → ${d.name} | status:${d.status}(${isActive}) | city:${d.city}(${c}) | truck:${d.truckTypes}(${t})`);
        return isActive && c && t && d.phone;
      });

    console.log(`✅ Matching drivers: ${matching.length}`);
    if (matching.length === 0) return;

    const message =
      `ShifT: New load in your area!\n` +
      `Pickup: ${booking.pickup}\n` +
      `Drop: ${booking.drop}\n` +
      `Vehicle: ${booking.vehicleType}\n` +
      `Time: ${booking.time}\n` +
      `Customer: ${booking.name}\n` +
      `Login to accept: https://shifty-app-jet.vercel.app/driver`;
    await Promise.all(matching.map((d) => sendSMS(d.phone, message)));
  } catch (err) {
    console.error("❌ smsNotifyMatchingDrivers error:", err);
  }
}

async function smsDriverAssignedToCustomer(booking, driver) {
  await sendSMS(
    booking.phone,
    `ShifT: Driver Assigned!\n` +
    `Hi ${booking.name}, a driver is on the way.\n` +
    `Driver: ${driver.name}\n` +
    `Phone: +91${driver.phone}\n` +
    `Vehicle: ${driver.truckTypes || booking.vehicleType}\n` +
    `Route: ${booking.pickup} → ${booking.drop}\n` +
    `Time: ${booking.time}`
  );
}

async function smsDriverAssigned(driver, booking) {
  await sendSMS(
    driver.phone,
    `ShifT: Load Assigned to You!\n` +
    `Hi ${driver.name}!\n` +
    `Pickup: ${booking.pickup}\n` +
    `Drop: ${booking.drop}\n` +
    `Vehicle: ${booking.vehicleType}\n` +
    `Customer: ${booking.name}\n` +
    `Customer Phone: +91${booking.phone}\n` +
    `Time: ${booking.time}\n` +
    `Login: https://shifty-app-jet.vercel.app/driver`
  );
}

// ---- Routes ----

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ShifT API running" });
});

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
    res.status(500).json({ error: "Failed to load city bookings" });
  }
});

app.get("/bookings", async (req, res) => {
  try {
    const snap = await db
      .collection("bookings")
      .orderBy("createdAt", "desc")
      .get();
    res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

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
    smsBookingConfirmation(booking);
    smsNotifyMatchingDrivers(booking);
    return res.status(201).json({ id: docRef.id, ...booking });
  } catch (err) {
    console.error("Create booking failed", err);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

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
    return res.status(500).json({ error: "Failed to create driver" });
  }
});

app.get("/drivers", async (req, res) => {
  try {
    if (req.query.authUid) {
      const snap = await db
        .collection("drivers")
        .where("authUid", "==", req.query.authUid)
        .get();
      return res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }
    const snap = await db
      .collection("drivers")
      .orderBy("createdAt", "desc")
      .get();
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
    await bookingRef.update({
      driverId,
      status: "assigned",
      updatedAt: new Date().toISOString(),
    });
    const booking = { ...bookingSnap.data(), id: req.params.id };
    const driver = { ...driverSnap.data(), id: driverId };
    smsDriverAssigned(driver, booking);
    smsDriverAssignedToCustomer(booking, driver);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign driver" });
  }
});

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

app.patch("/bookings/:id/self-assign", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "driverId required" });
    const ref = db.collection("bookings").doc(req.params.id);
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(ref);
      if (!doc.exists) throw new Error("Booking not found");
      if (doc.data().status !== "pending") return { success: false };
      t.update(ref, {
        driverId,
        status: "accepted",
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    });
    if (!result.success) return res.status(409).json({ error: "Booking already taken" });
    res.json({ success: true });
  } catch (err) {
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
    await ref.update({
      driverId: null,
      status: "pending",
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to release booking" });
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

    // SMS customer when trip starts
    if (status === "on_trip" && booking.phone) {
      sendSMS(
        booking.phone,
        `ShifT: Your trip has started!\n` +
        `Driver is on the way.\n` +
        `Route: ${booking.pickup} → ${booking.drop}`
      );
    }

    // SMS customer when trip completes
    if (status === "completed" && booking.phone) {
      sendSMS(
        booking.phone,
        `ShifT: Trip Completed! ✅\n` +
        `Your delivery from ${booking.pickup} to ${booking.drop} is complete.\n` +
        `Thank you for using ShifT!`
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

app.get("/drivers/:id/bookings", async (req, res) => {
  try {
    const snap = await db
      .collection("bookings")
      .where("driverId", "==", req.params.id)
      .get();
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