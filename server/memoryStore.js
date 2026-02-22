const { Types } = require("mongoose");

function newId() {
  return new Types.ObjectId().toString();
}

// Very small in-memory store for local dev/tests when Mongo isn't configured.
const store = {
  drivers: [],
  bookings: [],
};

module.exports = { store, newId };

