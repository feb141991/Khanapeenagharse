import { getSupabaseAdmin } from "./_lib/supabase.js";

function isAuthorized(req) {
  const requestKey = req.headers["x-admin-key"] || req.headers["X-Admin-Key"];
  return Boolean(process.env.ADMIN_DASHBOARD_KEY && requestKey === process.env.ADMIN_DASHBOARD_KEY);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const [{ data: orders, error: ordersError }, { data: inventory, error: inventoryError }] = await Promise.all([
        supabase.from("orders").select("id, order_number, customer_name, phone, status, total_amount, items_summary, created_at").order("created_at", { ascending: false }),
        supabase.from("products").select("id, slug, name, size_label, stock_quantity, price, image_url, gallery_images").order("name", { ascending: true })
      ]);
      if (ordersError) throw ordersError;
      if (inventoryError) throw inventoryError;
      return res.status(200).json({ orders: orders || [], inventory: inventory || [] });
    }

    if (req.method === "PATCH") {
      const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

      if (payload.type === "create-product") {
        const { data, error } = await supabase
          .from("products")
          .insert({
            slug: payload.slug,
            name: payload.name,
            size_label: payload.sizeLabel,
            price: Number(payload.price) || 0,
            stock_quantity: Number(payload.stockQuantity) || 0,
            image_url: payload.slug,
            gallery_images: []
          })
          .select("id, slug, name")
          .single();
        if (error) throw error;
        return res.status(200).json({ ok: true, product: data });
      }

      if (payload.type === "order") {
        const { error } = await supabase.from("orders").update({ status: payload.status }).eq("id", payload.id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      if (payload.type === "inventory") {
        const { error } = await supabase
          .from("products")
          .update({ stock_quantity: payload.stockQuantity, price: payload.price })
          .eq("id", payload.id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
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
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: "Invalid patch payload" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
