import { getSupabaseAdmin } from "./_lib/supabase.js";
import { logRequest, logInfo, logError } from "./_lib/logger.js";

const ENDPOINT = "reviews-public";

export default async function handler(req, res) {
  logRequest(ENDPOINT, req);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = getSupabaseAdmin();

  try {
    const slug = req.query?.slug;
    let query = supabase
      .from("reviews")
      .select("id, product_slug, rating, title, comment, images, is_verified_buyer, customer_display_name, customer_city, created_at, status")
      .in("status", ["approved", "featured"])
      .order("created_at", { ascending: false });

    if (slug) {
      query = query.eq("product_slug", slug);
    }

    const { data: reviews, error } = await query.limit(50);
    if (error) throw error;

    const list = reviews || [];
    const totalReviews = list.length;
    const ratingSum = list.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    const averageRating = totalReviews ? Number((ratingSum / totalReviews).toFixed(1)) : 5.0;

    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    list.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    });

    return res.status(200).json({
      reviews: list,
      summary: {
        totalReviews,
        averageRating,
        ratingCounts
      }
    });
  } catch (error) {
    logError(ENDPOINT, "Failed to load public reviews", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
