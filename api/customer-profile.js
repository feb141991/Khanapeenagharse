import { getSupabaseAdmin } from "./_lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!["GET", "PUT"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const supabase = getSupabaseAdmin();
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const authUser = userData.user;

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("customers")
        .select("id, auth_user_id, full_name, phone, email, address_line_1, address_line_2, city, state, pincode, created_at")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (error) throw error;
      return res.status(200).json({ customer: data || null, user: { email: authUser.email || "" } });
    }

    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const customerPayload = {
      auth_user_id: authUser.id,
      full_name: payload.fullName || authUser.user_metadata?.full_name || "Customer",
      phone: payload.phone || null,
      email: authUser.email || payload.email || null,
      address_line_1: payload.addressLine1 || null,
      address_line_2: payload.addressLine2 || null,
      city: payload.city || null,
      state: payload.state || null,
      pincode: payload.pincode || null
    };

    const { data, error } = await supabase
      .from("customers")
      .upsert(customerPayload, { onConflict: "auth_user_id" })
      .select("id, auth_user_id, full_name, phone, email, address_line_1, address_line_2, city, state, pincode")
      .single();

    if (error) throw error;

    return res.status(200).json({ customer: data });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
