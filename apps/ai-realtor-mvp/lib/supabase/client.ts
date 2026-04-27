import { createClient } from "@supabase/supabase-js";
import { env } from "../config";

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

export const supabase = createClient(url ?? "https://placeholder.supabase.co", anon ?? "placeholder-key", {
  auth: { persistSession: false }
});
