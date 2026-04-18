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

async function toSignedMediaUrl(supabase, value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;

  const { data, error } = await supabase.storage.from(storageBucket).createSignedUrl(value, 60 * 60 * 24 * 7);
  if (error || !data?.signedUrl) {
    return toPublicMediaUrl(supabase, value);
  }

  return data.signedUrl;
}

async function resolveProductFolderImages(supabase, slug) {
  if (!slug) return [];

  const { data, error } = await supabase.storage.from(storageBucket).list(slug, {
    limit: 100,
    sortBy: { column: "name", order: "asc" }
  });

  if (error || !Array.isArray(data)) return [];

  return data
    .filter((file) => file?.name && !file.name.startsWith("."))
    .map((file) => `${slug}/${file.name}`);
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
      const configuredImages = Array.isArray(product.gallery_images) ? product.gallery_images.filter(Boolean) : [];
      const allImages = folderImages.length ? folderImages : configuredImages;
      const coverImage = allImages[0] || product.image_url || null;
      const signedImages = await Promise.all(allImages.map((image) => toSignedMediaUrl(supabase, image)));
      const signedCover = await toSignedMediaUrl(supabase, coverImage);

      return {
        ...product,
        image_url: signedCover,
        gallery_images: signedImages.filter(Boolean)
      };
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ products, storageBucket }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
