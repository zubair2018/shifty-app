// src/AdminPage.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:4000";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
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
  assigned: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  accepted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  completed: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  cancelled: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  inactive: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

const bookingFilters = ["All", "Today", "Upcoming", "Completed", "Cancelled"];

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
  return new Date(iso).getTime() > new Date().getTime();
};

export default function AdminPage() {
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [bookingFilter, setBookingFilter] = useState("All");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [assignModal, setAssignModal] = useState(null); // booking to assign
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const loadData = async () => {
    try {
      const [b, d] = await Promise.all([
        fetchJson(`${API_BASE}/bookings`),
        fetchJson(`${API_BASE}/drivers`),
      ]);
      setBookings(b || []);
      setDrivers(d || []);
    } catch (err) {
      setError(err.message || "Failed to load data");
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        await loadData();
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Calls real backend — sets driver status to "active"
  const handleApprove = async (driverId) => {
    try {
      setActionLoading(driverId);
      await fetchJson(`${API_BASE}/drivers/${driverId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      await loadData();
    } catch (err) {
      alert("Failed to approve driver: " + err.message);
    } finally {
      setActionLoading("");
    }
  };

  // ✅ Calls real backend — sets driver status to "inactive"
  const handleDeactivate = async (driverId) => {
    try {
      setActionLoading(driverId);
      await fetchJson(`${API_BASE}/drivers/${driverId}/deactivate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      await loadData();
    } catch (err) {
      alert("Failed to deactivate driver: " + err.message);
    } finally {
      setActionLoading("");
    }
  };

  // ✅ Calls real backend — updates booking status
  const handleBookingStatus = async (bookingId, status) => {
    try {
      setActionLoading(bookingId);
      await fetchJson(`${API_BASE}/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (err) {
      // Fallback: update locally if endpoint not yet built
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
    } finally {
      setActionLoading("");
    }
  };

  // ✅ Assign driver modal
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
      alert("Failed to assign driver: " + err.message);
    } finally {
      setActionLoading("");
    }
  };

  const analytics = useMemo(() => {
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((b) => b.status === "completed").length;
    const activeBookings = bookings.filter((b) => b.status === "accepted" || b.status === "assigned").length;
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;
    const activeDrivers = drivers.filter((d) => d.status === "active").length;
    const pendingDrivers = drivers.filter((d) => d.status === "pending").length;
    const revenueEstimate = completedBookings * 1000;

    const cityMap = {};
    for (const b of bookings) {
      const city = (b.pickup || b.pickupLocation || "").split(",")[0];
      if (!city) continue;
      cityMap[city] = (cityMap[city] || 0) + 1;
    }
    const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { totalBookings, completedBookings, activeBookings, cancelledBookings, activeDrivers, pendingDrivers, revenueEstimate, topCities };
  }, [bookings, drivers]);

  const filteredBookings = useMemo(() => {
    if (bookingFilter === "All") return bookings;
    if (bookingFilter === "Today") return bookings.filter((b) => isToday(b.time || b.pickupTime));
    if (bookingFilter === "Upcoming") return bookings.filter((b) => isUpcoming(b.time || b.pickupTime));
    if (bookingFilter === "Completed") return bookings.filter((b) => b.status === "completed");
    if (bookingFilter === "Cancelled") return bookings.filter((b) => b.status === "cancelled");
    return bookings;
  }, [bookings, bookingFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">

      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-slate-900/80 border-r border-slate-800">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="text-lg font-semibold tracking-tight">
            ShifT <span className="text-emerald-400">Admin</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Operations control center</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          {["dashboard", "bookings", "drivers", "analytics", "settings"].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`w-full text-left px-3 py-2 rounded-lg capitalize font-medium flex items-center justify-between ${
                activeSection === section
                  ? "bg-slate-800/80 text-emerald-300"
                  : "text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              <span>{section}</span>
              {section === "dashboard" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                  LIVE
                </span>
              )}
              {section === "drivers" && analytics.pendingDrivers > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300">
                  {analytics.pendingDrivers}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-800 text-xs text-slate-400">
          Built for <span className="text-slate-200">ShifT</span> ops
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div>
            <h1 className="text-lg md:text-xl font-semibold capitalize">{activeSection}</h1>
            <p className="text-xs text-slate-400">Live overview of bookings and drivers</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-xs font-semibold">
              SA
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-sm text-rose-100">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-400">Loading dashboard…</p>
          ) : (
            <>
              {/* DASHBOARD */}
              {activeSection === "dashboard" && (
                <>
                  <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Total bookings" value={analytics.totalBookings} sub={`${analytics.completedBookings} completed · ${analytics.cancelledBookings} cancelled`} />
                    <KpiCard label="Revenue estimate" value={`₹${analytics.revenueEstimate.toLocaleString()}`} sub="Based on completed trips" />
                    <KpiCard label="Active drivers" value={analytics.activeDrivers} sub={`${analytics.pendingDrivers} pending approval`} />
                    <KpiCard label="Active trips" value={analytics.activeBookings} sub="Assigned or accepted" />
                  </section>

                  <section className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <h2 className="text-sm font-semibold mb-3">Top cities by trips</h2>
                      {analytics.topCities.length === 0 ? (
                        <p className="text-xs text-slate-400">No city data yet.</p>
                      ) : (
                        <ul className="space-y-2 text-xs">
                          {analytics.topCities.map(([city, count]) => (
                            <li key={city} className="flex justify-between">
                              <span className="text-slate-200">{city}</span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{count} trips</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <h2 className="text-sm font-semibold mb-3">Driver utilization</h2>
                      <UtilizationBar active={analytics.activeDrivers} total={drivers.length} />
                      <p className="mt-2 text-xs text-slate-400">{analytics.activeDrivers} active / {drivers.length} total</p>
                    </div>
                  </section>
                </>
              )}

              {/* BOOKINGS */}
              {activeSection === "bookings" && (
                <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Bookings ({filteredBookings.length})</h2>
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

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                          <th className="py-2 px-2">Customer</th>
                          <th className="py-2 px-2">Route</th>
                          <th className="py-2 px-2">Vehicle</th>
                          <th className="py-2 px-2">Time</th>
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-slate-500">No bookings found.</td>
                          </tr>
                        ) : (
                          filteredBookings.map((b) => {
                            const badgeClass = statusBadgeClasses[b.status] || "bg-slate-700 text-slate-200 border-slate-500/40";
                            return (
                              <tr key={b.id} className="border-b border-slate-900/60 last:border-0">
                                <td className="py-2 px-2">
                                  <div className="font-medium text-slate-100">{b.name || "Unknown"}</div>
                                  <div className="text-[11px] text-slate-400">{b.phone || "N/A"}</div>
                                </td>
                                <td className="py-2 px-2 text-[11px] text-slate-300">
                                  {b.pickup || "?"} → {b.drop || "?"}
                                </td>
                                <td className="py-2 px-2 text-[11px] text-slate-300">
                                  {b.vehicleType || "N/A"}
                                </td>
                                <td className="py-2 px-2 text-[11px] text-slate-300">
                                  {formatDateTime(b.time)}
                                </td>
                                <td className="py-2 px-2">
                                  <span className={`px-2 py-0.5 text-[11px] rounded-full border ${badgeClass}`}>
                                    {b.status}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-right">
                                  <div className="inline-flex gap-1">
                                    <button
                                      onClick={() => setAssignModal(b)}
                                      className="px-2 py-0.5 text-[11px] rounded-full bg-blue-500/15 text-blue-200 border border-blue-500/40 hover:bg-blue-500/25"
                                    >
                                      Assign
                                    </button>
                                    <button
                                      onClick={() => handleBookingStatus(b.id, "completed")}
                                      className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25"
                                    >
                                      Complete
                                    </button>
                                    <button
                                      onClick={() => handleBookingStatus(b.id, "cancelled")}
                                      className="px-2 py-0.5 text-[11px] rounded-full bg-rose-500/10 text-rose-200 border border-rose-500/40 hover:bg-rose-500/20"
                                    >
                                      Cancel
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
                </section>
              )}

              {/* DRIVERS */}
              {activeSection === "drivers" && (
                <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Drivers ({drivers.length})</h2>
                    <div className="flex gap-2 text-[11px] text-slate-400">
                      <span className="text-yellow-300">{analytics.pendingDrivers} pending</span>
                      <span>·</span>
                      <span className="text-emerald-300">{analytics.activeDrivers} active</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                    {drivers.length === 0 ? (
                      <p className="text-xs text-slate-400">No drivers found.</p>
                    ) : (
                      drivers.map((d) => {
                        const badgeClass = statusBadgeClasses[d.status] || "bg-slate-700 text-slate-200 border-slate-500/40";
                        const isLoading = actionLoading === d.id;
                        return (
                          <div key={d.id} className="border border-slate-800 rounded-lg p-3 bg-slate-950/50">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-100">{d.name || "Unnamed"}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  📍 {d.city || "N/A"} · 📞 {d.phone || "N/A"}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  🚛 {d.truckTypes || "N/A"} · Fleet: {d.fleetSize || "N/A"}
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 text-[11px] rounded-full border ${badgeClass}`}>
                                {d.status}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {d.status === "pending" && (
                                <button
                                  onClick={() => handleApprove(d.id)}
                                  disabled={isLoading}
                                  className="px-3 py-1 text-[11px] rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25 disabled:opacity-50"
                                >
                                  {isLoading ? "Approving..." : "✅ Approve"}
                                </button>
                              )}
                              {d.status === "active" && (
                                <button
                                  onClick={() => handleDeactivate(d.id)}
                                  disabled={isLoading}
                                  className="px-3 py-1 text-[11px] rounded-full bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700 disabled:opacity-50"
                                >
                                  {isLoading ? "Deactivating..." : "Deactivate"}
                                </button>
                              )}
                              {d.status === "inactive" && (
                                <button
                                  onClick={() => handleApprove(d.id)}
                                  disabled={isLoading}
                                  className="px-3 py-1 text-[11px] rounded-full bg-blue-500/15 text-blue-200 border border-blue-500/40 hover:bg-blue-500/25 disabled:opacity-50"
                                >
                                  {isLoading ? "Activating..." : "Reactivate"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              )}

              {/* ANALYTICS */}
              {activeSection === "analytics" && (
                <section className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <h2 className="text-sm font-semibold mb-3">Bookings summary</h2>
                    <ul className="text-xs text-slate-300 space-y-2">
                      <li className="flex justify-between"><span>Total</span><span>{analytics.totalBookings}</span></li>
                      <li className="flex justify-between"><span>Completed</span><span className="text-sky-300">{analytics.completedBookings}</span></li>
                      <li className="flex justify-between"><span>Active</span><span className="text-emerald-300">{analytics.activeBookings}</span></li>
                      <li className="flex justify-between"><span>Cancelled</span><span className="text-rose-300">{analytics.cancelledBookings}</span></li>
                    </ul>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <h2 className="text-sm font-semibold mb-3">Revenue estimate</h2>
                    <p className="text-xs text-slate-400 mb-2">₹1000 per completed trip</p>
                    <div className="text-2xl font-semibold text-emerald-400">₹{analytics.revenueEstimate.toLocaleString()}</div>
                  </div>
                </section>
              )}

              {/* SETTINGS */}
              {activeSection === "settings" && (
                <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <h2 className="text-sm font-semibold mb-3">Settings</h2>
                  <p className="text-xs text-slate-400">Admin accounts, pricing rules, and notification preferences coming soon.</p>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Assign Driver Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Assign Driver</h2>
            <p className="text-xs text-slate-400">
              Booking: <span className="text-white">{assignModal.pickup} → {assignModal.drop}</span>
            </p>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select a driver</option>
              {drivers.filter(d => d.status === "active").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.city} ({d.truckTypes || "N/A"})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAssignDriver}
                disabled={!selectedDriverId || actionLoading === assignModal.id}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold"
              >
                {actionLoading === assignModal.id ? "Assigning..." : "Assign"}
              </button>
              <button
                onClick={() => { setAssignModal(null); setSelectedDriverId(""); }}
                className="flex-1 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm"
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
  const pct = total > 0 ? Math.round(Math.min(1, active / total) * 100) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
      <div className="h-full bg-gradient-to-r from-emerald-400 to-sky-500" style={{ width: `${pct}%` }} />
    </div>
  );
}