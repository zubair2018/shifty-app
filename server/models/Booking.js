// server/models/Booking.js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },

    pickupAddress: { type: String, required: true },
    dropAddress: { type: String, required: true },

    // Optional fields (used by the current frontend pages)
    pickupCity: { type: String },
    dropCity: { type: String },
    pickupDate: { type: String },
    pickupTime: { type: String },
    details: { type: String },

    loadType: {
      type: String,
      enum: ["mini", "medium", "heavy"],
      required: true,
    },
    weightTons: Number,

    status: {
      type: String,
      enum: [
        "PENDING",
        "SEARCHING_DRIVER",
        "ASSIGNED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    requestedDrivers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Driver" }],
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    expiresAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
