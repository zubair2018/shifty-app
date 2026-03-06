// server/models/Booking.js
import { db, nextBookingId } from "../memoryStore.js";

export function createBooking(data) {
  const id = nextBookingId();
  const now = new Date().toISOString();

  const booking = {
    id,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    pickupAddress: data.pickupAddress,
    dropAddress: data.dropAddress,
    date: data.date,
    time: data.time,
    truckType: data.truckType || "",   // NEW field
    loadDetails: data.loadDetails || "",
    status: "pending",                 // pending | assigned | in_progress | completed | cancelled
    assignedDriverId: null,
    createdAt: now,
    updatedAt: now
  };

  db.bookings.push(booking);
  return booking;
}

export function listBookings() {
  return db.bookings;
}

export function getBookingById(id) {
  return db.bookings.find((b) => b.id === id) || null;
}

export function setBookingStatus(id, status) {
  const booking = getBookingById(id);
  if (!booking) return null;
  booking.status = status;
  booking.updatedAt = new Date().toISOString();
  return booking;
}

export function assignDriverToBooking(id, driverId) {
  const booking = getBookingById(id);
  if (!booking) return null;
  booking.assignedDriverId = driverId;
  booking.status = "assigned";
  booking.updatedAt = new Date().toISOString();
  return booking;
}
