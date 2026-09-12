const { getSupabaseAdmin } = require("./_lib/supabase");

const headers = { "Content-Type": "application/json" };
const storageBucket =
  process.env.NETLIFY_SUPABASE_STORAGE_BUCKET ||
  process.env.SUPABASE_STORAGE_BUCKET ||
  "product-images";

function toPublicMediaUrl(supabase, value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return supabase.storage.from(storageBucket).getPublicUrl(value).data.publicUrl;
}

async function resolveProductFolderImages(supabase, slug) {
  const { data, error } = await supabase.storage
    .from(storageBucket)
    .list(slug, {
      limit: 100,
      sortBy: { column: "name", order: "asc" }
    });

  if (error) throw error;

  return (data || [])
    .filter((item) => item.name && !item.name.startsWith("."))
    .map((item) => `${slug}/${item.name}`);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
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

    return { statusCode: 200, headers, body: JSON.stringify({ products, storageBucket }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
