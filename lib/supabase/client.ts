import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database.types";

export function createClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Gracefully handle placeholder / invalid env variables during Next.js static build phase
  if (!url || url.includes("your_supabase") || !url.startsWith("http")) {
    url = "https://placeholder-project.supabase.co";
  }
  if (!key || key.includes("your_supabase")) {
    key = "placeholder-anon-key";
  }

  return createBrowserClient<Database>(url, key);
}
