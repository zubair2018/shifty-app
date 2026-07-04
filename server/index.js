// server/index.js
import express from "express";
import cors from "cors";
import twilio from "twilio";
import * as dotenv from "dotenv";
import { supabase } from "./supabase.js";
import {
  areasInSameZone,
  getZoneForArea,
  getZoneForCoordinates,
  ZONES,
} from "./zones.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

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

// ---- Google Geocoding ----
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
    }
    console.log(`⚠️ Geocoding failed for "${placeName}": ${data.status}`);
    return null;
  } catch (err) {
    console.error(`❌ Geocoding error for "${placeName}":`, err.message);
    return null;
  }
}

async function detectZone(placeName, coords) {
  if (coords && coords.lat && coords.lng) {
    const zone = getZoneForCoordinates(coords.lat, coords.lng);
    if (zone) return { zone, coords };
  }
  const zoneByText = getZoneForArea(placeName);
  if (zoneByText) return { zone: zoneByText, coords: null };
  const geocoded = await geocodePlace(placeName);
  if (geocoded) {
    const zone = getZoneForCoordinates(geocoded.lat, geocoded.lng);
    if (zone) return { zone, coords: geocoded };
  }
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

async function smsBookingConfirmation(booking) {
  await sendSMS(
    booking.phone,
    `Shifty: Booking Confirmed! ✅\n` +
    `Hi ${booking.name}, your booking has been received.\n` +
    `Pickup: ${booking.pickup}\n` +
    `Drop: ${booking.drop_location}\n` +
    `Vehicle: ${booking.vehicle_type}\n` +
    `Time: ${booking.booking_time}\n` +
    `Please wait while we find a matching driver for you. We will notify you shortly!`
  );
}

async function smsNotifyMatchingDrivers(booking) {
  try {
    const bookingTruck = (booking.vehicle_type || "").trim().toLowerCase();

    let bookingZone;
    if (booking.pickup_lat && booking.pickup_lng) {
      bookingZone = getZoneForCoordinates(booking.pickup_lat, booking.pickup_lng);
    } else {
      bookingZone = getZoneForArea(booking.pickup);
    }

    if (!bookingZone) {
      console.log(`⚠️ No zone for pickup "${booking.pickup}" — no drivers notified`);
      return;
    }

    console.log(`🔍 Notifying drivers in zone: ${bookingZone.name}`);

    const { data: drivers, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("status", "active");

    if (error) throw error;
    console.log(`📋 Active drivers in DB: ${drivers.length}`);

    const matching = drivers.filter((d) => {
      let zoneMatch;
      if (d.city_lat && d.city_lng) {
        const driverZone = getZoneForCoordinates(d.city_lat, d.city_lng);
        zoneMatch = driverZone && driverZone.id === bookingZone.id;
      } else {
        zoneMatch = areasInSameZone(d.city, booking.pickup);
      }
      const truckOk = truckTypeMatches(d.truck_types, bookingTruck);
      return zoneMatch && truckOk && d.phone;
    });

    console.log(`✅ Matching drivers: ${matching.length}`);
    if (matching.length === 0) return;

    const message =
      `Shifty: New Load Available in ${bookingZone.name}! 🚛\n` +
      `A load has been matched in your area.\n` +
      `Pickup: ${booking.pickup}\n` +
      `Drop: ${booking.drop_location}\n` +
      `Vehicle: ${booking.vehicle_type}\n` +
      `Time: ${booking.booking_time}\n` +
      `Login now to accept: https://shifty.in/driver`;

    await Promise.all(matching.map((d) => sendSMS(d.phone, message)));
  } catch (err) {
    console.error("❌ smsNotifyMatchingDrivers error:", err);
  }
}

async function smsDriverAssignedToCustomer(booking, driver) {
  await sendSMS(
    booking.phone,
    `Shifty: Driver Assigned! 🚛\n` +
    `Hi ${booking.name}, great news!\n` +
    `${driver.name} has been assigned as your driver.\n` +
    `Driver Phone: +91${cleanPhone(driver.phone)}\n` +
    `Vehicle: ${driver.truck_types || booking.vehicle_type}\n` +
    `Route: ${booking.pickup} → ${booking.drop_location}\n` +
    `Time: ${booking.booking_time}\n` +
    `You can contact your driver directly on the number above.`
  );
}

async function smsDriverAssigned(driver, booking) {
  await sendSMS(
    driver.phone,
    `Shifty: Load Assigned to You! 🚛\n` +
    `Hi ${driver.name}, you have a new load.\n` +
    `Pickup: ${booking.pickup}\n` +
    `Drop: ${booking.drop_location}\n` +
    `Vehicle: ${booking.vehicle_type}\n` +
    `Customer: ${booking.name}\n` +
    `Customer Phone: +91${cleanPhone(booking.phone)}\n` +
    `Time: ${booking.booking_time}\n` +
    `Login to manage: https://shifty.in/driver`
  );
}

// ---- Routes ----

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Shifty API running (Supabase)" });
});

