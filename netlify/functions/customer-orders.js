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
    .select("id, full_name, reward_points, referral_code")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (error) throw error;
  return { customer };
}

exports.handler = async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const supabase = getSupabaseAdmin();
    const auth = await getCustomer(supabase, event);
    if (auth.error) return { statusCode: auth.error.statusCode, headers, body: JSON.stringify({ error: auth.error.message }) };
    const { customer } = auth;

    if (event.httpMethod === "GET") {
      const query = event.queryStringParameters?.q?.trim();
      const [ordersResult, notificationsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, payment_status, tracking_number, delivery_eta, total_amount, created_at, items_summary, metadata")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("notifications")
          .select("id, title, body, kind, created_at")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(3)
      ]);
      if (ordersResult.error) throw ordersResult.error;
      if (notificationsResult.error) throw notificationsResult.error;

      let orders = ordersResult.data || [];
      if (query) {
        const needle = query.toLowerCase();
        orders = orders.filter((order) =>
          [order.order_number, order.status, order.items_summary].filter(Boolean).some((value) => value.toLowerCase().includes(needle))
        );
      }

      const orderIds = orders.map((order) => order.id);
      const [itemsResult, eventsResult] = await Promise.all([
        orderIds.length
          ? supabase.from("order_items").select("*").in("order_id", orderIds)
          : Promise.resolve({ data: [], error: null }),
        orderIds.length
          ? supabase.from("order_status_events").select("*").in("order_id", orderIds).order("happened_at", { ascending: true })
          : Promise.resolve({ data: [], error: null })
      ]);
      if (itemsResult.error) throw itemsResult.error;
      if (eventsResult.error) throw eventsResult.error;

      const itemMap = new Map();
      for (const item of itemsResult.data || []) {
        const list = itemMap.get(item.order_id) || [];
        list.push(item);
        itemMap.set(item.order_id, list);
      }
      const eventMap = new Map();
      for (const item of eventsResult.data || []) {
        const list = eventMap.get(item.order_id) || [];
        list.push(item);
        eventMap.set(item.order_id, list);
      }

      const enriched = orders.map((order) => ({
        ...order,
        items: itemMap.get(order.id) || [],
        timeline: eventMap.get(order.id) || [],
        cancelEligible: ["pending", "confirmed"].includes(order.status),
        supportEligible: true
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          orders: enriched,
          notifications: notificationsResult.data || [],
          loyalty: {
            rewardPoints: customer.reward_points || 0,
            referralCode: customer.referral_code || null
          }
        })
      };
    }

    const payload = JSON.parse(event.body || "{}");

    if (payload.type === "cancel-order") {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled", payment_status: "cancelled" })
        .eq("id", payload.orderId)
        .eq("customer_id", customer.id);
      if (error) throw error;
      await supabase.from("order_status_events").insert({
        order_id: payload.orderId,
        status: "cancelled",
        label: "Cancelled",
        note: "Cancelled by customer from account area."
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (payload.type === "support-request") {
      const { error } = await supabase.from("support_tickets").insert({
        customer_id: customer.id,
        order_id: payload.orderId || null,
        subject: payload.subject || "Order support",
        message: payload.message || "Customer requested support from account area."
      });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (payload.type === "refund-request") {
      const { error } = await supabase.from("refunds").insert({
        customer_id: customer.id,
        order_id: payload.orderId,
        reason: payload.reason || "Requested from account area.",
        amount: Number(payload.amount || 0)
      });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid order action" }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
