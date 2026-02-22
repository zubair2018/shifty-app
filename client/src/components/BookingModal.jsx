import { useState } from "react";

const BookingModal = ({ onClose }) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    pickup: "",
    drop: "",
    date: "",
    time: "",
    details: "",
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.phone || !form.pickup || !form.drop || !form.date || !form.time) {
      setError("Please fill all required fields, including date and time.");
      return;
    }

    try {
      setStatus("loading");

      const res = await fetch("http://localhost:4000/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
          <button onClick={onClose} className="text-slate-400 text-sm">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-[12px]">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your name"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
          />
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone number"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
          />
          <input
            name="pickup"
            value={form.pickup}
            onChange={handleChange}
            placeholder="Pickup location"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
          />
          <input
            name="drop"
            value={form.drop}
            onChange={handleChange}
            placeholder="Drop location"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
          />

          <div className="flex gap-2">
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="flex-1 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
            />
            <input
              type="time"
              name="time"
              value={form.time}
              onChange={handleChange}
              className="flex-1 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
            />
          </div>

          <textarea
            name="details"
            value={form.details}
            onChange={handleChange}
            placeholder="What are you moving? Any timing notes?"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] h-20"
          />

          {error && (
            <p className="text-[11px] text-red-400">{error}</p>
          )}
          {status === "success" && (
            <p className="text-[11px] text-emerald-400">
              Booking received. We will contact you soon.
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-full bg-yellow-400 py-2 text-[12px] font-semibold text-slate-950 hover:bg-yellow-300 disabled:opacity-70"
          >
            {status === "loading" ? "Submitting..." : "Submit booking"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
