import { useState } from "react";
import { createDriverApi } from "../api/drivers";


const PartnerModal = ({ onClose }) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    truckTypes: "",
    fleetSize: "",
    drivingLicenseNo: "",
    aadharNumber: "",
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  // basic required checks (adjust names to your state)
  if (!form.name || !form.phone || !form.city) {
    setError("Please fill all required fields.");
    return;
  }

  try {
    setStatus("loading");
    await createDriverApi(form);
    setStatus("success");
    setTimeout(() => {
      setStatus("idle");
      onClose && onClose();
    }, 1200);
  } catch (err) {
    console.error("Partner submit failed:", err);
    setStatus("error");
    setError("Could not submit details. Please try again.");
  }
};


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Partner with Shifty
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
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="City / base location"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
          />
          <input
            name="truckTypes"
            value={form.truckTypes}
            onChange={handleChange}
            placeholder="Truck types (e.g. 407, 1109, 32ft)"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
          />
          <input
            name="fleetSize"
            value={form.fleetSize}
            onChange={handleChange}
            placeholder="Approx. number of trucks"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
          />

          <input
            name="drivingLicenseNo"
            value={form.drivingLicenseNo}
            onChange={handleChange}
            placeholder="Driving license number"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
          />
          <input
            name="aadharNumber"
            value={form.aadharNumber}
            onChange={handleChange}
            placeholder="Aadhar number"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px]"
          />

          {error && (
            <p className="text-[11px] text-red-400">{error}</p>
          )}
          {status === "success" && (
            <p className="text-[11px] text-emerald-400">
              Thanks! Our team will reach out to you soon.
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-full bg-yellow-400 py-2 text-[12px] font-semibold text-slate-950 hover:bg-yellow-300 disabled:opacity-70"
          >
            {status === "loading" ? "Submitting..." : "Submit details"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PartnerModal;
