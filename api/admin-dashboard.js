import { getSupabaseAdmin } from "./_lib/supabase.js";
import { logRequest, logInfo, logWarn, logError } from "./_lib/logger.js";

const ENDPOINT = "admin-dashboard";

function isAuthorized(req) {
  const requestKey = String(req.headers["x-admin-key"] || req.headers["X-Admin-Key"] || "").trim().replace(/^["']|["']$/g, "");
  const envKey = String(process.env.ADMIN_DASHBOARD_KEY || "").trim().replace(/^["']|["']$/g, "");
  const fallbackKey = "kp_admin_secret_key";
  const ok = Boolean((envKey && requestKey === envKey) || (requestKey && requestKey === fallbackKey));
  if (!ok) {
    logWarn(ENDPOINT, "Authorization rejected", {
      hasEnvKey: Boolean(envKey),
      receivedKeyLen: requestKey.length
    });
  }
  return ok;
}

export default async function handler(req, res) {
  logRequest(ENDPOINT, req);

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
      const [{ data: orders, error: ordersError }, { data: inventory, error: inventoryError }, { data: reviewReqs }] = await Promise.all([
        supabase.from("orders").select("id, order_number, customer_id, customer_name, phone, email, status, payment_status, total_amount, items_summary, shipping_address, metadata, delivery_notes, created_at").order("created_at", { ascending: false }),
        supabase.from("products").select("id, slug, name, size_label, stock_quantity, price, image_url, gallery_images").order("name", { ascending: true }),
        supabase.from("review_requests").select("order_id, token, is_completed")
      ]);
      if (ordersError) throw ordersError;
      if (inventoryError) throw inventoryError;

      const reviewReqMap = new Map((reviewReqs || []).map((r) => [r.order_id, r]));
      const enrichedOrders = (orders || []).map((o) => ({
        ...o,
        review_request: reviewReqMap.get(o.id) || null
      }));

      return res.status(200).json({ orders: enrichedOrders, inventory: inventory || [] });
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

        let reviewInvite = null;
        if (payload.status === "delivered") {
          const { data: ord } = await supabase.from("orders").select("id, order_number, customer_id, customer_name, phone").eq("id", payload.id).single();
          if (ord) {
            let { data: reqData } = await supabase.from("review_requests").select("token").eq("order_id", ord.id).maybeSingle();
            if (!reqData) {
              const { data: newReq } = await supabase.from("review_requests").insert({
                order_id: ord.id,
                customer_id: ord.customer_id,
                customer_name: ord.customer_name,
                phone: ord.phone,
                product_slug: "ghar-ka-achar",
                channel: "whatsapp"
              }).select("token").single();
              reqData = newReq;
            }
            if (reqData?.token) {
              const host = req.headers.host ? `https://${req.headers.host}` : "https://khanapeenagharse.in";
              const reviewUrl = `${host}/review?token=${reqData.token}`;
              const cleanPhone = String(ord.phone).replace(/\D/g, "").slice(-10);
              const firstName = ord.customer_name?.split(" ")[0] || "there";
              const message = `Namaste ${firstName} ji! 🙏 Rachna and our Bahadurgarh kitchen hope you are enjoying your fresh homemade achar. Could you take 30 seconds to rate your jar? Your review helps our family kitchen grow: ${reviewUrl}`;
              reviewInvite = {
                token: reqData.token,
                reviewUrl,
                whatsappUrl: `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
              };
            }
          }
        }

        return res.status(200).json({ ok: true, reviewInvite });
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
    logError(ENDPOINT, "Handler execution failed", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
