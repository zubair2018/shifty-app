# Shifty Project - Quick Reference Issues Map

## 🔴 CRITICAL - MUST FIX (Blocking Development)

```
┌─────────────────────────────────────────────────────────────┐
│ SECURITY: Credentials Exposed in .env                       │
├─────────────────────────────────────────────────────────────┤
│ File: server/.env                                           │
│ Issue: Real MongoDB credentials and JWT secret in git       │
│ Status: EXPOSED TO PUBLIC                                   │
│ Impact: Database can be accessed by anyone with repo        │
│ Fix: Remove from git, gitignore, rotate password            │
│ Time: 5 mins                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MODULE SYSTEM: seedAdmin.js uses CommonJS in ES6 project    │
├─────────────────────────────────────────────────────────────┤
│ File: server/seedAdmin.js                                   │
│ Issue: const/require instead of import/export               │
│ Code: require('mongoose') - WRONG                           │
│ Fix: import mongoose from 'mongoose'                        │
│ Also: References non-existent Mongoose User model           │
│ Time: 15 mins                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MODULE SYSTEM: errorHandler.js uses CommonJS                │
├─────────────────────────────────────────────────────────────┤
│ File: server/middleware/errorHandler.js                     │
│ Issue: module.exports instead of export                     │
│ Plus: Not even imported/used in server/index.js             │
│ Fix: Convert to export, add to app middleware               │
│ Time: 10 mins                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ROUTING: BookingModal missing API base URL                  │
├─────────────────────────────────────────────────────────────┤
│ File: client/src/components/BookingModal.jsx                │
│ Line: 42                                                    │
│ Issue: fetch("/api/bookings") - wrong protocol/domain       │
│ Problem: API on localhost:4000, frontend on localhost:5173  │
│ Must specify: http://localhost:4000/api/bookings            │
│ Fix: Use API_BASE from api.js                               │
│ Time: 5 mins                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ API MISMATCH: AdminPage sends POST, endpoint expects PATCH  │
├─────────────────────────────────────────────────────────────┤
│ File: client/src/AdminPage.jsx line 42                      │
│ Backend: server/routes/bookings.js line 91 (PATCH)          │
│ Frontend: method: "POST" - WRONG                            │
│ Fix: Change to method: "PATCH"                              │
│ Time: 1 min                                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ DATA MODEL: Frontend expects _id, backend returns id         │
├─────────────────────────────────────────────────────────────┤
│ Files: AdminPage.jsx line 47, 62 / DriverPage.jsx line 17   │
│ Backend: Uses memoryStore with .id (string)                 │
│ Frontend: Accessing ._id (MongoDB ObjectId)                 │
│ Mismatch:                                                   │
│   Backend: assignedDriverId (string)                        │
│   Frontend: assignedDriver._id (object)                     │
│ Fix: Update frontend to expect .id not ._id                 │
│ Fix: Update frontend to use assignedDriverId not object     │
│ Time: 10 mins                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MISSING ENDPOINTS: Frontend calls endpoints that don't exist │
├─────────────────────────────────────────────────────────────┤
│ 1. PATCH /api/drivers/{id}/availability                     │
│    Called by: AdminPage.jsx line 47                         │
│    Not implemented in: server/routes/drivers.js             │
│                                                              │
│ 2. POST /api/bookings/{id}/reject                           │
│    Called by: DriverPage.jsx line 48                        │
│    Not implemented in: server/routes/bookings.js            │
│                                                              │
│ Fix: Add both endpoints to respective route files            │
│ Time: 15 mins                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BROKEN AUTH: Middleware does nothing                         │
├─────────────────────────────────────────────────────────────┤
│ File: server/middleware/auth.js                             │
│ Issue: requireAuth() and requireAdmin() just call next()     │
│ Result: ZERO SECURITY - anyone can access admin endpoints   │
│ Fix: Implement JWT verification logic                       │
│ Impact: Critical for production                             │
│ Time: 30 mins                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BROKEN TEST: Old API schema, won't pass                      │
├─────────────────────────────────────────────────────────────┤
│ File: server/tests/bookings.test.js                         │
│ Issue: Tests use old field names                            │
│   Old: name, pickup, dropoff, goodsType, size               │
│   New: customerName, pickupAddress, dropAddress, ...        │
│ Status: npm test fails                                      │
│ Fix: Rewrite test with current schema                       │
│ Time: 20 mins                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🟡 HIGH PRIORITY (Breaks key features)

```
┌─────────────────────────────────────────────────────────────┐
│ HARDCODED URLS: Inconsistent API base across files           │
├─────────────────────────────────────────────────────────────┤
│ Files affected:                                             │
│   ✓ Login.jsx - uses VITE_API_URL (GOOD)                    │
│   ✗ AdminPage.jsx - hardcoded http://localhost:4000         │
│   ✗ DriverPage.jsx - hardcoded http://localhost:4000        │
│   ✗ BookingModal.jsx - no URL at all (broken)               │
│                                                              │
│ Solution: Use centralized api.js with API_BASE              │
│ Time: 20 mins                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ NO ENVIRONMENT VARS: Client has no .env.example              │
├─────────────────────────────────────────────────────────────┤
│ File: Missing client/.env.example                           │
│ Issue: Developers don't know what to configure              │
│ Fix: Create .env.example with VITE_API_URL, VITE_BASE_PATH  │
│ Also: Create server/.env.example                            │
│ Update: .gitignore to include .env files                    │
│ Time: 10 mins                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WRONG VITE CONFIG: Base path set to /shif-T-/               │
├─────────────────────────────────────────────────────────────┤
│ File: client/vite.config.js                                 │
│ Issue: base: '/shif-T-/' is project-specific                │
│ Problem: Won't work on production                           │
│ Fix: Change to base: '/'                                    │
│ Time: 1 min                                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SILENT FAILURES: Empty catch blocks                          │
├─────────────────────────────────────────────────────────────┤
│ Files and locations:                                        │
│   AdminPage.jsx line 48: catch (err) {}                     │
│   AdminPage.jsx line 53: catch (err) {}                     │
│   DriverPage.jsx line 34: catch (err) {}                    │
│   DriverPage.jsx line 40: catch (err) {}                    │
│   DriverPage.jsx line 48: catch (err) {}                    │
│                                                              │
│ Problem: Errors are silently ignored                        │
│ Fix: Add error logging and user notifications               │
│ Time: 15 mins                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ERROR HANDLER NOT USED: Middleware exists but not applied    │
├─────────────────────────────────────────────────────────────┤
│ File: server/index.js                                       │
│ Issue: errorHandler imported but not app.use()'d            │
│ Fix: Add app.use(errorHandler) at end of middleware chain   │
│ Time: 2 mins                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🟠 MEDIUM PRIORITY (Polish & Best Practices)

