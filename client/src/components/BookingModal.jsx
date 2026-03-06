import { useState } from "react";

const BookingModal = ({ onClose }) => {
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    pickupAddress: "",
    dropAddress: "",
    date: "",
    time: "",
    truckType: "",
    loadDetails: ""
  });

  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.customerName ||
      !form.customerPhone ||
      !form.pickupAddress ||
      !form.dropAddress ||
      !form.date ||
      !form.time
    ) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setStatus("loading");

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        throw new Error("Failed");
      }

      setStatus("success");
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setStatus("error");
      setError("Could not submit booking. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Book a truck
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-[12px]">
          <input
            name="customerName"
            value={form.customerName}
            onChange={handleChange}
            placeholder="Your name"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500"
          />

          <input
            name="customerPhone"
            value={form.customerPhone}
            onChange={handleChange}
            placeholder="Phone number"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500"
          />

          <input
            name="pickupAddress"
            value={form.pickupAddress}
            onChange={handleChange}
            placeholder="Pickup location"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500"
          />

          <input
            name="dropAddress"
            value={form.dropAddress}
            onChange={handleChange}
            placeholder="Drop location"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500"
          />

          <div className="flex gap-2">
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="flex-1 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] [color-scheme:dark]"
            />
            <input
              type="time"
              name="time"
              value={form.time}
              onChange={handleChange}
              className="flex-1 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] [color-scheme:dark]"
            />
          </div>

          <select
            name="truckType"
            value={form.truckType}
            onChange={handleChange}
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
          >
            <option value="">Select truck type</option>
            <option value="mini-truck">Mini-truck</option>
            <option value="tatamobile">Tatamobile</option>
            <option value="factory-truck">Factory truck</option>
          </select>

          <textarea
            name="loadDetails"
            value={form.loadDetails}
            onChange={handleChange}
            placeholder="How many tons or what type of load?"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500 h-20"
          />

          {error && (
            <p className="text-[11px] text-red-400">
              {error}
            </p>
          )}

          {status === "success" && (
            <p className="text-[11px] text-emerald-400">
              Booking received. We will contact you soon.
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-full bg-yellow-400 py-2 text-[12px] font-semibold text-slate-950 hover:bg-yellow-300 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "Submitting..." : "Submit booking"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
