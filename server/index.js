// server/index.js
import express from "express";
import "./firebaseAdmin.js"; // ensure Firebase initializes
import bookingRoutes from "./routes/bookingRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware to parse JSON
app.use(express.json());

// Root route so "/" works
app.get("/", (req, res) => {
  res.send("Shifty API is running");
});

// Mount booking API
app.use("/bookings", bookingRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Shifty API running on http://localhost:${PORT}`);
});
