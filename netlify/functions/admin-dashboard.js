const { getSupabaseAdmin } = require("./_lib/supabase");

const headers = { "Content-Type": "application/json" };

function isAuthorized(event) {
  const requestKey = event.headers["x-admin-key"] || event.headers["X-Admin-Key"];
  return Boolean(process.env.ADMIN_DASHBOARD_KEY && requestKey === process.env.ADMIN_DASHBOARD_KEY);
}

exports.handler = async (event) => {
  if (!isAuthorized(event)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const supabase = getSupabaseAdmin();

    if (event.httpMethod === "GET") {
      const [{ data: orders, error: ordersError }, { data: inventory, error: inventoryError }, { data: customers, error: customersError }, { data: tickets, error: ticketsError }, { data: referrals, error: referralsError }] = await Promise.all([
        supabase.from("orders").select("id, order_number, customer_name, phone, status, payment_status, tracking_number, total_amount, items_summary, created_at").order("created_at", { ascending: false }),
        supabase.from("products").select("id, slug, name, size_label, stock_quantity, price, image_url, gallery_images").order("name", { ascending: true }),
        supabase.from("customers").select("id, full_name, email, phone, lifetime_value, total_orders, last_order_at, created_at").order("lifetime_value", { ascending: false }).limit(20),
        supabase.from("support_tickets").select("id, subject, status, priority, created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("referrals").select("id, referral_code, status, reward_to_referrer, reward_to_referred, created_at").order("created_at", { ascending: false }).limit(20)
      ]);
      if (ordersError) throw ordersError;
      if (inventoryError) throw inventoryError;
      if (customersError) throw customersError;
      if (ticketsError) throw ticketsError;
      if (referralsError) throw referralsError;

      const analytics = {
        revenueToday: (orders || [])
          .filter((order) => new Date(order.created_at).toDateString() === new Date().toDateString())
          .reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
        revenueMonth: (orders || []).reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
        averageOrderValue: orders?.length
          ? (orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) / orders.length).toFixed(2)
          : "0.00",
        repeatCustomerRate: customers?.length
          ? Math.round((customers.filter((customer) => Number(customer.total_orders || 0) > 1).length / customers.length) * 100)
          : 0,
        openSupportTickets: (tickets || []).filter((ticket) => ticket.status !== "closed").length,
        pendingReferrals: (referrals || []).filter((referral) => referral.status !== "completed").length
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          orders: orders || [],
          inventory: inventory || [],
          customers: customers || [],
          tickets: tickets || [],
          referrals: referrals || [],
          analytics
        })
      };
    }

    if (event.httpMethod === "PATCH") {
      const payload = JSON.parse(event.body || "{}");

      if (payload.type === "order") {
        const { error } = await supabase.from("orders").update({ status: payload.status }).eq("id", payload.id);
        if (error) throw error;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      if (payload.type === "inventory") {
        const { error } = await supabase
          .from("products")
          .update({ stock_quantity: payload.stockQuantity, price: payload.price })
          .eq("id", payload.id);
        if (error) throw error;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      if (payload.type === "media") {
        const { error } = await supabase
          .from("products")
          .update({
            image_url: payload.imageUrl || null,
            gallery_images: Array.isArray(payload.galleryImages) ? payload.galleryImages : []
          })
          .eq("id", payload.id);
        if (error) throw error;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      if (payload.type === "create-product") {
        const { error } = await supabase.from("products").insert({
          slug: payload.slug,
          name: payload.name,
          size_label: payload.sizeLabel,
          price: payload.price,
          stock_quantity: payload.stockQuantity,
          description: payload.description || null,
          image_url: null,
          gallery_images: [],
          active: true
        });
        if (error) throw error;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid patch payload" }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
