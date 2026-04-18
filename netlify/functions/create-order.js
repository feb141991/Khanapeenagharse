const { getSupabaseAdmin } = require("./_lib/supabase");

const headers = { "Content-Type": "application/json" };

function randomOrderNumber() {
  const stamp = Date.now().toString().slice(-6);
  const salt = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KP-${stamp}-${salt}`;
}

function addBusinessDays(days) {
  const date = new Date();
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { customer, items } = JSON.parse(event.body || "{}");

    if (!customer?.customerName || !customer?.phone || !customer?.addressLine1 || !customer?.city || !customer?.state || !customer?.pincode) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing customer fields" }) };
    }
    if (!Array.isArray(items) || !items.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Cart is empty" }) };
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
        return { statusCode: 400, headers, body: JSON.stringify({ error: `${item.name || "This item"} is not available right now.` }) };
      }
      if (Number(item.quantity) > Number(liveProduct.stock_quantity || 0)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `${liveProduct.name} is out of stock for the requested quantity.` })
        };
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
      first_name: String(customer.customerName || "").split(" ")[0] || customer.customerName,
      phone: customer.phone,
      email: customer.email || null,
      address_line_1: customer.addressLine1,
      address_line_2: customer.addressLine2 || null,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode
    };

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, lifetime_value, total_orders")
      .eq("phone", customer.phone)
      .maybeSingle();

    let customerId = existingCustomer?.id;

    if (!customerId) {
      const { data: insertedCustomer, error: customerError } = await supabase
        .from("customers")
        .insert(customerPayload)
        .select("id")
        .single();
      if (customerError) throw customerError;
      customerId = insertedCustomer.id;
    } else {
      await supabase.from("customers").update(customerPayload).eq("id", customerId);
    }

    const deliveryEta = addBusinessDays(4);
    const shippingAmount = totalAmount >= 799 ? 0 : 79;
    const orderPayload = {
      order_number: randomOrderNumber(),
      customer_id: customerId,
      customer_name: customer.customerName,
      phone: customer.phone,
      email: customer.email || null,
      status: "placed",
      payment_status: "payment_pending",
      tracking_number: null,
      delivery_eta: deliveryEta,
      subtotal_amount: totalAmount,
      shipping_amount: shippingAmount,
      total_amount: totalAmount + shippingAmount,
      delivery_notes: customer.notes || null,
      items_summary: validatedItems.map((item) => `${item.name} x${item.quantity}`).join(", "),
      shipping_address: {
        line1: customer.addressLine1,
        line2: customer.addressLine2 || "",
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode
      },
      metadata: {
        payment_provider: "razorpay_placeholder",
        payment_note: "Online payment will be integrated later."
      }
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id, order_number, status, total_amount")
      .single();
    if (orderError) throw orderError;

    const orderItems = validatedItems.map((item) => ({
      order_id: order.id,
      product_slug: item.slug,
      product_name: item.name,
      size_label: item.size,
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      line_total: Number(item.unitPrice) * Number(item.quantity),
      product_image: null
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    await supabase.from("order_status_events").insert([
      {
        order_id: order.id,
        status: "placed",
        label: "Order placed",
        note: "Your order has been received and is waiting for confirmation."
      }
    ]);

    await supabase
      .from("customers")
      .update({
        lifetime_value: Number(existingCustomer?.lifetime_value || 0) + Number(orderPayload.total_amount),
        total_orders: Number(existingCustomer?.total_orders || 0) + 1,
        last_order_at: new Date().toISOString()
      })
      .eq("id", customerId);

    for (const item of validatedItems) {
      const currentStock = Number(liveProductMap.get(item.slug)?.stock_quantity || 0);
      const nextStock = Math.max(0, currentStock - Number(item.quantity));
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock_quantity: nextStock })
        .eq("slug", item.slug);
      if (stockError) throw stockError;
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, order }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
