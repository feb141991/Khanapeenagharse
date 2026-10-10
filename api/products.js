import { getSupabaseAdmin } from "./_lib/supabase.js";
import { logRequest, logInfo, logError } from "./_lib/logger.js";

const ENDPOINT = "products";

const storageBucket =
  process.env.SUPABASE_STORAGE_BUCKET ||
  process.env.NETLIFY_SUPABASE_STORAGE_BUCKET ||
  "product-images";

function toPublicMediaUrl(supabase, value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return supabase.storage.from(storageBucket).getPublicUrl(value).data.publicUrl;
}

async function resolveProductFolderImages(supabase, slug) {
  try {
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .list(slug, {
        limit: 100,
        sortBy: { column: "name", order: "asc" }
      });

    if (error) return [];

    return (data || [])
      .filter((item) => item.name && !item.name.startsWith("."))
      .map((item) => `${slug}/${item.name}`);
  } catch {
    return [];
  }
}

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

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select("slug, name, size_label, price, stock_quantity, description, image_url, gallery_images, active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    const products = await Promise.all((data || []).map(async (product) => {
      const folderImages = await resolveProductFolderImages(supabase, product.slug);
      const rawImages = folderImages.length
        ? folderImages
        : Array.isArray(product.gallery_images) && product.gallery_images.length
          ? product.gallery_images
          : (product.image_url ? [product.image_url] : []);

      const galleryImages = rawImages.map((image) => toPublicMediaUrl(supabase, image)).filter(Boolean);

      return {
        ...product,
        image_url: galleryImages[0] || toPublicMediaUrl(supabase, product.image_url),
        gallery_images: galleryImages
      };
    }));

    return res.status(200).json({ products, storageBucket });
  } catch (error) {
    logError(ENDPOINT, "Failed to load catalog products", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
