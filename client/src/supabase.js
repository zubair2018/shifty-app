// client/src/supabase.js
import { createClient } from "@supabase/supabase-js";

// anon public key — safe to expose, protected by Row Level Security
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);