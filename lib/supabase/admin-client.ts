import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using the service-role key.
 * This bypasses Row Level Security entirely — only use in trusted server-side admin routes.
 * Never expose this client or its key to the browser.
 */
export function createAdminServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
