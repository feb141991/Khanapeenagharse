import { getSupabaseAdmin } from "./_lib/supabase.js";

export default async function handler(req, res) {
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
    const orderNumber = req.query?.orderNumber;
    const phone = req.query?.phone;

    if (!orderNumber || !phone) {
      return res.status(400).json({ error: "Order number and phone are required" });
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select("order_number, customer_name, phone, email, address_line_1, city, state, pincode, status, total_amount, items_summary, payment_method, payment_status, carrier_name, tracking_number, tracking_url, created_at")
      .eq("order_number", orderNumber)
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(200).json({ order });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
