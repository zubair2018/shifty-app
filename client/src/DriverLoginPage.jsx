// src/DriverLoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";

export default function DriverLoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    const fullPhone = `+91${digits}`;

    try {
      setLoading(true);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (otpError) {
        console.error("OTP send error:", otpError);
        setError(otpError.message || "Failed to send OTP. Please try again.");
        return;
      }

      setStep("otp");
    } catch (err) {
      console.error("OTP send error:", err);
      setError("Failed to send OTP. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      const digits = phone.replace(/\D/g, "");
      const fullPhone = `+91${digits}`;

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: "sms",
      });

      if (verifyError) {
        console.error("OTP verify error:", verifyError);
        setError("Invalid OTP. Please try again.");
        return;
      }

      const uid = data.user.id;

      // ✅ Check if this phone is a registered, active driver
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/drivers/by-phone/${digits}`
      );

      if (!res.ok) {
        await supabase.auth.signOut();
        setError("This number is not registered as a driver. Contact admin.");
        return;
      }

      const matched = await res.json();

      if (matched.status !== "active") {
        await supabase.auth.signOut();
        setError("Your account is not active yet. Contact admin.");
        return;
      }

      // Link auth_uid to driver record if not already linked
      if (!matched.auth_uid) {
        await fetch(
          `${import.meta.env.VITE_API_URL}/drivers/${matched.id}/link-auth`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ authUid: uid }),
          }
        );
      }

      navigate("/driver");
    } catch (err) {
      console.error("OTP verify error:", err);
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-xl border border-gray-800">

        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Shifty</h1>
          <p className="text-gray-400 mt-1 text-sm">Driver Login</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm">
            {error}
          </div>
        )}

        {step === "phone" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Phone Number
              </label>
              <div className="flex">
                <span className="bg-gray-700 border border-gray-600 border-r-0 rounded-l-lg px-3 flex items-center text-gray-300 text-sm font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(val);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-r-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use the number you registered with
              </p>
            </div>

            <button
              onClick={handleSendOtp}
              disabled={loading || phone.length !== 10}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition text-sm"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm">
              OTP sent to{" "}
              <span className="text-white font-medium">+91{phone}</span>.{" "}
              <button
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
                className="text-blue-400 hover:underline"
              >
                Change
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Enter OTP
              </label>
              <input
                type="number"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 text-center text-lg tracking-widest"
              />
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition text-sm"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}