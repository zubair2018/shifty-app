// src/DriverLoginPage.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "./firebase";

export default function DriverLoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);
  const navigate = useNavigate();

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch (e) {}
        recaptchaRef.current = null;
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const getRecaptcha = async () => {
    // Always destroy and recreate
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear(); } catch (e) {}
      recaptchaRef.current = null;
    }
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (e) {}
      window.recaptchaVerifier = null;
    }

    // Small delay to let DOM settle
    await new Promise((r) => setTimeout(r, 100));

    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        recaptchaRef.current = null;
        window.recaptchaVerifier = null;
      },
    });

    await verifier.render();
    recaptchaRef.current = verifier;
    window.recaptchaVerifier = verifier;
    return verifier;
  };

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
      const verifier = await getRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, verifier);
      confirmationRef.current = confirmation;
      setStep("otp");
    } catch (err) {
      console.error("OTP error:", err);
      if (err.code === "auth/invalid-app-credential") {
        setError("App credential error. Please refresh the page and try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (err.code === "auth/billing-not-enabled") {
        setError("Real OTP requires Firebase Blaze plan. Please upgrade.");
      } else {
        setError(err.message || "Failed to send OTP. Please try again.");
      }
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch (e) {}
        recaptchaRef.current = null;
        window.recaptchaVerifier = null;
      }
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
      await confirmationRef.current.confirm(otp);
      navigate("/driver");
    } catch (err) {
      console.error("Verify error:", err);
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-xl border border-gray-800">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">ShifT</h1>
          <p className="text-gray-400 mt-1">Driver Login</p>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm">
            {error}
          </div>
        )}

        {step === "phone" ? (
          <>
            <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
            <div className="flex mb-4">
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
                className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-r-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4">
              Use the number you registered with
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">
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
            </p>
            <label className="block text-sm text-gray-400 mb-1">Enter OTP</label>
            <input
              type="number"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
          </>
        )}

        {/* reCAPTCHA anchor — must always be in DOM */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}