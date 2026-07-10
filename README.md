# Shifty 🚛
> Trusted trucks on tap — logistics booking platform for Kashmir.

**Live:** [shifty.in](https://shifty.in)

---

## How it works

1. Customer books a truck on the website
2. Customer gets SMS confirmation
3. Drivers in the same zone get SMS about the load
4. Driver logs in at `shifty.in/driver` via OTP
5. Driver accepts → Customer gets SMS with driver name & number
6. They contact each other directly
7. Trip completes → Customer gets delivery confirmation SMS

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Phone OTP |
| SMS | Twilio |
| Maps | Google Places API |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Roles

- **Customer** — books via landing page, no login needed
- **Driver** — logs in via OTP at `/driver`, accepts loads
- **Admin** — manages everything at `/admin`

---

## Local Setup

```bash
# Backend
cd server
npm install
cp .env.example .env   # fill in your keys
npm run dev            # runs on localhost:4000

# Frontend
cd client
npm install
cp .env.example .env.development   # fill in your keys
npm run dev            # runs on localhost:5173
```

---

## Environment Variables

**`server/.env`**
```
PORT=4000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=
GOOGLE_MAPS_KEY=
API_URL=https://your-render-url.onrender.com
```

**`client/.env.production`**
```
VITE_API_URL=https://your-render-url.onrender.com
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ADMIN_PASSWORD=
```

---

## Zones

Drivers and bookings are matched by GPS zone:

| Zone | Areas |
|------|-------|
| Srinagar | City center and surrounding areas |
| Pulwama | Pulwama, Awantipora, Pampore, Tral etc. |
| Anantnag | Anantnag, Bijbehara, Pahalgam etc. |

Zone detection priority: frontend coordinates → text match → Google Geocoding

---

## Repo

```
shifty-app/
├── client/          # React frontend
│   └── src/
│       ├── components/   # BookingModal, PartnerModal etc.
│       ├── api/          # bookings.js, drivers.js
│       ├── AdminPage.jsx
│       ├── DriverPage.jsx
│       ├── DriverLoginPage.jsx
│       └── supabase.js
└── server/          # Express backend
    ├── index.js     # All API routes
    ├── zones.js     # Zone definitions
    └── supabase.js  # DB client
```

---

Built in Kashmir 🇮🇳