```
┌─────────────────────────────────────────────────────────────┐
│ GENERIC HTML TITLE                                           │
├─────────────────────────────────────────────────────────────┤
│ File: client/index.html                                     │
│ Current: <title>client</title>                              │
│ Should be: <title>Shifty - Book Trucks Online</title>        │
│ Time: 1 min                                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ NO INPUT VALIDATION                                          │
├─────────────────────────────────────────────────────────────┤
│ Files:                                                      │
│   BookingModal.jsx - no phone/date validation               │
│   PartnerModal.jsx - no phone validation                    │
│   Login.jsx - no email format check                         │
│                                                              │
│ Add: HTML5 attributes (type="tel", pattern, min date)       │
│ Add: JS validation functions before submit                  │
│ Time: 20 mins                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ NO LOGOUT FUNCTION                                           │
├─────────────────────────────────────────────────────────────┤
│ Issue: Token stored in localStorage but never cleared        │
│ Missing: Logout endpoint and client function                │
│ Fix: Add logout() that clears token and redirects           │
│ Time: 10 mins                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ INCOMPLETE SERVER README                                     │
├─────────────────────────────────────────────────────────────┤
│ File: server/README.md                                      │
│ Issue: References MongoDB and JWT but incomplete             │
│ Fix: Update with accurate instructions                      │
│ Time: 10 mins                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Issue Distribution

```
Critical Issues:     8 issues  (affects core functionality)
High Priority:       5 issues  (breaks features)
Medium Priority:     4 issues  (impact user experience)
Low Priority:        8+ issues (polish & best practices)

Time to Fix All:     ~3 hours
Time for Critical:   ~1 hour
```

---

## ✅ What Works Well

- ✓ Project structure (client/server separation)
- ✓ Component organization
- ✓ Tailwind CSS styling
- ✓ Modal-based forms
- ✓ In-memory data store (good for dev)
- ✓ Basic CORS setup
- ✓ Health check endpoint

---

## 📋 Testing Impact

```
Before Fixes:
  npm test    ❌ FAILS (outdated schema)
  npm run dev ❌ CRASHES (module errors)
  Frontend    ⚠️ BROKEN API calls
  Auth         ❌ NO SECURITY

After Fixes:
  npm test    ✅ PASSES
  npm run dev ✅ WORKS
  Frontend    ✅ API works
  Auth        ✅ ENFORCED
```

---

## 🎯 Fix Order Recommendation

### Phase 1: Critical (1 hour) - App Breaking Issues
1. Fix .env security (remove, gitignore, rotate)
2. Fix module systems (seedAdmin, errorHandler)
3. Fix API base URL in BookingModal
4. Fix data model expectations (id vs _id)
5. Add missing endpoints

### Phase 2: High Priority (1 hour) - Core Functionality
1. Standardize API usage (use api.js everywhere)
2. Fix auth middleware implementation
3. Update broken test file
4. Fix HTTP methods (POST vs PATCH)
5. Fix vite config base path

### Phase 3: Medium Priority (1 hour) - Polish
1. Add input validation
2. Remove empty catch blocks
3. Add environment examples
4. Update HTML title
5. Add logout support

### Phase 4: Nice-to-Have (30 mins)
1. Add request logging
2. Improve error messages
3. Add loading states
4. Documentation updates

---

## 🚀 Quality Checklist

- [ ] .env removed from git
- [ ] seedAdmin.js uses ES6 imports
- [ ] errorHandler properly registered
- [ ] All API calls use API_BASE correctly
- [ ] Auth middleware actually validates
- [ ] Tests pass (npm test)
- [ ] Frontend expects correct data structures (id, not _id)
- [ ] Missing endpoints implemented
- [ ] Phone number validation works
- [ ] No empty catch blocks
