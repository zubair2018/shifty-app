// src/AdminPage.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:4000";

async function fetchJson(url) {
  const res = await fetch(url);
  let data = [];
  try {
    data = await res.json();
  } catch (e) {}
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

const formatDateTime = (iso) => {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return d.toLocaleString();
};

const statusBadgeClasses = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  completed: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  cancelled: "bg-rose-500/20 text-rose-300 border-rose-500/40",
};

const bookingFilters = ["All", "Today", "Upcoming", "Completed", "Cancelled"];

// helper to check if a booking is today/upcoming
const isToday = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const isUpcoming = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getTime() > now.getTime();
};

export default function AdminPage() {
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [bookingFilter, setBookingFilter] = useState("All");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [b, d] = await Promise.all([
          fetchJson(`${API_BASE}/bookings`),
          fetchJson(`${API_BASE}/drivers`),
        ]);
        if (!mounted) return;
        setBookings(b || []);
        setDrivers(d || []);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const [b, d] = await Promise.all([
        fetchJson(`${API_BASE}/bookings`),
        fetchJson(`${API_BASE}/drivers`),
      ]);
      setBookings(b || []);
      setDrivers(d || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  // Derived analytics
  const analytics = useMemo(() => {
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(
      (b) => b.status === "completed"
    ).length;
    const activeBookings = bookings.filter(
      (b) => b.status === "active"
    ).length;
    const cancelledBookings = bookings.filter(
      (b) => b.status === "cancelled"
    ).length;

    const activeDrivers = drivers.filter((d) => d.status === "active").length;
    const pendingDrivers = drivers.filter((d) => d.status === "pending").length;

    // Simple revenue estimate: 1000 per completed booking
    const revenueEstimate = completedBookings * 1000;

    // City counts from pickupLocation if present
    const cityMap = {};
    for (const b of bookings) {
      const pickup = b.pickupLocation || b.pickup || "";
      const city = typeof pickup === "string" ? pickup.split(",")[0] : pickup;
      if (!city) continue;
      cityMap[city] = (cityMap[city] || 0) + 1;
    }
    const topCities = Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      totalBookings,
      completedBookings,
      activeBookings,
      cancelledBookings,
      activeDrivers,
      pendingDrivers,
      revenueEstimate,
      topCities,
    };
  }, [bookings, drivers]);

  // Booking filtering
  const filteredBookings = useMemo(() => {
    if (bookingFilter === "All") return bookings;
    if (bookingFilter === "Today") {
      return bookings.filter((b) => isToday(b.pickupTime || b.time));
    }
    if (bookingFilter === "Upcoming") {
      return bookings.filter((b) => isUpcoming(b.pickupTime || b.time));
    }
    if (bookingFilter === "Completed") {
      return bookings.filter((b) => b.status === "completed");
    }
    if (bookingFilter === "Cancelled") {
      return bookings.filter((b) => b.status === "cancelled");
    }
    return bookings;
  }, [bookings, bookingFilter]);

  // Local-only actions (wire to backend later)
  const updateBookingStatus = (id, status) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id || b._id === id ? { ...b, status } : b))
    );
  };

  const approveDriver = (id) => {
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === id || d._id === id ? { ...d, status: "active" } : d
      )
    );
  };

  const deactivateDriver = (id) => {
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === id || d._id === id ? { ...d, status: "inactive" } : d
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-slate-900/80 border-r border-slate-800">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="text-lg font-semibold tracking-tight">
            Shify<span className="text-emerald-400"></span> Admin
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Operations control center
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <div className="px-3 py-2 rounded-lg bg-slate-800/80 text-emerald-300 font-medium flex items-center justify-between">
            <span>Dashboard</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
              LIVE
            </span>
          </div>
          <button className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/80">
            Bookings
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/80">
            Drivers
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/80">
            Analytics
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/80">
            Settings
          </button>
        </nav>
        <div className="px-4 py-4 border-t border-slate-800 text-xs text-slate-400">
          Built for <span className="text-slate-200">shift‑T</span> ops
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div>
            <h1 className="text-lg md:text-xl font-semibold">
              Admin Dashboard
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Live overview of bookings and drivers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs md:text-sm rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-xs font-semibold">
              SA
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6 space-y-6">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-sm text-rose-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-slate-400">Loading dashboard…</div>
          ) : (
            <>
              {/* KPI cards */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KpiCard
                  label="Total bookings"
                  value={analytics.totalBookings}
                  sub={`${analytics.completedBookings} completed / ${analytics.cancelledBookings} cancelled`}
                />
                <KpiCard
                  label="Revenue estimate"
                  value={`₹${analytics.revenueEstimate.toLocaleString()}`}
                  sub="Based on completed trips"
                />
                <KpiCard
                  label="Active drivers"
                  value={analytics.activeDrivers}
                  sub={`${analytics.pendingDrivers} pending approval`}
                />
                <KpiCard
                  label="Active trips"
                  value={analytics.activeBookings}
                  sub="Now in progress"
                />
              </section>

              {/* Top cities + utilization */}
              <section className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <h2 className="text-sm font-semibold mb-3">
                    Top cities by trips
                  </h2>
                  {analytics.topCities.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No city data available yet.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {analytics.topCities.map(([city, count]) => (
                        <li
                          key={city}
                          className="flex items-center justify-between"
                        >
                          <span className="text-slate-200">{city}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {count} trips
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <h2 className="text-sm font-semibold mb-3">
                    Driver utilization
                  </h2>
                  <p className="text-xs text-slate-400 mb-2">
                    This is a simple ratio of active drivers vs total.
                  </p>
                  <UtilizationBar
                    active={analytics.activeDrivers}
                    total={drivers.length}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    {analytics.activeDrivers} active / {drivers.length} total
                    drivers
                  </p>
                </div>
              </section>

              {/* Bookings + Drivers */}
              <section className="grid lg:grid-cols-3 gap-4">
                {/* Bookings */}
                <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Bookings</h2>
                    <div className="flex flex-wrap gap-1">
                      {bookingFilters.map((f) => (
                        <button
                          key={f}
                          onClick={() => setBookingFilter(f)}
                          className={`px-2 py-1 text-[11px] rounded-full border ${
                            bookingFilter === f
                              ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/50"
                              : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto -mx-2 md:mx-0">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                          <th className="py-2 px-2">Customer</th>
                          <th className="py-2 px-2">Route</th>
                          <th className="py-2 px-2">Time</th>
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-4 px-2 text-slate-500 text-center"
                            >
                              No bookings for this filter.
                            </td>
                          </tr>
                        ) : (
                          filteredBookings.map((b) => {
                            const id = b.id || b._id;
                            const from = b.pickupLocation || b.pickup || "Unknown";
                            const to = b.dropLocation || b.drop || "Unknown";
                            const t = b.pickupTime || b.time;
                            const status =
                              b.status || (isUpcoming(t) ? "active" : "pending");
                            const badgeClass =
                              statusBadgeClasses[status] ||
                              "bg-slate-700 text-slate-200 border-slate-500/40";

                            return (
                              <tr
                                key={id}
                                className="border-b border-slate-900/60 last:border-0"
                              >
                                <td className="py-2 px-2">
                                  <div className="font-medium text-slate-100">
                                    {b.name || b.customerName || "Unknown"}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {b.phone || b.customerPhone || "N/A"}
                                  </div>
                                </td>
                                <td className="py-2 px-2">
                                  <div className="text-[11px] text-slate-300">
                                    {from} <span className="text-slate-500">→</span>{" "}
                                    {to}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-[11px] text-slate-300">
                                  {formatDateTime(t)}
                                </td>
                                <td className="py-2 px-2">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border ${badgeClass}`}
                                  >
                                    {status}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        updateBookingStatus(id, "completed")
                                      }
                                      className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25"
                                    >
                                      Complete
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateBookingStatus(id, "cancelled")
                                      }
                                      className="px-2 py-0.5 text-[11px] rounded-full bg-rose-500/10 text-rose-200 border border-rose-500/40 hover:bg-rose-500/20"
                                    >
                                      Cancel
                                    </button>
                                    <button className="px-2 py-0.5 text-[11px] rounded-full bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700">
                                      Reassign
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Drivers */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Drivers</h2>
                    <span className="text-[11px] text-slate-400">
                      {drivers.length} total
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {drivers.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No drivers found yet.
                      </p>
                    ) : (
                      drivers.map((d) => {
                        const id = d.id || d._id;
                        const s = d.status || "pending";
                        const badgeClass =
                          statusBadgeClasses[s] ||
                          "bg-slate-700 text-slate-200 border-slate-500/40";

                        return (
                          <div
                            key={id}
                            className="border border-slate-800 rounded-lg p-3 bg-slate-950/50"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <div className="text-sm font-medium text-slate-100">
                                  {d.name || "Unnamed driver"}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {d.city || "Unknown city"} ·{" "}
                                  {d.phone || "No phone"}
                                </div>
                              </div>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border ${badgeClass}`}
                              >
                                {s}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="text-[11px] text-slate-400">
                                Fleet: {d.fleetSize || "-"} · Trucks:{" "}
                                {d.truckTypes || "-"}
                              </div>
                              <div className="inline-flex items-center gap-1">
                                {s === "pending" && (
                                  <button
                                    onClick={() => approveDriver(id)}
                                    className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25"
                                  >
                                    Approve
                                  </button>
                                )}
                                {s === "active" && (
                                  <button
                                    onClick={() => deactivateDriver(id)}
                                    className="px-2 py-0.5 text-[11px] rounded-full bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700"
                                  >
                                    Deactivate
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// Small components

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-semibold text-slate-50">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function UtilizationBar({ active, total }) {
  const ratio = total > 0 ? Math.min(1, active / total) : 0;
  const pct = Math.round(ratio * 100);
  return (
    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-emerald-400 to-sky-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
