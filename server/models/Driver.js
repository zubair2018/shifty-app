// server/models/Driver.js
import { firestore } from "../firebaseAdmin.js";

const DRIVERS_COLLECTION = "drivers";

// Create a new driver (partner)
export async function createDriver(data) {
  const now = new Date().toISOString();

  const driver = {
    name: data.name,
    phone: data.phone,
    city: data.city,
    truckTypes: data.truckTypes || "",
    fleetSize: data.fleetSize || "",
    drivingLicenseNo: data.drivingLicenseNo || "",
    aadharNumber: data.aadharNumber || "",
    licenseDocUrl: data.licenseDocUrl || "",
    aadharDocUrl: data.aadharDocUrl || "",
    status: "pending", // pending | verified | rejected
    notes: "",
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await firestore.collection(DRIVERS_COLLECTION).add(driver);
  return { id: docRef.id, ...driver };
}

// List all drivers
export async function listDrivers() {
  const snapshot = await firestore.collection(DRIVERS_COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// List only pending drivers
export async function listPendingDrivers() {
  const snapshot = await firestore
    .collection(DRIVERS_COLLECTION)
    .where("status", "==", "pending")
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Get one driver by id
export async function getDriverById(id) {
  const docRef = firestore.collection(DRIVERS_COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// Update driver status
export async function setDriverStatus(id, status, notes = "") {
  const docRef = firestore.collection(DRIVERS_COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const updates = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (notes) updates.notes = notes;

  await docRef.update(updates);

  const updated = await docRef.get();
  return { id: updated.id, ...updated.data() };
}
