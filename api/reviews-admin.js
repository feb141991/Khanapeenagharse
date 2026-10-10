import { getSupabaseAdmin } from "./_lib/supabase.js";

function isAuthorized(req) {
  const requestKey = req.headers["x-admin-key"] || req.headers["X-Admin-Key"];
  return Boolean(process.env.ADMIN_DASHBOARD_KEY && requestKey === process.env.ADMIN_DASHBOARD_KEY);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === "GET") {
      const statusFilter = req.query?.status;
      let query = supabase
        .from("reviews")
        .select("id, order_id, customer_id, product_slug, rating, title, comment, images, is_verified_buyer, status, customer_display_name, customer_city, screening_notes, screened_by, screened_at, created_at")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: reviews, error } = await query.limit(100);
      if (error) throw error;

      // Stats
      const { count: pendingCount } = await supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending_screening");
      const { count: approvedCount } = await supabase.from("reviews").select("*", { count: "exact", head: true }).in("status", ["approved", "featured"]);

      return res.status(200).json({
        reviews: reviews || [],
        stats: {
          pending: pendingCount || 0,
          approved: approvedCount || 0,
          total: (reviews || []).length
        }
      });
    }

    if (req.method === "PATCH") {
      const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const { id, action, screeningNotes, customerDisplayName, customerCity, comment } = payload;

      if (!id) return res.status(400).json({ error: "Review ID required" });

      const updates = { updated_at: new Date().toISOString() };

      if (action === "approve") {
        updates.status = "approved";
        updates.screened_by = "Admin";
        updates.screened_at = new Date().toISOString();
      } else if (action === "feature") {
        updates.status = "featured";
        updates.screened_by = "Admin";
        updates.screened_at = new Date().toISOString();
      } else if (action === "reject") {
        updates.status = "rejected";
        updates.screening_notes = screeningNotes || "Rejected by moderator";
        updates.screened_by = "Admin";
        updates.screened_at = new Date().toISOString();
      } else if (action === "sanitize") {
        if (customerDisplayName) updates.customer_display_name = customerDisplayName;
        if (customerCity) updates.customer_city = customerCity;
        if (comment) updates.comment = comment;
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }

      const { data, error } = await supabase.from("reviews").update(updates).eq("id", id).select().single();
      if (error) throw error;

      return res.status(200).json({ ok: true, review: data });
    }

    if (req.method === "DELETE") {
      const id = req.query?.id;
      if (!id) return res.status(400).json({ error: "Review ID required" });

      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
