// server/config.js
export const config = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI || "" // for later
};
