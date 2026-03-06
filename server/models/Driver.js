// server/models/Driver.js
import { db, nextDriverId } from "../memoryStore.js";

export function createDriver(data) {
  const id = nextDriverId();
  const now = new Date().toISOString();

  const driver = {
    id,
    name: data.name,
    phone: data.phone,
    city: data.city,
    truckTypes: data.truckTypes || "",
    fleetSize: data.fleetSize || "",
    drivingLicenseNo: data.drivingLicenseNo || "",
    aadharNumber: data.aadharNumber || "",
    licenseDocUrl: data.licenseDocUrl || "",
    aadharDocUrl: data.aadharDocUrl || "",
    status: "pending",   // pending | verified | rejected
    notes: "",
    createdAt: now,
    updatedAt: now
  };

  db.drivers.push(driver);
  return driver;
}

export function listDrivers() {
  return db.drivers;
}

export function listPendingDrivers() {
  return db.drivers.filter((d) => d.status === "pending");
}

export function getDriverById(id) {
  return db.drivers.find((d) => d.id === id) || null;
}

export function setDriverStatus(id, status, notes = "") {
  const driver = getDriverById(id);
  if (!driver) return null;
  driver.status = status;
  if (notes) driver.notes = notes;
  driver.updatedAt = new Date().toISOString();
  return driver;
}
