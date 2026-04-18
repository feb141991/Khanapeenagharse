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

    const products = (data || []).map((product) => ({
      ...product,
      image_url: toPublicMediaUrl(supabase, product.image_url),
      gallery_images: Array.isArray(product.gallery_images)
        ? product.gallery_images.map((image) => toPublicMediaUrl(supabase, image)).filter(Boolean)
        : []
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ products, storageBucket }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
