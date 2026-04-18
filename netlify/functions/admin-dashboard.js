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
      const [{ data: orders, error: ordersError }, { data: inventory, error: inventoryError }] = await Promise.all([
        supabase.from("orders").select("id, order_number, customer_name, phone, status, total_amount, items_summary, created_at").order("created_at", { ascending: false }),
        supabase.from("products").select("id, slug, name, size_label, stock_quantity, price, image_url, gallery_images").order("name", { ascending: true })
      ]);
      if (ordersError) throw ordersError;
      if (inventoryError) throw inventoryError;
      return { statusCode: 200, headers, body: JSON.stringify({ orders: orders || [], inventory: inventory || [] }) };
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

      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid patch payload" }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
