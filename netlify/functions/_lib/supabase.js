const { createClient } = require("@supabase/supabase-js");

function getSupabaseAdmin() {
  const url =
    process.env.NETLIFY_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

module.exports = { getSupabaseAdmin };
