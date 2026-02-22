// server/index.js
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");

const config = require("./config");

const driversRoutes = require("./routes/drivers");
const bookingsRoutes = require("./routes/bookings");
const authRoutes = require("./routes/auth");
const partnersRoutes = require("./routes/partners");
const ownersRoutes = require("./routes/owners");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// If Mongo isn't configured, routes fall back to a tiny in-memory store (useful for local testing)
app.locals.useMemory = !config.mongoUri;

app.use(morgan("dev"));
app.use(
  cors({
    origin: config.corsOrigin,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Shifty API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/partners", partnersRoutes);
app.use("/api/owners", ownersRoutes); // legacy alias for tests/older code

app.use("/api/drivers", driversRoutes);
app.use("/api/bookings", bookingsRoutes);

app.use(errorHandler);

async function start() {
  if (config.mongoUri) {
    await mongoose.connect(config.mongoUri);
    console.log("Connected to MongoDB");
  } else {
    console.warn("MongoDB URI not set (MONGO_URI/MONGODB_URI). Using in-memory store.");
  }

  app.listen(config.port, () => {
    console.log(`API running on http://localhost:${config.port}`);
  });
}

// Export app for tests (supertest) and start server only when run directly
module.exports = app;

if (require.main === module) {
  start().catch((err) => {
    console.error("Server start error:", err);
    process.exitCode = 1;
  });
}
