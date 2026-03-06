// server/memoryStore.js

export const db = {
  bookings: [],
  drivers: [],
  users: [],
  partners: []
};

let bookingCounter = 1;
let driverCounter = 1;
let userCounter = 1;
let partnerCounter = 1;

export function nextBookingId() {
  return String(bookingCounter++);
}

export function nextDriverId() {
  return String(driverCounter++);
}

export function nextUserId() {
  return String(userCounter++);
}

export function nextPartnerId() {
  return String(partnerCounter++);
}
