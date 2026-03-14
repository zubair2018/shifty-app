// server/index.js
import express from "express";
import cors from "cors";
import "./firebaseAdmin.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for your Vite frontend (port 5173)
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// Parse JSON bodies
app.use(express.json());

// Root route so "/" works
app.get("/", (req, res) => {
  res.send("Shifty API is running");
});

// Booking API
app.use("/bookings", bookingRoutes);

// Driver (partner) API
app.use("/drivers", driverRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Shifty API running on http://localhost:${PORT}`);
});
