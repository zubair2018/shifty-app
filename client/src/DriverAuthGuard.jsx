// client/src/DriverAuthGuard.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { Navigate } from "react-router-dom";

export default function DriverAuthGuard({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Checking auth...
      </div>
    );
  }

  if (!user) return <Navigate to="/driver/login" replace />;

  return children;
}