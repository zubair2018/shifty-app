// src/api/bookings.js

const API_URL = import.meta.env.VITE_API_URL || "https://shifty-backend-tvhs.onrender.com";

export async function createBookingApi(form) {
  const res = await fetch(`${API_URL}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: form.customerName,
      phone: form.customerPhone,
      pickup: form.pickupAddress,
      drop: form.dropAddress,
      time: `${form.date} ${form.time}`,
      vehicleType: form.truckType,
      loadDetails: form.loadDetails || "",
      // Coordinates for accurate zone matching
      pickupLat: form.pickupLat || null,
      pickupLng: form.pickupLng || null,
      dropLat: form.dropLat || null,
      dropLng: form.dropLng || null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Booking failed");
  }

  return res.json();
}