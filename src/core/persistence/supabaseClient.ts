// src/core/persistence/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";

const isBrowser = typeof window !== "undefined";
const nodeEnv = typeof process !== "undefined" ? process.env : undefined;

const supabaseUrl = (isBrowser
  ? (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  : (nodeEnv?.SUPABASE_URL ?? nodeEnv?.VITE_SUPABASE_URL)) as string | undefined;

const supabaseAnonKey = (isBrowser
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  : (nodeEnv?.SUPABASE_ANON_KEY ?? nodeEnv?.VITE_SUPABASE_ANON_KEY)) as string | undefined;

const supabaseServiceRoleKey = (!isBrowser
  ? (nodeEnv?.SUPABASE_SERVICE_ROLE_KEY ?? nodeEnv?.VITE_SUPABASE_SERVICE_ROLE_KEY)
  : undefined) as string | undefined;

const supabaseKey = isBrowser ? supabaseAnonKey : supabaseServiceRoleKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    [
      "[supabaseClient] Missing env vars.",
      "Create a .env file (or set in Vite env) with:",
      "VITE_SUPABASE_URL=... (browser) or SUPABASE_URL=... (node)",
      "VITE_SUPABASE_ANON_KEY=... (browser)",
      "SUPABASE_SERVICE_ROLE_KEY=... (node)",
    ].join("\n")
  );
}

/**
 * Single typed Supabase client for the app.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
    },
    global: {
      headers: {
        "x-client-info": isBrowser ? "simulatebg-web" : "simulatebg-worker",
      },
    },
  }
);

// Handy typed helpers
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
