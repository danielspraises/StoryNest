import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://nwqzdjlyvycnmvmcgiwb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KYxVsa7jlf4xEKJ_MbXS1Q_Ez5evsW9";

if (
  SUPABASE_URL.includes("YOUR_SUPABASE") ||
  SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE")
) {
  console.warn("Add your Supabase URL and publishable key in js/supabase.js.");
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_SUPABASE") &&
  !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE");
