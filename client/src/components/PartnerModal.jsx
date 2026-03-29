// src/components/PartnerModal.jsx
import { useState } from "react";
import { createDriverApi } from "../api/drivers";

const TRUCK_TYPES = [
  { value: "mini-truck", label: "Mini-truck" },
  { value: "tatamobile", label: "Tata Mobile" },
  { value: "factory-truck", label: "Factory Truck" },
];

function validateLicense(license) {
  const cleaned = license.replace(/[-\s]/g, "").toUpperCase();
  return /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/.test(cleaned);
}

function validateAadhar(aadhar) {
  const cleaned = aadhar.replace(/[-\s]/g, "");
  return /^[2-9]{1}[0-9]{11}$/.test(cleaned);
}

const PartnerModal = ({ onClose }) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    truckTypes: "",
    drivingLicenseNo: "",
    aadharNumber: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [submitError, setSubmitError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "phone") {
      processedValue = value.replace(/\D/g, "").slice(0, 10);
    }
    if (name === "aadharNumber") {
      processedValue = value.replace(/\D/g, "").slice(0, 12);
    }
    if (name === "drivingLicenseNo") {
      processedValue = value.toUpperCase().slice(0, 15);
    }

    setForm((prev) => ({ ...prev, [name]: processedValue }));

    // Live validation
    let error = "";
    if (name === "phone" && processedValue.length > 0 && processedValue.length < 10) {
      error = "Enter complete 10-digit number";
    }
    if (name === "drivingLicenseNo" && processedValue.length > 0 && !validateLicense(processedValue)) {
      error = "Invalid format. Example: KA0120201234567";
    }
    if (name === "aadharNumber" && processedValue.length > 0 && !validateAadhar(processedValue)) {
      error = "Must be 12 digits, not starting with 0 or 1";
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.phone || form.phone.length !== 10) newErrors.phone = "Valid 10-digit phone required";
    if (!form.city.trim()) newErrors.city = "Base area is required";
    if (!form.truckTypes) newErrors.truckTypes = "Please select truck type";
    if (form.drivingLicenseNo && !validateLicense(form.drivingLicenseNo)) {
      newErrors.drivingLicenseNo = "Invalid license format";
    }
    if (form.aadharNumber && !validateAadhar(form.aadharNumber)) {
      newErrors.aadharNumber = "Invalid Aadhaar number";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitError("Please fix the errors above.");
      return;
    }

    try {
      setStatus("loading");
      await createDriverApi(form);
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        onClose && onClose();
      }, 2000);
    } catch (err) {
      console.error("Partner submit failed:", err);
      setStatus("error");
      setSubmitError("Could not submit details. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Partner with ShifT</h2>
            <p className="text-[11px] text-slate-400">Register as a driver</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
        </div>

        {status === "success" ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">🎉</div>
            <p className="text-emerald-400 font-semibold">Registration Submitted!</p>
            <p className="text-slate-400 text-xs">
              Our team will review and activate your account soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2.5 text-[12px]">

            {/* Name */}
            <div>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name *"
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              {errors.name && <p className="text-red-400 text-[11px] mt-0.5">⚠️ {errors.name}</p>}
            </div>

            {/* Phone */}
            <div>
              <div className="flex">
                <span className="bg-slate-700 border border-slate-600 border-r-0 rounded-l-md px-3 flex items-center text-slate-300 text-[12px] font-medium">
                  +91
                </span>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="10-digit number *"
                  type="tel"
                  className="flex-1 rounded-r-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              {errors.phone && <p className="text-red-400 text-[11px] mt-0.5">⚠️ {errors.phone}</p>}
            </div>

            {/* Base Area */}
            <div>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Base area (city/town) *"
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              {errors.city && <p className="text-red-400 text-[11px] mt-0.5">⚠️ {errors.city}</p>}
            </div>

            {/* Truck Type */}
            <div>
              <select
                name="truckTypes"
                value={form.truckTypes}
                onChange={handleChange}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 text-[12px] focus:outline-none focus:border-blue-500"
              >
                <option value="">Select truck type *</option>
                {TRUCK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.truckTypes && <p className="text-red-400 text-[11px] mt-0.5">⚠️ {errors.truckTypes}</p>}
            </div>

            {/* Driving License */}
            <div>
              <input
                name="drivingLicenseNo"
                value={form.drivingLicenseNo}
                onChange={handleChange}
                placeholder="Driving license no. (e.g. KA0120201234567)"
                className={`w-full rounded-md bg-slate-950 border px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500 focus:outline-none focus:border-blue-500 ${
                  errors.drivingLicenseNo ? "border-red-500" : "border-slate-700"
                }`}
              />
              {errors.drivingLicenseNo
                ? <p className="text-red-400 text-[11px] mt-0.5">⚠️ {errors.drivingLicenseNo}</p>
                : <p className="text-slate-500 text-[10px] mt-0.5">State(2) + RTO(2) + Year(4) + No.(7)</p>
              }
            </div>

            {/* Aadhaar */}
            <div>
              <input
                name="aadharNumber"
                value={form.aadharNumber}
                onChange={handleChange}
                placeholder="Aadhaar number (12 digits)"
                type="tel"
                className={`w-full rounded-md bg-slate-950 border px-3 py-2 text-slate-100 text-[12px] placeholder:text-slate-500 focus:outline-none focus:border-blue-500 ${
                  errors.aadharNumber ? "border-red-500" : "border-slate-700"
                }`}
              />
              {errors.aadharNumber
                ? <p className="text-red-400 text-[11px] mt-0.5">⚠️ {errors.aadharNumber}</p>
                : <p className="text-slate-500 text-[10px] mt-0.5">12 digits, must not start with 0 or 1</p>
              }
            </div>

            {submitError && (
              <p className="text-[11px] text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-full bg-yellow-400 py-2 text-[12px] font-semibold text-slate-950 hover:bg-yellow-300 disabled:opacity-70 disabled:cursor-not-allowed transition"
            >
              {status === "loading" ? "Submitting..." : "Submit Details"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PartnerModal;