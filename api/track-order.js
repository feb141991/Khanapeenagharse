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
      .select("id, order_number, customer_name, phone, email, status, payment_status, tracking_number, total_amount, delivery_notes, items_summary, shipping_address, metadata, created_at")
      .eq("order_number", orderNumber)
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const shippingAddress = order.shipping_address || {};
    const metadata = order.metadata || {};

    const formattedOrder = {
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      phone: order.phone,
      email: order.email,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: metadata.payment_method || "COD",
      carrier_name: metadata.carrier_name || (order.tracking_number ? "Express Courier" : null),
      tracking_number: order.tracking_number || null,
      tracking_url: metadata.tracking_url || null,
      total_amount: order.total_amount,
      delivery_notes: order.delivery_notes,
      items_summary: order.items_summary,
      address_line_1: shippingAddress.address_line_1 || shippingAddress.address || "",
      address_line_2: shippingAddress.address_line_2 || "",
      city: shippingAddress.city || "",
      state: shippingAddress.state || "",
      pincode: shippingAddress.pincode || "",
      created_at: order.created_at
    };

    return res.status(200).json({ order: formattedOrder });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
