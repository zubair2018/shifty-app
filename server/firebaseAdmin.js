// server/firebaseAdmin.js
import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Make sure this file exists: server/serviceAccountKey.json
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const firestore = admin.firestore();

export { admin, firestore };
