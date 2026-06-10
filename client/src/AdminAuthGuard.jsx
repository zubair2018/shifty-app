// src/AdminAuthGuard.jsx
import { useState } from "react";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD 

export default function AdminAuthGuard({ children }) {
  const [entered, setEntered] = useState(
    sessionStorage.getItem("shifty_admin") === "true"
  );
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem("shifty_admin", "true");
      setEntered(true);
    } else {
      setError("Wrong password.");
      setPw("");
    }
  };

  if (entered) return children;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm border border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-1">Admin</h1>
        <p className="text-gray-400 text-sm mb-6">Enter admin password to continue</p>
        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 mb-4 text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg text-sm"
        >
          Login
        </button>
      </div>
    </div>
  );
}