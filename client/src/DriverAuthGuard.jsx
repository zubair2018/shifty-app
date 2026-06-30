// client/src/DriverAuthGuard.jsx
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Navigate } from "react-router-dom";

export default function DriverAuthGuard({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen for auth changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Checking auth...
      </div>
    );
  }

  if (!session) return <Navigate to="/driver/login" replace />;

  return children;
}