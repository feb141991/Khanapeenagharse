import { getSupabaseAdmin } from "./_lib/supabase.js";
import { logRequest, logInfo, logWarn, logError } from "./_lib/logger.js";

const ENDPOINT = "crm";

function isAuthorized(req) {
  const requestKey = String(req.headers["x-admin-key"] || req.headers["X-Admin-Key"] || "").trim().replace(/^["']|["']$/g, "");
  const envKey = String(process.env.ADMIN_DASHBOARD_KEY || "").trim().replace(/^["']|["']$/g, "");
  const fallbackKey = "kp_admin_secret_key";
  const ok = Boolean((envKey && requestKey === envKey) || (requestKey && requestKey === fallbackKey));
  if (!ok) {
    logWarn(ENDPOINT, "Authorization rejected", {
      hasEnvKey: Boolean(envKey),
      receivedKeyLen: requestKey.length
    });
  }
  return ok;
}

export default async function handler(req, res) {
  logRequest(ENDPOINT, req);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
      const [{ data: customers, error: custErr }, { data: orders, error: ordErr }, { data: notes, error: notesErr }] = await Promise.all([
        supabase
          .from("customers")
          .select("id, full_name, phone, email, address_line_1, address_line_2, city, state, pincode, reward_points, created_at, updated_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("orders")
          .select("id, order_number, customer_id, customer_name, phone, total_amount, status, items_summary, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("crm_notes")
          .select("id, customer_id, staff_name, note, tag, created_at")
          .order("created_at", { ascending: false })
          .limit(200)
      ]);

      if (custErr) throw custErr;
      if (ordErr) throw ordErr;
      if (notesErr) throw notesErr;

      // Group orders and notes by customer
      const ordersByCustomer = new Map();
      (orders || []).forEach((order) => {
        const cId = order.customer_id;
        if (!cId) return;
        if (!ordersByCustomer.has(cId)) ordersByCustomer.set(cId, []);
        ordersByCustomer.get(cId).push(order);
      });

      const notesByCustomer = new Map();
      (notes || []).forEach((n) => {
        const cId = n.customer_id;
        if (!notesByCustomer.has(cId)) notesByCustomer.set(cId, []);
        notesByCustomer.get(cId).push(n);
      });

      const enrichedCustomers = (customers || []).map((customer) => {
        const custOrders = ordersByCustomer.get(customer.id) || [];
        const custNotes = notesByCustomer.get(customer.id) || [];
        const totalSpent = custOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const orderCount = custOrders.length;
        const lastOrder = custOrders[0] || null;

        // Determine VIP / Churn segment
        let tier = "New Customer";
        if (totalSpent >= 2000 || orderCount >= 4) tier = "VIP Heirloom Patron";
        else if (orderCount >= 2) tier = "Repeat Customer";

        return {
          ...customer,
          total_orders: orderCount,
          lifetime_value: totalSpent,
          average_order_value: orderCount ? Math.round(totalSpent / orderCount) : 0,
          last_order: lastOrder,
          tier,
          orders: custOrders.slice(0, 5),
          notes: custNotes
        };
      });

      return res.status(200).json({ customers: enrichedCustomers });
    }

    if (req.method === "POST") {
      const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const { action } = payload;

      if (action === "add-note") {
        const { customerId, note, tag, staffName } = payload;
        if (!customerId || !note) {
          return res.status(400).json({ error: "Customer ID and note content required" });
        }
        const { data: newNote, error: noteError } = await supabase
          .from("crm_notes")
          .insert({
            customer_id: customerId,
            note: String(note).trim(),
            tag: tag || "general",
            staff_name: staffName || "Kitchen Staff"
          })
          .select()
          .single();
        if (noteError) throw noteError;
        return res.status(200).json({ ok: true, note: newNote });
      }

      if (action === "generate-review-invite") {
        const { orderId, customerId } = payload;
        if (!orderId || !customerId) {
          return res.status(400).json({ error: "Order ID and Customer ID required" });
        }

        const [{ data: order, error: oErr }, { data: customer, error: cErr }] = await Promise.all([
          supabase.from("orders").select("id, order_number, customer_name, phone, items_summary, shipping_address").eq("id", orderId).single(),
          supabase.from("customers").select("id, full_name, phone, email, city").eq("id", customerId).single()
        ]);
        if (oErr || !order) return res.status(404).json({ error: "Order not found" });
        if (cErr || !customer) return res.status(404).json({ error: "Customer not found" });

        // Create review request
        const { data: request, error: rErr } = await supabase
          .from("review_requests")
          .insert({
            order_id: order.id,
            customer_id: customer.id,
            customer_name: customer.full_name,
            phone: customer.phone,
            email: customer.email || null,
            product_slug: "ghar-ka-achar",
            channel: "whatsapp"
          })
          .select("token")
          .single();
        if (rErr) throw rErr;

        const host = req.headers.host ? `https://${req.headers.host}` : "https://khanapeenagharse.in";
        const reviewUrl = `${host}/review?token=${request.token}`;
        const cleanPhone = String(customer.phone).replace(/\D/g, "").slice(-10);
        
        const firstName = customer.full_name.split(" ")[0] || "there";
        const message = `Namaste ${firstName} ji! 🙏 Rachna and our Bahadurgarh kitchen hope you are enjoying your fresh homemade achar. Could you take 30 seconds to rate your jar? Your review helps our family kitchen grow: ${reviewUrl}`;
        const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;

        return res.status(200).json({
          ok: true,
          token: request.token,
          reviewUrl,
          whatsappUrl,
          customerName: customer.full_name,
          phone: customer.phone
        });
      }

      return res.status(400).json({ error: "Invalid CRM action" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    logError(ENDPOINT, "CRM handler execution failed", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
