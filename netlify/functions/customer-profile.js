const { getSupabaseAdmin } = require("./_lib/supabase");

const headers = { "Content-Type": "application/json" };

exports.handler = async (event) => {
  if (!["GET", "PUT"].includes(event.httpMethod)) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Missing auth token" }) };
    }

    const supabase = getSupabaseAdmin();
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const authUser = userData.user;

    const { data: existingCustomer, error: existingError } = await supabase
      .from("customers")
      .select("id, auth_user_id, full_name, phone, email, address_line_1, address_line_2, city, state, pincode, created_at")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ customer: existingCustomer || null, user: { email: authUser.email || "" } })
      };
    }

    const payload = JSON.parse(event.body || "{}");
    const fallbackPhone = existingCustomer?.phone || `auth-${authUser.id.slice(0, 12)}`;
    const customerPayload = {
      auth_user_id: authUser.id,
      full_name: payload.fullName || existingCustomer?.full_name || authUser.user_metadata?.full_name || "Customer",
      phone: payload.phone || fallbackPhone,
      email: authUser.email || payload.email || existingCustomer?.email || null,
      address_line_1: payload.addressLine1 || existingCustomer?.address_line_1 || null,
      address_line_2: payload.addressLine2 || existingCustomer?.address_line_2 || null,
      city: payload.city || existingCustomer?.city || null,
      state: payload.state || existingCustomer?.state || null,
      pincode: payload.pincode || existingCustomer?.pincode || null
    };

    const { data, error } = await supabase
      .from("customers")
      .upsert(customerPayload, { onConflict: "auth_user_id" })
      .select("id, auth_user_id, full_name, phone, email, address_line_1, address_line_2, city, state, pincode")
      .single();

    if (error) throw error;

    return { statusCode: 200, headers, body: JSON.stringify({ customer: data }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
