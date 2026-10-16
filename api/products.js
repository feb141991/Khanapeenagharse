import { getSupabaseAdmin } from "./_lib/supabase.js";
import { logRequest, logInfo, logError } from "./_lib/logger.js";

const ENDPOINT = "products";

const storageBucket =
  process.env.SUPABASE_STORAGE_BUCKET ||
  process.env.NETLIFY_SUPABASE_STORAGE_BUCKET ||
  "product-images";

const CANONICAL_PRODUCT_ASSETS = {
  "ghar-ka-achar-box": {
    image: "/images/achars/combo-box/ghar-ka-achar-box.jpg",
    gallery: [
      "/images/achars/combo-box/ghar-ka-achar-box.jpg",
      "/images/achars/aam-ka-achar/Aam ka aachar.png",
      "/images/achars/hing-ka-achar/Hing Aachar.png",
      "/images/achars/mirch-ka-achar/MirchKa aachar.png",
      "/images/achars/mix-veg-achar/mix aachar.png"
    ]
  },
  "the-ghar-ka-achar-box": {
    image: "/images/achars/combo-box/ghar-ka-achar-box.jpg",
    gallery: [
      "/images/achars/combo-box/ghar-ka-achar-box.jpg",
      "/images/achars/aam-ka-achar/Aam ka aachar.png",
      "/images/achars/hing-ka-achar/Hing Aachar.png",
      "/images/achars/mirch-ka-achar/MirchKa aachar.png",
      "/images/achars/mix-veg-achar/mix aachar.png"
    ]
  },
  "aam-ka-achar": {
    image: "/images/achars/aam-ka-achar/Aam ka aachar.png",
    gallery: [
      "/images/achars/aam-ka-achar/Aam ka aachar.png",
      "/images/achars/aam-ka-achar/aam ka aach.png"
    ]
  },
  "hing-ka-achar": {
    image: "/images/achars/hing-ka-achar/Hing Aachar.png",
    gallery: [
      "/images/achars/hing-ka-achar/Hing Aachar.png",
      "/images/achars/hing-ka-achar/Hing.png",
      "/images/achars/hing-ka-achar/hing---1.png"
    ]
  },
  "mirch-ka-achar": {
    image: "/images/achars/mirch-ka-achar/MirchKa aachar.png",
    gallery: [
      "/images/achars/mirch-ka-achar/MirchKa aachar.png",
      "/images/achars/mirch-ka-achar/mirchh.png"
    ]
  },
  "mix-veg-achar": {
    image: "/images/achars/mix-veg-achar/mix aachar.png",
    gallery: [
      "/images/achars/mix-veg-achar/mix aachar.png",
      "/images/achars/mix-veg-achar/mixxx.png"
    ]
  }
};

function isValidMediaUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url.includes("/images/logo.png")) return false;
  // Non-existent Supabase storage bucket
  if (url.includes("supabase.co/storage/v1/object/public/product-images")) return false;
  // Missing placeholder files from DB
  if (url.endsWith("cover.jpg") || url.endsWith("detail-1.jpg") || url.endsWith("detail-2.jpg")) return false;
  return true;
}

function toPublicMediaUrl(value, slug) {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith("/images/")) return value;
  // If it's a relative path like "aam-ka-achar/Aam ka aachar.png", resolve to local static path
  if (/^[a-z0-9_-]+\/[^/]+$/i.test(value)) {
    const candidate = `/images/achars/${value}`;
    if (isValidMediaUrl(candidate)) return candidate;
  }
  if (/^https?:\/\//i.test(value) && isValidMediaUrl(value)) return value;

  const fallback = CANONICAL_PRODUCT_ASSETS[slug];
  return fallback ? fallback.image : null;
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

    const products = (data || []).map((product) => {
      const canonical = CANONICAL_PRODUCT_ASSETS[product.slug] || CANONICAL_PRODUCT_ASSETS["the-ghar-ka-achar-box"];

      const rawGallery = Array.isArray(product.gallery_images) && product.gallery_images.length
        ? product.gallery_images
        : (product.image_url ? [product.image_url] : []);

      const resolvedGallery = rawGallery
        .map((img) => toPublicMediaUrl(img, product.slug))
        .filter((img) => isValidMediaUrl(img));

      const galleryImages = resolvedGallery.length > 0
        ? resolvedGallery
        : (canonical ? canonical.gallery : []);

      const resolvedMainImage = toPublicMediaUrl(product.image_url, product.slug);
      const imageUrl = isValidMediaUrl(resolvedMainImage)
        ? resolvedMainImage
        : (galleryImages[0] || (canonical ? canonical.image : "/images/brand/home-hero.jpg"));

      return {
        ...product,
        image_url: imageUrl,
        gallery_images: galleryImages
      };
    });

    return res.status(200).json({ products, storageBucket });
  } catch (error) {
    logError(ENDPOINT, "Failed to load catalog products", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
