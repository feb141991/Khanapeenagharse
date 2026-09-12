const { getSupabaseAdmin } = require("./_lib/supabase");

const headers = { "Content-Type": "application/json" };

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const supabase = getSupabaseAdmin();
    const orderNumber = event.queryStringParameters?.orderNumber;
    const phone = event.queryStringParameters?.phone;

    if (!orderNumber || !phone) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Order number and phone are required" }) };
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select("order_number, customer_name, phone, status, total_amount")
      .eq("order_number", orderNumber)
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;
    if (!order) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Order not found" }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ order }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
