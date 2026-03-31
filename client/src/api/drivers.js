// src/api/drivers.js
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function createDriverApi(form) {
  const payload = {
    name: form.name,
    phone: form.phone.replace(/\D/g, "").slice(-10),
    city: form.city,
    truckTypes: form.truckTypes || "",
    fleetSize: form.fleetSize || "",
    drivingLicenseNo: form.drivingLicenseNo || "",
    aadharNumber: form.aadharNumber || "",
    licenseDocUrl: "",
    aadharDocUrl: "",
  };

  const res = await fetch(`${API_BASE}/drivers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(data.error || `Failed to submit driver (${res.status})`);
  return data;
}