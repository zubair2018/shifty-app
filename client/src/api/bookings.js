// src/api/bookings.js
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function createBookingApi(form) {
  const payload = {
    name: form.customerName,
    phone: form.customerPhone.replace(/\D/g, "").slice(-10),
    pickup: form.pickupAddress,
    drop: form.dropAddress,
    time: `${form.date} ${form.time}`,
    vehicleType: form.truckType,
    loadDetails: form.loadDetails,
  };

  const res = await fetch(`${API_BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(data.error || `Failed to create booking (${res.status})`);
  return data;
}