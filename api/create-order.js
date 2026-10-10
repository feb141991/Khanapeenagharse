import { getSupabaseAdmin } from "./_lib/supabase.js";

function randomOrderNumber() {
  const stamp = Date.now().toString().slice(-6);
  const salt = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KP-${stamp}-${salt}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { customer, items } = body;

    if (!customer?.customerName || !customer?.phone || !customer?.addressLine1 || !customer?.city || !customer?.state || !customer?.pincode) {
      return res.status(400).json({ error: "Missing customer fields" });
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const slugs = [...new Set(items.map((item) => item.slug).filter(Boolean))];
    const { data: liveProducts, error: productsError } = await supabase
      .from("products")
      .select("slug, name, price, stock_quantity, active")
      .in("slug", slugs);
    if (productsError) throw productsError;

    const liveProductMap = new Map((liveProducts || []).map((product) => [product.slug, product]));
    for (const item of items) {
      const liveProduct = liveProductMap.get(item.slug);
      if (!liveProduct || liveProduct.active === false) {
        return res.status(400).json({ error: `${item.name || "This item"} is not available right now.` });
      }
      if (Number(item.quantity) > Number(liveProduct.stock_quantity || 0)) {
        return res.status(400).json({ error: `${liveProduct.name} is out of stock for the requested quantity.` });
      }
    }

    const validatedItems = items.map((item) => {
      const liveProduct = liveProductMap.get(item.slug);
      return {
        ...item,
        name: liveProduct.name,
        unitPrice: Number(liveProduct.price)
      };
    });

    const totalAmount = validatedItems.reduce((sum, item) => sum + (Number(item.unitPrice) * Number(item.quantity)), 0);

    const customerPayload = {
      full_name: customer.customerName,
      phone: customer.phone,
      email: customer.email || null,
      address_line_1: customer.addressLine1,
      address_line_2: customer.addressLine2 || null,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode
    };

    let customerRecordId = null;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", customer.phone)
      .maybeSingle();

    if (existingCustomer?.id) {
      customerRecordId = existingCustomer.id;
      await supabase.from("customers").update(customerPayload).eq("id", customerRecordId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert(customerPayload)
        .select("id")
        .single();
      if (customerError) throw customerError;
      customerRecordId = newCustomer.id;
    }

    const itemsSummary = validatedItems
      .map((item) => `${item.name} (${item.sizeLabel || "Standard"}) x${item.quantity}`)
      .join(", ");

    const orderPayload = {
      order_number: randomOrderNumber(),
      customer_id: customerRecordId,
      customer_name: customer.customerName,
      phone: customer.phone,
      email: customer.email || null,
      address_line_1: customer.addressLine1,
      address_line_2: customer.addressLine2 || null,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      payment_method: customer.paymentMethod || "COD",
      payment_status: "pending",
      status: "pending",
      total_amount: totalAmount,
      items_summary: itemsSummary
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id, order_number, customer_name, phone, address_line_1, city, state, pincode, status, total_amount, payment_method, created_at")
      .single();
    if (orderError) throw orderError;

    const orderItems = validatedItems.map((item) => ({
      order_id: order.id,
      product_slug: item.slug,
      product_name: item.name,
      size_label: item.sizeLabel || "Standard",
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      total_price: Number(item.unitPrice) * Number(item.quantity)
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    for (const item of validatedItems) {
      const currentStock = Number(liveProductMap.get(item.slug)?.stock_quantity || 0);
      const nextStock = Math.max(0, currentStock - Number(item.quantity));
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock_quantity: nextStock })
        .eq("slug", item.slug);
      if (stockError) throw stockError;
    }

    return res.status(200).json({ ok: true, order });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