app.get("/zones", (req, res) => {
  res.json(ZONES.map((z) => ({ id: z.id, name: z.name, areas: z.areas })));
});

// ---- Google Places routes (keeps API key on server) ----

app.get("/places/autocomplete", async (req, res) => {
  try {
    const input = req.query.input;
    if (!input) return res.json({ predictions: [] });
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:in&key=${process.env.GOOGLE_MAPS_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({ predictions: data.predictions || [] });
  } catch (err) {
    res.status(500).json({ predictions: [] });
  }
});

app.get("/places/details", async (req, res) => {
  try {
    const placeId = req.query.place_id;
    if (!placeId) return res.json({ result: null });
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${process.env.GOOGLE_MAPS_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({ result: data.result || null });
  } catch (err) {
    res.status(500).json({ result: null });
  }
});

// ---- Bookings ----

// City bookings — MUST be before /bookings/:id
app.get("/bookings/city/:city", async (req, res) => {
  try {
    const city = req.params.city.trim();
    const driverId = req.query.driverId || null;
    const truckType = req.query.truckType || "";
    const driverLat = parseFloat(req.query.lat) || null;
    const driverLng = parseFloat(req.query.lng) || null;

    const { data: pending, error: pendingErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "pending");
    if (pendingErr) throw pendingErr;

    let assigned = [];
    if (driverId) {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("driver_id", driverId);
      if (error) throw error;
      assigned = data;
    }

    let driverZone;
    if (driverLat && driverLng) {
      driverZone = getZoneForCoordinates(driverLat, driverLng);
    } else {
      driverZone = getZoneForArea(city);
    }

    const pendingFiltered = pending.filter((b) => {
      let zoneMatch;
      if (driverZone && b.pickup_lat && b.pickup_lng) {
        const bZone = getZoneForCoordinates(b.pickup_lat, b.pickup_lng);
        zoneMatch = bZone && bZone.id === driverZone.id;
      } else {
        zoneMatch = areasInSameZone(city, b.pickup);
      }
      return zoneMatch && truckTypeMatches(truckType, b.vehicle_type);
    });

    const assignedFiltered = assigned.filter((b) => b.status !== "pending");
    const all = [...pendingFiltered, ...assignedFiltered];
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(all);
  } catch (err) {
    console.error("Get city bookings failed", err);
    res.status(500).json({ error: "Failed to load city bookings" });
  }
});

app.get("/bookings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

app.post("/bookings", async (req, res) => {
  try {
    const { name, phone, pickup, drop, time, vehicleType, loadDetails, pickupLat, pickupLng, dropLat, dropLng } = req.body;
    const missing = requireFields(req.body, ["name", "phone", "pickup", "drop", "time"]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
    }

    const { zone, coords } = await detectZone(pickup, { lat: pickupLat, lng: pickupLng });

    const newBooking = {
      name: String(name).trim(),
      phone: cleanPhone(phone),
      pickup: String(pickup).trim(),
      drop_location: String(drop).trim(),
      booking_time: String(time).trim(),
      vehicle_type: String(vehicleType || "mini-truck").trim(),
      load_details: String(loadDetails || "").trim(),
      pickup_lat: coords?.lat || pickupLat || null,
      pickup_lng: coords?.lng || pickupLng || null,
      drop_lat: dropLat || null,
      drop_lng: dropLng || null,
      zone_id: zone ? zone.id : null,
      zone_name: zone ? zone.name : null,
      status: "pending",
    };

    const { data, error } = await supabase
      .from("bookings")
      .insert(newBooking)
      .select()
      .single();
    if (error) throw error;

    smsBookingConfirmation(data);
    smsNotifyMatchingDrivers(data);

    return res.status(201).json(data);
  } catch (err) {
    console.error("Create booking failed", err);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

// ---- Drivers ----

// MUST be before /drivers/:id routes
app.get("/drivers/by-phone/:phone", async (req, res) => {
  try {
    const phone = cleanPhone(req.params.phone);
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Driver not found" });
    return res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to find driver" });
  }
});

app.get("/drivers", async (req, res) => {
  try {
    let query = supabase.from("drivers").select("*");
    if (req.query.authUid) {
      query = query.eq("auth_uid", req.query.authUid);
    } else {
      query = query.order("created_at", { ascending: false });
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load drivers" });
  }
});

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

    const newDriver = {
      name: String(name).trim(),
      phone: cleanPhone(phone),
      city: String(city).trim(),
      city_lat: cityLat || null,
      city_lng: cityLng || null,
      zone_id: zone ? zone.id : null,
      zone_name: zone ? zone.name : null,
      truck_types: String(truckTypes || "").trim(),
      fleet_size: String(fleetSize || "").trim(),
      driving_license_no: String(drivingLicenseNo || "").trim(),
      aadhar_number: String(aadharNumber || "").trim(),
      status: "pending",
    };

    const { data, error } = await supabase
      .from("drivers")
      .insert(newDriver)
      .select()
      .single();
    if (error) throw error;

    return res.status(201).json(data);
  } catch (err) {
    console.error("Create driver failed", err);
    return res.status(500).json({ error: "Failed to create driver" });
  }
});

app.patch("/drivers/:id/approve", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("drivers")
      .update({ status: "active" })
      .eq("id", req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Driver not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve driver" });
  }
});

app.patch("/drivers/:id/deactivate", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("drivers")
      .update({ status: "inactive" })
      .eq("id", req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Driver not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to deactivate driver" });
  }
});

app.patch("/drivers/:id/link-auth", async (req, res) => {
  try {
    const { authUid } = req.body;
    if (!authUid) return res.status(400).json({ error: "authUid required" });
    const { data, error } = await supabase
      .from("drivers")
      .update({ auth_uid: authUid })
      .eq("id", req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Driver not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to link auth" });
  }
});

app.get("/drivers/:id/bookings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("driver_id", req.params.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load driver bookings" });
  }
});

