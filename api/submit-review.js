import { getSupabaseAdmin } from "./_lib/supabase.js";

function maskCustomerName(fullName) {
  if (!fullName) return "Verified Patron";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === "GET") {
      const token = req.query?.token;
      if (!token) {
        return res.status(400).json({ error: "Missing review token" });
      }

      const { data: request, error } = await supabase
        .from("review_requests")
        .select("id, token, order_id, customer_id, customer_name, product_slug, is_completed, orders (order_number, items_summary)")
        .eq("token", token)
        .maybeSingle();

      if (error) throw error;
      if (!request) {
        return res.status(404).json({ error: "Invalid or expired review link" });
      }

      return res.status(200).json({
        ok: true,
        request: {
          token: request.token,
          customerName: maskCustomerName(request.customer_name),
          productSlug: request.product_slug,
          orderNumber: request.orders?.order_number,
          itemsSummary: request.orders?.items_summary,
          isCompleted: request.is_completed
        }
      });
    }

    if (req.method === "POST") {
      const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const { token, rating, title, comment, images, displayName, city, consent } = payload;

      if (!token) return res.status(400).json({ error: "Review token is required" });
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating between 1 and 5 is required" });
      if (!comment || comment.trim().length < 5) return res.status(400).json({ error: "Please write at least a few words for your review" });
      if (consent === false) return res.status(400).json({ error: "Consent to display review under DPDP Act is required" });

      // Verify token
      const { data: request, error: rErr } = await supabase
        .from("review_requests")
        .select("id, order_id, customer_id, customer_name, product_slug, is_completed")
        .eq("token", token)
        .maybeSingle();

      if (rErr) throw rErr;
      if (!request) return res.status(404).json({ error: "Invalid review token" });
      if (request.is_completed) {
        return res.status(400).json({ error: "A review has already been submitted for this order" });
      }

      // Safe display name without leaking full PII
      const safeDisplayName = displayName ? displayName.trim() : maskCustomerName(request.customer_name);

      const reviewPayload = {
        order_id: request.order_id,
        customer_id: request.customer_id,
        product_slug: payload.productSlug || request.product_slug || "ghar-ka-achar",
        rating: Number(rating),
        title: title ? String(title).trim() : null,
        comment: String(comment).trim(),
        images: Array.isArray(images) ? images : [],
        is_verified_buyer: true,
        status: "pending_screening", // MUST BE MODERATED BEFORE GOING LIVE
        customer_display_name: safeDisplayName,
        customer_city: city ? String(city).trim() : "India"
      };

      const { data: review, error: revError } = await supabase
        .from("reviews")
        .insert(reviewPayload)
        .select("id, rating, title, comment, status")
        .single();

      if (revError) throw revError;

      // Mark request completed
      await supabase
        .from("review_requests")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", request.id);

      return res.status(200).json({
        ok: true,
        message: "Thank you! Your review has been submitted to our kitchen team and will be published once screened.",
        reviewId: review.id
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
