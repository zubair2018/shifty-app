// src/components/BookingModal.jsx
import { useState, useRef } from "react";
import { createBookingApi } from "../api/bookings";

const TRUCK_TYPES = [
  { value: "mini-truck", label: "Mini-truck" },
  { value: "tatamobile", label: "Tata Mobile" },
  { value: "factory-truck", label: "Factory Truck" },
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ---- Places Autocomplete Input ----
function PlacesInput({ placeholder, value, onChange, onSelect, inputClass }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  const fetchSuggestions = async (input) => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `${API_URL}/places/autocomplete?input=${encodeURIComponent(input)}`
      );
      const data = await res.json();
      setSuggestions(data.predictions || []);
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  };

  const handleChange = (val) => {
    onChange(val);
    setShowSuggestions(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSelect = async (prediction) => {
    onChange(prediction.description);
    setShowSuggestions(false);
    setSuggestions([]);

    try {
      const res = await fetch(
        `${API_URL}/places/details?place_id=${prediction.place_id}`
      );
      const data = await res.json();
      const loc = data.result?.geometry?.location;
      if (loc) {
        onSelect({ address: prediction.description, lat: loc.lat, lng: loc.lng });
      } else {
        onSelect({ address: prediction.description, lat: null, lng: null });
      }
    } catch (err) {
      onSelect({ address: prediction.description, lat: null, lng: null });
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onFocus={() => value.length >= 3 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden shadow-xl">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onMouseDown={() => handleSelect(s)}
              className="px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-0"
            >
              📍 {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Main Booking Modal ----
const BookingModal = ({ onClose }) => {
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    pickupAddress: "",
    pickupLat: null,
    pickupLng: null,
    dropAddress: "",
    dropLat: null,
    dropLng: null,
    date: "",
    time: "",
    truckType: "",
    loadDetails: "",
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const inputClass =
    "w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500 focus:outline-none focus:border-blue-500";

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "customerPhone") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setForm((prev) => ({ ...prev, customerPhone: digits }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePickupSelect = ({ address, lat, lng }) => {
    setForm((prev) => ({ ...prev, pickupAddress: address, pickupLat: lat, pickupLng: lng }));
  };

  const handleDropSelect = ({ address, lat, lng }) => {
    setForm((prev) => ({ ...prev, dropAddress: address, dropLat: lat, dropLng: lng }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.customerName.trim()) { setError("Please enter your name."); return; }
    if (form.customerPhone.length !== 10) { setError("Enter a valid 10-digit phone number."); return; }
    if (!form.pickupAddress.trim()) { setError("Please enter pickup location."); return; }
    if (!form.dropAddress.trim()) { setError("Please enter drop location."); return; }
    if (!form.date) { setError("Please select a date."); return; }
    if (!form.time) { setError("Please select a time."); return; }
    if (!form.truckType) { setError("Please select a truck type."); return; }

    const bookingTime = new Date(`${form.date}T${form.time}`);
    if (bookingTime <= new Date()) {
      setError("Please select a future date and time.");
      return;
    }

    try {
      setStatus("loading");
      await createBookingApi({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        pickupAddress: form.pickupAddress,
        dropAddress: form.dropAddress,
        date: form.date,
        time: form.time,
        truckType: form.truckType,
        loadDetails: form.loadDetails,
        pickupLat: form.pickupLat,
        pickupLng: form.pickupLng,
        dropLat: form.dropLat,
        dropLng: form.dropLng,
      });
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        onClose && onClose();
      }, 2500);
    } catch (err) {
      console.error("Booking submit failed:", err);
      setStatus("error");
      setError("Could not submit booking. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100">Book a Truck</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
        </div>

        {status === "success" ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">✅</div>
            <p className="text-emerald-400 font-semibold">Booking Confirmed!</p>
            <p className="text-slate-400 text-xs">
              You will receive an SMS confirmation shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2.5 text-[12px]">

            <input
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              placeholder="Your name *"
              className={inputClass}
            />

            <div className="flex">
              <span className="bg-slate-700 border border-slate-600 border-r-0 rounded-l-md px-3 flex items-center text-slate-300 text-[12px] font-medium">
                +91
              </span>
              <input
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="10-digit number *"
                type="tel"
                className="flex-1 rounded-r-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            {form.customerPhone.length > 0 && form.customerPhone.length < 10 && (
              <p className="text-red-400 text-[11px]">Enter complete 10-digit number</p>
            )}

            {/* Pickup with autocomplete */}
            <div className="relative">
              <PlacesInput
                placeholder="Pickup location *"
                value={form.pickupAddress}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, pickupAddress: val, pickupLat: null, pickupLng: null }))
                }
                onSelect={handlePickupSelect}
                inputClass={inputClass}
              />
              {form.pickupLat && (
                <span className="absolute right-2 top-2 text-emerald-400 text-[10px]">✓</span>
              )}
            </div>

            {/* Drop with autocomplete */}
            <div className="relative">
              <PlacesInput
                placeholder="Drop location *"
                value={form.dropAddress}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, dropAddress: val, dropLat: null, dropLng: null }))
                }
                onSelect={handleDropSelect}
                inputClass={inputClass}
              />
              {form.dropLat && (
                <span className="absolute right-2 top-2 text-emerald-400 text-[10px]">✓</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="date"
                name="date"
                value={form.date}
                min={new Date().toISOString().split("T")[0]}
                onChange={handleChange}
                className="flex-1 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] [color-scheme:dark] focus:outline-none focus:border-blue-500"
              />
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                className="flex-1 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] [color-scheme:dark] focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              name="truckType"
              value={form.truckType}
              onChange={handleChange}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] focus:outline-none focus:border-blue-500"
            >
              <option value="">Select truck type *</option>
              {TRUCK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <textarea
              name="loadDetails"
              value={form.loadDetails}
              onChange={handleChange}
              placeholder="Load details (optional)"
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500 h-14 resize-none focus:outline-none focus:border-blue-500"
            />

            {error && (
              <p className="text-[11px] text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-full bg-yellow-400 py-2 text-[12px] font-semibold text-slate-950 hover:bg-yellow-300 disabled:opacity-70 disabled:cursor-not-allowed transition"
            >
              {status === "loading" ? "Submitting..." : "Submit Booking"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookingModal;