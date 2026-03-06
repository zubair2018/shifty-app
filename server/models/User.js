// server/models/User.js
import { db, nextUserId } from "../memoryStore.js";

export function createUser(data) {
  const id = nextUserId();
  const now = new Date().toISOString();

  const user = {
    id,
    name: data.name,
    email: data.email,
    role: data.role || "owner", // owner | admin
    createdAt: now
    // later: password hash, etc.
  };

  db.users.push(user);
  return user;
}

export function listUsers() {
  return db.users;
}

export function getUserById(id) {
  return db.users.find((u) => u.id === id) || null;
}
