// src/DriverPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

const API_BASE = "http://localhost:4000";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function StatusBadge({ status }) {
  const colors = {
    pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    assigned: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    accepted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    on_trip: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    completed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] border font-medium capitalize ${colors[status] || "bg-slate-700 text-slate-300"}`}>
      {status}
    </span>
  );
}

function BookingDetailModal({ booking, onClose, onAccept, onRelease, driverId }) {
  const isMyBooking = booking.driverId === driverId;
  const isPending = booking.status === "pending";
  const isAssignedToMe = booking.status === "assigned" && booking.driverId === driverId;
  const isAcceptedByMe = booking.status === "accepted" && booking.driverId === driverId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Booking Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="bg-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Customer</span>
              <span className="text-white font-medium">{booking.name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone</span>
              <span className="text-white">{booking.phone || "N/A"}</span>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Pickup</span>
              <span className="text-white font-medium">{booking.pickup || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Drop</span>
              <span className="text-white font-medium">{booking.drop || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time</span>
              <span className="text-white">{booking.time || "N/A"}</span>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Vehicle</span>
              <span className="text-white">{booking.vehicleType || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Load details</span>
              <span className="text-white">{booking.loadDetails || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <StatusBadge status={booking.status} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {(isPending || isAssignedToMe) && (
            <button
              onClick={() => onAccept(booking.id)}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition"
            >
              Accept Load
            </button>
          )}
          {isAcceptedByMe && (
            <button
              onClick={() => onRelease(booking.id)}
              className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-sm transition"
            >
              Release Load
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriverPage() {
  const [cityBookings, setCityBookings] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [driverId, setDriverId] = useState(null);
  const [driverName, setDriverName] = useState("");
  const [driverCity, setDriverCity] = useState("");
  const [driverTruckTypes, setDriverTruckTypes] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState("city");
  const navigate = useNavigate();

  // Auth check + load driver profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/driver/login"); return; }

      try {
        // Find driver by authUid first
        let res = await fetch(`${API_BASE}/drivers?authUid=${user.uid}`);
        let data = await res.json();

        // If not found by authUid, try matching by phone number
        if (!data || data.length === 0) {
          const phone = user.phoneNumber || "";
          const digits = phone.replace(/\D/g, "").slice(-10);
          const allRes = await fetch(`${API_BASE}/drivers`);
          const allDrivers = await allRes.json();
          data = allDrivers.filter((d) => {
            const dDigits = (d.phone || "").replace(/\D/g, "").slice(-10);
            return dDigits === digits;
          });
        }

        if (data.length > 0) {
          const driver = data[0];
          setDriverId(driver.id);
          setDriverName(driver.name || "Driver");
          setDriverCity(driver.city || "");
          setDriverTruckTypes(driver.truckTypes || "");

          // Link authUid if not yet linked
          if (!driver.authUid) {
            await fetch(`${API_BASE}/drivers/${driver.id}/link-auth`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ authUid: user.uid }),
            });
          }
        } else {
          setError("No driver account found for this phone number. Please register first via the Partner form.");
          setLoading(false);
        }
      } catch (err) {
        setError("Failed to load driver profile.");
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (driverId && driverCity) loadAllBookings();
  }, [driverId, driverCity]);

  const loadAllBookings = async () => {
    try {
      setLoading(true);
      setError("");

      // City pool — filtered by city + truck type
      const cityData = await fetchJson(
        `${API_BASE}/bookings/city/${encodeURIComponent(driverCity)}?driverId=${driverId}&truckType=${encodeURIComponent(driverTruckTypes)}`
      );

      // My bookings
      const myData = await fetchJson(`${API_BASE}/drivers/${driverId}/bookings`);

      setCityBookings(cityData || []);

      // Split my bookings into active and completed
      const active = (myData || []).filter(
        (b) => ["assigned", "accepted", "on_trip"].includes(b.status)
      );
      const completed = (myData || []).filter(
        (b) => ["completed", "cancelled"].includes(b.status)
      );

      setActiveBookings(active);
      setCompletedBookings(completed);
    } catch (err) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (bookingId) => {
    try {
      const booking = [...cityBookings, ...activeBookings].find(
        (b) => b.id === bookingId
      );
      if (!booking) return;

      if (booking.status === "pending") {
        await fetchJson(`${API_BASE}/bookings/${bookingId}/self-assign`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverId }),
        });
      } else if (booking.status === "assigned") {
        await fetchJson(`${API_BASE}/bookings/${bookingId}/driver-response`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept" }),
        });
      }

      setSelectedBooking(null);
      await loadAllBookings();
    } catch (err) {
      alert(err.message || "Failed to accept. Someone else may have taken it.");
      await loadAllBookings();
    }
  };

  const handleRelease = async (bookingId) => {
    if (!window.confirm("Release this load back to the pool?")) return;
    try {
      await fetchJson(`${API_BASE}/bookings/${bookingId}/release`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      setSelectedBooking(null);
      await loadAllBookings();
    } catch (err) {
      alert(err.message || "Failed to release booking");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/driver/login");
  };

  const tabs = [
    { key: "city", label: `Available (${cityBookings.length})` },
    { key: "active", label: `My Active (${activeBookings.length})` },
    { key: "completed", label: `Completed (${completedBookings.length})` },
  ];

  const displayBookings =
    activeTab === "city"
      ? cityBookings
      : activeTab === "active"
      ? activeBookings
      : completedBookings;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Driver Dashboard</h1>
            <p className="text-xs text-slate-400">
              {driverName
                ? `${driverName} · ${driverCity} · ${driverTruckTypes || "N/A"}`
                : "Loading profile..."}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAllBookings}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs rounded-lg border border-rose-700 bg-rose-900/20 text-rose-300 hover:bg-rose-900/40"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-xs rounded-lg font-medium transition ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-xs text-rose-100">
            {error}
          </div>
        )}

        {/* Booking list */}
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : displayBookings.length === 0 ? (
          <p className="text-sm text-slate-400">
            {activeTab === "city"
              ? `No available loads in ${driverCity} matching your truck type right now.`
              : activeTab === "active"
              ? "No active loads right now."
              : "No completed loads yet."}
          </p>
        ) : (
          <div className="space-y-3">
            {displayBookings.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBooking(b)}
                className="border border-slate-800 rounded-xl p-4 bg-slate-900/50 hover:bg-slate-900 cursor-pointer transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-white">
                      {b.pickup || "?"} → {b.drop || "?"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {b.name || "Customer"} · {b.vehicleType || "N/A"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {b.time || "N/A"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={b.status} />
                    {b.driverId === driverId && (
                      <span className="text-[10px] text-blue-400">Yours</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-blue-400 font-medium">
                  Tap to view details →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          driverId={driverId}
          onClose={() => setSelectedBooking(null)}
          onAccept={handleAccept}
          onRelease={handleRelease}
        />
      )}
    </div>
  );
}