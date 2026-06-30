// src/AdminPage.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  let data = [];
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const formatDateTime = (iso) => {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleString();
};

const STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  assigned: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  accepted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  on_trip: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  completed: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  cancelled: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  inactive: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

const BOOKING_FILTERS = ["All", "Pending", "Assigned", "Accepted", "On Trip", "Completed", "Cancelled"];

export default function AdminPage() {
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [bookingFilter, setBookingFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [assignModal, setAssignModal] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const loadData = async () => {
    const [b, d] = await Promise.all([
      fetchJson(`${API_BASE}/bookings`),
      fetchJson(`${API_BASE}/drivers`),
    ]);
    setBookings(b || []);
    setDrivers(d || []);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
    const interval = setInterval(() => loadData().catch(console.error), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(id);
      await fetchJson(`${API_BASE}/drivers/${id}/approve`, { method: "PATCH" });
      await loadData();
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setActionLoading("");
    }
  };

  const handleDeactivate = async (id) => {
    try {
      setActionLoading(id);
      await fetchJson(`${API_BASE}/drivers/${id}/deactivate`, { method: "PATCH" });
      await loadData();
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setActionLoading("");
    }
  };

  const handleBookingStatus = async (id, status) => {
    try {
      setActionLoading(id);
      await fetchJson(`${API_BASE}/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setActionLoading("");
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriverId || !assignModal) return;
    try {
      setActionLoading(assignModal.id);
      await fetchJson(`${API_BASE}/bookings/${assignModal.id}/assign-driver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: selectedDriverId }),
      });
      setAssignModal(null);
      setSelectedDriverId("");
      await loadData();
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setActionLoading("");
    }
  };

  const analytics = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const active = bookings.filter((b) => ["accepted", "assigned", "on_trip"].includes(b.status)).length;
    const cancelled = bookings.filter((b) => b.status === "cancelled").length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const onTrip = bookings.filter((b) => b.status === "on_trip").length;
    const activeDrivers = drivers.filter((d) => d.status === "active").length;
    const pendingDrivers = drivers.filter((d) => d.status === "pending").length;
    const revenue = completed * 1000;
    const cityMap = {};
    for (const b of bookings) {
      const city = (b.pickup || "").split(",")[0].trim();
      if (city) cityMap[city] = (cityMap[city] || 0) + 1;
    }
    const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total, completed, active, cancelled, pending, onTrip, activeDrivers, pendingDrivers, revenue, topCities };
  }, [bookings, drivers]);

  const filteredBookings = useMemo(() => {
    let result = bookings;
    if (bookingFilter !== "All") {
      const filterMap = {
        "Pending": "pending", "Assigned": "assigned", "Accepted": "accepted",
        "On Trip": "on_trip", "Completed": "completed", "Cancelled": "cancelled",
      };
      result = result.filter((b) => b.status === filterMap[bookingFilter]);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.phone || "").includes(q) ||
        (b.pickup || "").toLowerCase().includes(q) ||
        (b.drop_location || "").toLowerCase().includes(q) ||
        (b.vehicle_type || "").toLowerCase().includes(q) ||
        (b.status || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [bookings, bookingFilter, searchQuery]);

  const navItems = [
    { key: "dashboard", label: "Dashboard", badge: null },
    { key: "bookings", label: "Bookings", badge: analytics.pending > 0 ? analytics.pending : null },
    { key: "drivers", label: "Drivers", badge: analytics.pendingDrivers > 0 ? analytics.pendingDrivers : null },
    { key: "analytics", label: "Analytics", badge: null },
  ];

  const handleNavClick = (key) => {
    setActiveSection(key);
    setMobileSidebarOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="text-lg font-bold tracking-tight">
          Shifty <span className="text-emerald-400">Admin</span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5">Operations center</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => handleNavClick(item.key)}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between ${
              activeSection === item.key
                ? "bg-slate-800 text-emerald-300 font-medium"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <span className="capitalize">{item.key}</span>
            {item.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-500">
        Shifty v1.0 — Auto-refreshes every 30s
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">

      <aside className="hidden md:flex md:flex-col w-60 bg-slate-900/80 border-r border-slate-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {mobileSidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="font-bold text-white">Menu</span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">

        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-800 bg-slate-950 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-300 bg-slate-900"
            >
              ☰
            </button>
            <div>
              <h1 className="text-base md:text-lg font-semibold capitalize">{activeSection}</h1>
              <p className="text-xs text-slate-400 hidden md:block">
                {bookings.length} bookings · {drivers.length} drivers · auto-refreshing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800"
            >
              {refreshing ? "..." : "↻ Refresh"}
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-xs font-bold">
              SA
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-sm text-rose-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-slate-400">Loading dashboard…</p>
            </div>
          ) : (
            <>
              {activeSection === "dashboard" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <KpiCard label="Total Bookings" value={analytics.total} sub={`${analytics.pending} pending`} color="blue" />
                    <KpiCard label="Revenue Est." value={`₹${analytics.revenue.toLocaleString()}`} sub={`${analytics.completed} completed`} color="green" />
                    <KpiCard label="Active Drivers" value={analytics.activeDrivers} sub={`${analytics.pendingDrivers} awaiting`} color="yellow" />
                    <KpiCard label="On Trip Now" value={analytics.onTrip} sub={`${analytics.active} active`} color="purple" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <h2 className="text-sm font-semibold mb-3">Booking Status</h2>
                      <div className="space-y-2">
                        {[
                          { label: "Pending", value: analytics.pending, color: "bg-yellow-400" },
                          { label: "Active", value: analytics.active, color: "bg-emerald-400" },
                          { label: "On Trip", value: analytics.onTrip, color: "bg-purple-400" },
                          { label: "Completed", value: analytics.completed, color: "bg-sky-400" },
                          { label: "Cancelled", value: analytics.cancelled, color: "bg-rose-400" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-3 text-xs">
                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-slate-300 w-16">{item.label}</span>
                            <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                              <div
                                className={`h-full rounded-full ${item.color}`}
                                style={{ width: analytics.total > 0 ? `${(item.value / analytics.total) * 100}%` : "0%" }}
                              />
                            </div>
                            <span className="text-slate-400 w-4 text-right">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <h2 className="text-sm font-semibold mb-3">Top Pickup Areas</h2>
                      {analytics.topCities.length === 0 ? (
                        <p className="text-xs text-slate-400">No data yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {analytics.topCities.map(([city, count]) => (
                            <div key={city} className="flex justify-between text-xs">
                              <span className="text-slate-200 capitalize">{city}</span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{count} trips</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <h2 className="text-sm font-semibold mb-3">Recent Bookings</h2>
                    <div className="space-y-2">
                      {bookings.slice(0, 5).map((b) => (
                        <div key={b.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/50 last:border-0">
                          <div>
                            <span className="text-white font-medium">{b.name}</span>
                            <span className="text-slate-400 ml-2">{b.pickup} → {b.drop_location}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] ${STATUS_COLORS[b.status] || ""}`}>
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "bookings" && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold">
                      Bookings ({filteredBookings.length}{searchQuery && ` of ${bookings.length}`})
                    </h2>
                  </div>

                  <div className="mb-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                      <input
                        type="text"
                        placeholder="Search by name, phone, area..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {BOOKING_FILTERS.map((f) => (
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

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                          <th className="py-2 px-2">Customer</th>
                          <th className="py-2 px-2">Route</th>
                          <th className="py-2 px-2 hidden md:table-cell">Vehicle</th>
                          <th className="py-2 px-2 hidden md:table-cell">Time</th>
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">No bookings found.</td>
                          </tr>
                        ) : (
                          filteredBookings.map((b) => (
                            <tr key={b.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30">
                              <td className="py-2 px-2">
                                <div className="font-medium text-white">{b.name}</div>
                                <div className="text-slate-400">+91{b.phone}</div>
                              </td>
                              <td className="py-2 px-2 text-slate-300 max-w-[120px] truncate">{b.pickup} → {b.drop_location}</td>
                              <td className="py-2 px-2 text-slate-300 hidden md:table-cell">{b.vehicle_type}</td>
                              <td className="py-2 px-2 text-slate-300 hidden md:table-cell">{b.booking_time}</td>
                              <td className="py-2 px-2">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] ${STATUS_COLORS[b.status] || ""}`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex justify-end gap-1 flex-wrap">
                                  {b.status === "pending" && (
                                    <button
                                      onClick={() => { setAssignModal(b); setSelectedDriverId(""); }}
                                      className="px-2 py-0.5 text-[11px] rounded-full bg-blue-500/15 text-blue-200 border border-blue-500/40 hover:bg-blue-500/25"
                                    >
                                      Assign
                                    </button>
                                  )}
                                  {!["completed", "cancelled"].includes(b.status) && (
                                    <>
                                      <button
                                        onClick={() => handleBookingStatus(b.id, "completed")}
                                        disabled={actionLoading === b.id}
                                        className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 disabled:opacity-50"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={() => handleBookingStatus(b.id, "cancelled")}
                                        disabled={actionLoading === b.id}
                                        className="px-2 py-0.5 text-[11px] rounded-full bg-rose-500/10 text-rose-200 border border-rose-500/40 disabled:opacity-50"
                                      >
                                        ✕
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSection === "drivers" && (
                <div className="space-y-4">
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span className="text-yellow-300 font-medium">{analytics.pendingDrivers} pending</span>
                    <span>·</span>
                    <span className="text-emerald-300 font-medium">{analytics.activeDrivers} active</span>
                    <span>·</span>
                    <span>{drivers.length} total</span>
                  </div>

                  <div className="grid gap-3">
                    {drivers.length === 0 ? (
                      <p className="text-sm text-slate-400">No drivers registered yet.</p>
                    ) : (
                      drivers.map((d) => (
                        <div key={d.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-white">{d.name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                📍 {d.city} · 📞 +91{d.phone}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                🚛 {d.truck_types || "N/A"}
                              </div>
                              {d.driving_license_no && (
                                <div className="text-xs text-slate-500 mt-0.5">
                                  🪪 {d.driving_license_no}
                                </div>
                              )}
                              {d.aadhar_number && (
                                <div className="text-xs text-slate-500 mt-0.5">
                                  🆔 ****{d.aadhar_number.slice(-4)}
                                </div>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 text-[11px] rounded-full border ${STATUS_COLORS[d.status] || ""}`}>
                              {d.status}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            {d.status === "pending" && (
                              <button
                                onClick={() => handleApprove(d.id)}
                                disabled={actionLoading === d.id}
                                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
                              >
                                {actionLoading === d.id ? "..." : "✅ Approve"}
                              </button>
                            )}
                            {d.status === "active" && (
                              <button
                                onClick={() => handleDeactivate(d.id)}
                                disabled={actionLoading === d.id}
                                className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 disabled:opacity-50"
                              >
                                {actionLoading === d.id ? "..." : "Deactivate"}
                              </button>
                            )}
                            {d.status === "inactive" && (
                              <button
                                onClick={() => handleApprove(d.id)}
                                disabled={actionLoading === d.id}
                                className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50"
                              >
                                {actionLoading === d.id ? "..." : "Reactivate"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeSection === "analytics" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <h2 className="text-sm font-semibold mb-4">Booking Overview</h2>
                    <div className="space-y-3 text-sm">
                      {[
                        { label: "Total Bookings", value: analytics.total },
                        { label: "Pending", value: analytics.pending },
                        { label: "Active", value: analytics.active },
                        { label: "On Trip", value: analytics.onTrip },
                        { label: "Completed", value: analytics.completed },
                        { label: "Cancelled", value: analytics.cancelled },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between border-b border-slate-800/50 pb-2 last:border-0">
                          <span className="text-slate-400">{item.label}</span>
                          <span className="text-white font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <h2 className="text-sm font-semibold mb-4">Revenue & Drivers</h2>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-slate-800/50 pb-2">
                        <span className="text-slate-400">Revenue Estimate</span>
                        <span className="text-emerald-400 font-semibold">₹{analytics.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/50 pb-2">
                        <span className="text-slate-400">Active Drivers</span>
                        <span className="text-white font-medium">{analytics.activeDrivers}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/50 pb-2">
                        <span className="text-slate-400">Pending Approval</span>
                        <span className="text-yellow-300 font-medium">{analytics.pendingDrivers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Drivers</span>
                        <span className="text-white font-medium">{drivers.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 md:col-span-2">
                    <h2 className="text-sm font-semibold mb-3">Driver Utilization</h2>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-sky-500 rounded-full"
                        style={{ width: drivers.length > 0 ? `${(analytics.activeDrivers / drivers.length) * 100}%` : "0%" }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {analytics.activeDrivers} active out of {drivers.length} total drivers
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Assign Driver</h2>
            <div className="bg-slate-800 rounded-lg p-3 text-xs space-y-1">
              <div className="text-white font-medium">{assignModal.name}</div>
              <div className="text-slate-400">{assignModal.pickup} → {assignModal.drop_location}</div>
              <div className="text-slate-400">{assignModal.vehicle_type}</div>
            </div>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select an active driver</option>
              {drivers.filter((d) => d.status === "active").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.city} ({d.truck_types || "N/A"})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAssignDriver}
                disabled={!selectedDriverId || actionLoading === assignModal.id}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold"
              >
                {actionLoading === assignModal.id ? "Assigning..." : "Assign & Notify"}
              </button>
              <button
                onClick={() => { setAssignModal(null); setSelectedDriverId(""); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  const colors = {
    blue: "border-blue-500/20",
    green: "border-emerald-500/20",
    yellow: "border-yellow-500/20",
    purple: "border-purple-500/20",
  };
  return (
    <div className={`bg-slate-900/60 border ${colors[color] || "border-slate-800"} rounded-xl p-4`}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-xl md:text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}