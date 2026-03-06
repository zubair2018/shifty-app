# Shifty Project - Action Plan with Code Changes

## IMMEDIATE FIXES (Security & Critical Bugs)

### 1. Fix Module System (seedAdmin.js)

**Current problematic code:**
```javascript
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const { mongoUri } = require('./config');
```

**Should be:**
```javascript
import mongoose from 'mongoose';
import User from './models/User.js';
import bcryptjs from 'bcryptjs';
import { config } from './config.js';
```

**Issues with current User reference:**
- `./models/User.js` is a simple in-memory store, not a Mongoose model
- seedAdmin.js needs actual Mongoose User schema with password hashing
- Need to create a proper User.mongo.js or integrate MongoDB models

---

### 2. Fix errorHandler.js (Module System)

**Current:**
```javascript
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
}

module.exports = errorHandler;  // ❌ CommonJS
```

**Should be:**
```javascript
export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
}
```

**Then in server/index.js, add at the end:**
```javascript
app.use(errorHandler);
```

---

### 3. Fix API URL in BookingModal.jsx

**Current (line 42):**
```javascript
const res = await fetch("/api/bookings", {
```

**Problem**: Relative path won't work if frontend is served from different domain/port

**Should be:**
```javascript
import { API_BASE } from "../api.js";

// Then in handleSubmit:
const res = await fetch(`${API_BASE}/api/bookings`, {
```

---

### 4. Fix HTTP Method and Standardize Endpoints

**In server/routes/bookings.js (line 91):**

Current (WRONG):
```javascript
router.patch("/:id/status", requireAdmin, (req, res) => {
```

