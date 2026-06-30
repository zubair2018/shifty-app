// server/supabase.js
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

// service_role key bypasses Row Level Security — only used on backend, never expose this
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);