// ---- Booking actions ----

app.patch("/bookings/:id/assign-driver", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "driverId required" });

    const { data: driver, error: driverErr } = await supabase
      .from("drivers").select("*").eq("id", driverId).maybeSingle();
    if (driverErr) throw driverErr;
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .update({ driver_id: driverId, status: "assigned" })
      .eq("id", req.params.id)
      .select()
      .maybeSingle();
    if (bookingErr) throw bookingErr;
    if (!booking) return res.status(404).json({ error: "Booking not found" });

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

    const { data: booking, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (status === "on_trip" && booking.phone) {
      sendSMS(booking.phone,
        `Shifty: Your Trip Has Started! 🚛\n` +
        `Hi ${booking.name}, your driver is on the way.\n` +
        `Route: ${booking.pickup} → ${booking.drop_location}`
      );
    }
    if (status === "completed" && booking.phone) {
      sendSMS(booking.phone,
        `Shifty: Delivery Completed! ✅\n` +
        `Hi ${booking.name}, your delivery is done.\n` +
        `Route: ${booking.pickup} → ${booking.drop_location}\n` +
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

    const { data: booking, error } = await supabase
      .from("bookings")
      .update({ driver_id: driverId, status: "accepted" })
      .eq("id", req.params.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!booking) return res.status(409).json({ error: "Booking already taken" });

    const { data: driver } = await supabase
      .from("drivers").select("*").eq("id", driverId).maybeSingle();
    if (driver) {
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

    const { data: existing, error: fetchErr } = await supabase
      .from("bookings").select("*").eq("id", req.params.id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: "Booking not found" });
    if (existing.driver_id !== driverId) return res.status(403).json({ error: "Not your booking" });

    const { error } = await supabase
      .from("bookings")
      .update({ driver_id: null, status: "pending" })
      .eq("id", req.params.id);
    if (error) throw error;
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

    const { data: existing, error: fetchErr } = await supabase
      .from("bookings").select("*").eq("id", req.params.id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: "Booking not found" });
    if (existing.driver_id !== driverId) return res.status(403).json({ error: "This booking is not assigned to you" });

    const newStatus = action === "accept" ? "accepted" : "pending";
    const { error } = await supabase
      .from("bookings").update({ status: newStatus }).eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: "Failed to update booking" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Shifty API running on http://localhost:${PORT} (Supabase)`);
  if (process.env.NODE_ENV === "production") {
    setInterval(async () => {
      try {
        await fetch(process.env.API_URL || "https://shifty-backend-tvhs.onrender.com/");
        console.log("🏓 Keep-alive ping sent");
      } catch (e) {}
    }, 14 * 60 * 1000);
  }
});