Should keep as PATCH (it's correct), but AdminPage uses POST. Change AdminPage:

**In client/src/AdminPage.jsx (line 42):**
```javascript
// Current:
await fetch(`${API_BASE}/api/bookings/${id}/status`, {
  method: "POST",  // ❌ Wrong

// Fix:
await fetch(`${API_BASE}/api/bookings/${id}/status`, {
  method: "PATCH",  // ✓ Correct
```

---

### 5. Fix Data Model Expectations

**In client/src/AdminPage.jsx:**

Current (lines showing `_id`):
```javascript
// Line 47
isAvailable: !driver.isAvailable,

// Line 62
b.assignedDriver && b.assignedDriver._id === driverId
```

The backend uses `id` (string, not `_id`), and returns `assignedDriverId` (not `assignedDriver` object)

**Fix:** Update frontend to match backend schema:
```javascript
// Check memoryStore which uses `id`, not `_id`
b.assignedDriverId === driverId
```

**In DriverPage.jsx (line 17):**
```javascript
// Current:
const mine = data.filter(
  (b) => b.assignedDriver && b.assignedDriver._id === driverId
);

// Fix:
const mine = data.filter(
  (b) => b.assignedDriverId === driverId
);
```

---

### 6. Fix Authentication Middleware

**Current server/middleware/auth.js (useless):**
```javascript
export function requireAuth(_req, _res, next) {
  // TODO: real auth later
  next();
}

export function requireAdmin(_req, _res, next) {
  // TODO: real admin checks later
  next();
}
```

**Needs implementation (basic version):**
```javascript
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // TODO: verify JWT token here
  next();
}

export function requireAdmin(req, res, next) {
  // TODO: check user role from JWT
  next();
}
```

---

### 7. Add Missing Endpoints

**Add to server/routes/drivers.js:**
```javascript
// Update driver availability and current location
router.patch("/:id", requireAdmin, (req, res) => {
  const { isAvailable, currentCity } = req.body;
  const driver = getDriverById(req.params.id);
  if (!driver) return res.status(404).json({ error: "Driver not found." });
  
  if (isAvailable !== undefined) driver.isAvailable = isAvailable;
  if (currentCity) driver.currentCity = currentCity;
  driver.updatedAt = new Date().toISOString();
  
  res.json({ ok: true, driver });
});
```

**Add to server/routes/bookings.js:**
```javascript
// Driver rejects booking
router.post("/:id/reject", (req, res) => {
  const { driverId } = req.body;
  const booking = getBookingById(req.params.id);
  
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  if (booking.assignedDriverId !== driverId) {
    return res.status(403).json({ error: "Not assigned to this driver." });
  }
  
  booking.assignedDriverId = null;
  booking.status = "pending";
  booking.updatedAt = new Date().toISOString();
  
  res.json({ ok: true, booking });
});
```

---

### 8. Standardize API Response Format

All endpoints should follow the same format:
```javascript
{ ok: true, booking: {...} }  // or
{ ok: false, error: "message" }
```

**Currently inconsistent** - tests expect `{ success: true, ... }` but routes use `{ ok: true, ... }`

**Decision**: Use `{ ok: true, data }` format (already used in bookings/drivers)

**Update tests/bookings.test.js:**
```javascript
// Change from:
expect(res.body.success).toBe(true);

// To:
expect(res.body.ok).toBe(true);
```

---

## MEDIUM PRIORITY FIXES

### 9. Fix Vite Configuration

**client/vite.config.js:**
```javascript
// Current:
base: process.env.VITE_BASE_PATH || '/shif-T-/',

// Should be:
base: process.env.VITE_BASE_PATH || '/',
```

The `/shif-T-/` path is project-specific and wrong for production.

---

### 10. Standardize API Usage Across Frontend

**All these files should use centralized api.js:**
- ✗ AdminPage.jsx - uses hardcoded URL
- ✗ DriverPage.jsx - uses hardcoded URL
- ✓ Login.jsx - uses VITE_API_URL correctly
- ✗ BookingModal.jsx - missing URL entirely

**Create centralized utility in client/src/api.js:**
```javascript
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function getToken() {
  return localStorage.getItem("shifty_token");
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function clearAuth() {
  localStorage.removeItem("shifty_token");
}

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(options.headers || {}),
    },
  });
  return response;
}
```

Then update all components:
```javascript
import { apiFetch, API_BASE } from "../api.js";

const res = await apiFetch("/api/bookings", {
  method: "POST",
  body: JSON.stringify(form),
});
```

---

### 11. Fix HTML Title

**client/index.html:**
```html
<!-- Change from: -->
<title>client</title>

<!-- To: -->
<title>Shifty - Book Trucks Online</title>
```

---

### 12. Add Environment Files

**Create client/.env.example:**
```
VITE_API_URL=http://localhost:4000
VITE_BASE_PATH=/
```

**Create server/.env.example:**
```
PORT=4000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=TruckOwners
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me
```

**Update .gitignore:**
```
server/.env
client/.env
client/.env.local
```

---

### 13. Add Input Validation

**BookingModal.jsx - add validation function:**
```javascript
function validatePhoneNumber(phone) {
  return /^[0-9]{10}$/.test(phone);
}

function validateDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

// In handleSubmit:
if (!validatePhoneNumber(form.customerPhone)) {
  setError("Please enter a valid 10-digit phone number.");
  return;
}

if (!validateDate(form.date)) {
  setError("Please select a future date.");
  return;
}
```

**Update HTML inputs:**
```jsx
<input
  name="customerPhone"
  type="tel"
  pattern="[0-9]{10}"
  maxLength="10"
  value={form.customerPhone}
  onChange={handleChange}
  placeholder="10-digit phone number"
  className="..."
/>
```

---

### 14. Add Logout Function

**In Login.jsx or new Auth context:**
```javascript
export function logout() {
  localStorage.removeItem("shifty_token");
  window.location.href = "/";
}
```

---

## LOW PRIORITY IMPROVEMENTS

### 15. Remove Empty Catch Blocks

**AdminPage.jsx (line 48, 53):**
```javascript
// Current:
} catch (err) {
}

// Better:
} catch (err) {
  setError("Failed to update. Please try again.");
  console.error(err);
}
```

---

### 16. Add Proper Error Handling to PartnerModal

**PartnerModal.jsx:**
```javascript
// Current:
} catch (err) {
  setStatus("error");
  setError("Could not submit details. Please try again.");
}

// Should also log:
} catch (err) {
  console.error("Partner submission failed:", err);
  setStatus("error");
  setError("Could not submit details. Please try again.");
}
```

---

### 17. Add Loading State to Components

**AdminPage.jsx:** Add loading state when toggling driver availability
```javascript
const [updating, setUpdating] = useState({});

const toggleDriverAvailability = async (driver) => {
  setUpdating(prev => ({ ...prev, [driver.id]: true }));
  try {
    // ... API call
  } finally {
    setUpdating(prev => ({ ...prev, [driver.id]: false }));
  }
};

// In render:
disabled={updating[driver.id]}
```

---

### 18. Add Request Logging Middleware

**Create server/middleware/logger.js:**
```javascript
export function logger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
}
```

**In server/index.js:**
```javascript
import { logger } from "./middleware/logger.js";

app.use(logger);
app.use(cors());
```

---

## SUMMARY OF FIXES BY FILE

| File | Changes Needed | Complexity |
|------|---|---|
| `server/.env` | Remove from git, add to .gitignore | Easy |
| `server/seedAdmin.js` | Convert to ES6 modules, fix User model reference | Medium |
| `server/middleware/errorHandler.js` | Convert to ES6, integrate into app | Easy |
| `server/middleware/auth.js` | Implement real auth logic | Medium |
| `server/routes/bookings.js` | Add `/reject` endpoint | Easy |
| `server/routes/drivers.js` | Add `/:id` PATCH endpoint | Easy |
| `client/vite.config.js` | Fix base path | Easy |
| `client/index.html` | Update title | Easy |
| `client/src/api.js` | Enhance with better utilities | Easy |
| `client/src/AdminPage.jsx` | Update API calls, fix data model expectations | Medium |
| `client/src/DriverPage.jsx` | Update API calls, fix data model expectations | Medium |
| `client/src/components/BookingModal.jsx` | Add proper API base URL | Easy |
| `client/src/components/Login.jsx` | Add logout support | Easy |
| `server/tests/bookings.test.js` | Rewrite with new schema | Medium |
| `.env.example` files | Create for both client/server | Easy |

---

## TESTING CHECKLIST

After fixes:
- [ ] `npm test` passes in server
- [ ] Frontend can create booking and see it in admin
- [ ] Admin can see and update booking status
- [ ] Driver can accept/reject bookings
- [ ] API URLs work from different ports
- [ ] Auth middleware prevents unauthorized access
- [ ] Phone number validation works
- [ ] Logout clears token
