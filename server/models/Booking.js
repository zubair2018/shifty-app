// server/models/Booking.js
import { firestore } from "../firebaseAdmin.js";

const BOOKINGS_COLLECTION = "bookings";

// Create a new booking
async function createBooking(data) {
  const now = new Date().toISOString();

  const booking = {
    pickup: data.pickup,
    drop: data.drop,
    time: data.time,
    status: "active",
    createdAt: now,
    // extra fields from frontend (optional)
    customerName: data.customerName || "",
    customerPhone: data.customerPhone || "",
    truckType: data.truckType || "",
    loadDetails: data.loadDetails || "",
  };

  const docRef = await firestore.collection(BOOKINGS_COLLECTION).add(booking);
  return { id: docRef.id, ...booking };
}

// Get all bookings
async function getAllBookings() {
  const snapshot = await firestore.collection(BOOKINGS_COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Cancel a booking (mark status = "cancelled")
async function cancelBooking(id) {
  const docRef = firestore.collection(BOOKINGS_COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return { ok: false, reason: "not_found" };
  }

  await docRef.update({ status: "cancelled" });
  return { ok: true };
}

export { createBooking, getAllBookings, cancelBooking };
