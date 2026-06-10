# Shifty 🚛
**Trusted trucks on tap** — A logistics booking platform for Jammu & Kashmir.

> Book a truck in seconds. No broker drama. No hidden fees.

Live at **[shifty.in](https://shifty.in)**

---

## What is Shifty?

Shifty connects customers who need to move goods with verified truck drivers in their area. Think Rapido, but for freight. Currently operating in Kashmir (Srinagar, Pulwama, Anantnag) with plans to expand across J&K.

---

## How it Works

```
Customer books a truck
        ↓
Customer gets SMS confirmation
        ↓
Matching drivers in same zone get SMS notification
        ↓
Driver logs in via OTP at shifty.in/driver
        ↓
Driver accepts the booking
        ↓
Customer gets SMS with driver name + phone number
        ↓
They contact each other directly
        ↓
Trip completes → Customer gets delivery confirmation SMS
```

---

## User Roles

| Role | Access | Login |
|------|--------|-------|
| Customer | Books trucks via landing page | No login needed |
| Driver | Views & accepts loads in their area | OTP via registered phone |
| Admin | Manages bookings, drivers, assignments | Password protected at `/admin` |

---

## Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS
- React Router v6
- Firebase Auth (Phone OTP for drivers)
- Google Maps Places API (location autocomplete)

**Backend**
- Node.js + Express
- Firebase Admin SDK + Firestore (database)
- Twilio (SMS notifications)
- Google Maps Geocoding API (zone detection)

**Hosting**
- Frontend → Vercel
- Backend → Render
- Database → Firebase Firestore

---

## Project Structure

```
shifty-app/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppHeader.jsx
│   │   │   ├── BottomNav.jsx
│   │   │   ├── BookingModal.jsx     # Google Places autocomplete
│   │   │   ├── PartnerModal.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── HowItWorks.jsx
│   │   │   ├── Services.jsx
│   │   │   ├── WhyShifty.jsx
│   │   │   ├── TruckOwners.jsx
│   │   │   ├── AboutSection.jsx
│   │   │   ├── ContactSection.jsx
│   │   │   └── Footer.jsx
│   │   ├── api/
│   │   │   └── bookings.js          # API calls to backend
│   │   ├── App.jsx                  # Routes
│   │   ├── AdminPage.jsx            # Admin dashboard
│   │   ├── AdminAuthGuard.jsx       # Admin password protection
│   │   ├── DriverPage.jsx           # Driver dashboard
│   │   ├── DriverLoginPage.jsx      # OTP login for drivers
│   │   ├── DriverAuthGuard.jsx      # Protects /driver route
│   │   └── firebase.js              # Firebase config
│   ├── .env.development
│   ├── .env.production
│   └── vite.config.js
│
├── server/                   # Node.js backend
│   ├── index.js              # All API routes
│   ├── zones.js              # Zone definitions + coordinate matching
│   ├── serviceAccountKey.json  # Firebase service account (not in git)
│   └── .env
│
└── README.md
```

---

## Routes

### Frontend
| Path | Description |
|------|-------------|
| `/` | Customer landing page |
| `/driver` | Driver dashboard (protected, needs OTP login) |
| `/driver/login` | Driver OTP login page |
| `/admin` | Admin dashboard (password protected) |

### Backend API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/zones` | List all zones |
| POST | `/bookings` | Create booking + send SMS |
| GET | `/bookings` | List all bookings |
| GET | `/bookings/city/:city` | Get bookings for a driver's zone |
| PATCH | `/bookings/:id/assign-driver` | Admin assigns driver |
| PATCH | `/bookings/:id/self-assign` | Driver accepts load |
| PATCH | `/bookings/:id/status` | Update booking status |
| PATCH | `/bookings/:id/release` | Driver releases load |
| PATCH | `/bookings/:id/driver-response` | Driver accept/reject |
| POST | `/drivers` | Register new driver |
| GET | `/drivers` | List all drivers |
| GET | `/drivers/by-phone/:phone` | Find driver by phone |
| PATCH | `/drivers/:id/approve` | Admin approves driver |
| PATCH | `/drivers/:id/deactivate` | Admin deactivates driver |
| PATCH | `/drivers/:id/link-auth` | Link Firebase UID to driver |
| GET | `/drivers/:id/bookings` | Get driver's bookings |

---

## SMS Notifications (via Twilio)

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Booking created | Customer | Booking confirmed, wait for driver |
| Booking created | Matching drivers in zone | New load available, login to accept |
| Driver assigned (admin or self) | Customer | Driver name + phone number |
| Driver assigned (admin or self) | Driver | Booking details + customer phone |
| Trip started | Customer | Driver is on the way |
| Trip completed | Customer | Delivery done, thank you |

---

## Zone System

Zones define which drivers get notified for which bookings. Uses **GPS coordinate boundaries** — any place Google Maps knows (villages, roads, landmarks) automatically maps to the correct zone.

**Current zones:**
| Zone | Covers |
|------|--------|
| Srinagar | Srinagar city and surrounding areas |
| Pulwama | Pulwama, Awantipora, Pampore, Panzgam, Tral etc. |
| Anantnag | Anantnag, Bijbehara, Sangam, Pahalgam etc. |

Zone detection priority:
1. **Frontend coordinates** (from Google Places autocomplete) → instant
2. **Text matching** → fast fallback
3. **Google Geocoding API** → geocodes any place name to coordinates

---

## Environment Variables

### client/.env.development and .env.production
```
VITE_API_URL=http://localhost:4000              # or your Render URL in production
VITE_GOOGLE_MAPS_KEY=your_google_maps_key
VITE_ADMIN_PASSWORD=your_admin_password
```

### server/.env
```
PORT=4000
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_SMS_FROM=your_twilio_number
GOOGLE_MAPS_KEY=your_google_maps_key
SERVICE_ACCOUNT_KEY=your_firebase_json     # in production
API_URL=https://your-render-url.onrender.com
```

---

## Local Development

**Prerequisites:** Node.js 18+, npm

```bash
# Clone the repo
git clone https://github.com/zubair2018/shifty-app.git
cd shifty-app

# Start backend
cd server
npm install
# Add your .env file
npm run dev
# API runs on http://localhost:4000

# Start frontend (new terminal)
cd client
npm install
# Add your .env.development file
npm run dev
# App runs on http://localhost:5173
```

---

## Deployment

**Frontend → Vercel**
```bash
cd client
npm run build
# Push to GitHub, Vercel auto-deploys
```

**Backend → Render**
- Connect GitHub repo to Render
- Set root directory to `server/`
- Add all environment variables in Render dashboard
- Set `SERVICE_ACCOUNT_KEY` as the full Firebase JSON string

---

## Security Notes

- Admin dashboard protected by password (session-based)
- Driver dashboard protected by Firebase Phone Auth OTP
- Only registered + approved drivers can log in
- Driver whitelist check runs after OTP verification
- Firestore security rules should be locked down in Firebase console
- Google Maps API key should be restricted to your domain in Google Cloud Console

---

## Current Status

✅ Customer booking flow  
✅ SMS confirmation to customer  
✅ Zone-based driver matching (coordinate + text + geocoding)  
✅ SMS notification to matching drivers  
✅ Driver OTP login (Firebase Phone Auth)  
✅ Driver whitelist check (only registered drivers can log in)  
✅ Driver self-accept booking  
✅ SMS to customer when driver assigned  
✅ SMS to driver when assigned  
✅ Trip started / completed SMS  
✅ Admin dashboard (bookings, drivers, assignments)  
✅ Admin password protection  
✅ Google Places autocomplete in booking form  

🔲 React Native mobile app  
🔲 PWA (installable web app)  
🔲 Payment integration  
🔲 Driver ratings  
🔲 Real-time booking tracking  

---

## Built by
Shifty Team — Kashmir, India 🇮🇳