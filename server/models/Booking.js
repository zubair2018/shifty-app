// server/models/Booking.js
import { firestore } from "../firebaseAdmin.js";

const BOOKINGS_COLLECTION = "bookings";

// Example: create a new booking
async function createBooking(data) {
  const docRef = await firestore.collection(BOOKINGS_COLLECTION).add(data);
  return { id: docRef.id, ...data };
}

// Example: get all bookings
async function getAllBookings() {
  const snapshot = await firestore.collection(BOOKINGS_COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export { createBooking, getAllBookings };
