const { getSupabaseAdmin } = require("./_lib/supabase");

const headers = { "Content-Type": "application/json" };

async function getCustomer(supabase, event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return { error: { statusCode: 401, message: "Missing auth token" } };

  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) return { error: { statusCode: 401, message: "Unauthorized" } };

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, default_address_id, full_name, phone")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (error) throw error;
  return { customer };
}

exports.handler = async (event) => {
  if (!["GET", "POST", "PUT", "DELETE"].includes(event.httpMethod)) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const supabase = getSupabaseAdmin();
    const auth = await getCustomer(supabase, event);
    if (auth.error) return { statusCode: auth.error.statusCode, headers, body: JSON.stringify({ error: auth.error.message }) };
    const { customer } = auth;

    if (event.httpMethod === "GET") {
      const { data, error } = await supabase.from("addresses").select("*").eq("customer_id", customer.id).order("is_default", { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ addresses: data || [] }) };
    }

    if (event.httpMethod === "POST") {
      const payload = JSON.parse(event.body || "{}");
      const insertPayload = {
        customer_id: customer.id,
        label: payload.label || "Home",
        recipient_name: payload.recipientName || customer.full_name,
        phone: payload.phone || customer.phone,
        address_line_1: payload.addressLine1,
        address_line_2: payload.addressLine2 || null,
        city: payload.city,
        state: payload.state,
        pincode: payload.pincode,
        is_default: Boolean(payload.isDefault)
      };
      const { data, error } = await supabase.from("addresses").insert(insertPayload).select("*").single();
      if (error) throw error;
      if (data.is_default) {
        await supabase.from("addresses").update({ is_default: false }).eq("customer_id", customer.id).neq("id", data.id);
        await supabase.from("customers").update({ default_address_id: data.id }).eq("id", customer.id);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ address: data }) };
    }

    if (event.httpMethod === "PUT") {
      const payload = JSON.parse(event.body || "{}");
      const { data, error } = await supabase
        .from("addresses")
        .update({
          label: payload.label,
          recipient_name: payload.recipientName,
          phone: payload.phone,
          address_line_1: payload.addressLine1,
          address_line_2: payload.addressLine2 || null,
          city: payload.city,
          state: payload.state,
          pincode: payload.pincode,
          is_default: Boolean(payload.isDefault)
        })
        .eq("id", payload.id)
        .eq("customer_id", customer.id)
        .select("*")
        .single();
      if (error) throw error;
      if (data.is_default) {
        await supabase.from("addresses").update({ is_default: false }).eq("customer_id", customer.id).neq("id", data.id);
        await supabase.from("addresses").update({ is_default: true }).eq("id", data.id);
        await supabase.from("customers").update({ default_address_id: data.id }).eq("id", customer.id);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ address: data }) };
    }

    const id = event.queryStringParameters?.id;
    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Address id is required" }) };
    }

    const { error } = await supabase.from("addresses").delete().eq("id", id).eq("customer_id", customer.id);
    if (error) throw error;
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
