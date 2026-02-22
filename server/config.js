const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  port: process.env.PORT || 4000,
  // Support both names (repo docs used MONGODB_URI, server/index.js used MONGO_URI)
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || null,
  jwtSecret: process.env.JWT_SECRET || "change_this_secret",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};
