const { getSupabaseAdmin } = require("./_lib/supabase");

const headers = { "Content-Type": "application/json" };

function randomReferralCode(name = "KP") {
  const clean = name.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6) || "KP";
  return `${clean}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

async function getAuthenticatedCustomer(supabase, event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { error: { statusCode: 401, message: "Missing auth token" } };
  }

  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return { error: { statusCode: 401, message: "Unauthorized" } };
  }

  const authUser = userData.user;
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (customerError) throw customerError;

  return { authUser, customer };
}

exports.handler = async (event) => {
  if (!["GET", "PUT"].includes(event.httpMethod)) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const supabase = getSupabaseAdmin();
    const auth = await getAuthenticatedCustomer(supabase, event);
    if (auth.error) {
      return { statusCode: auth.error.statusCode, headers, body: JSON.stringify({ error: auth.error.message }) };
    }

    const { authUser, customer } = auth;
    if (!customer) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Customer profile not found" }) };
    }

    if (event.httpMethod === "GET") {
      if (!customer.referral_code) {
        const referralCode = randomReferralCode(customer.first_name || customer.full_name || "KP");
        await supabase.from("customers").update({ referral_code: referralCode }).eq("id", customer.id);
        customer.referral_code = referralCode;
      }

      const [ordersResult, addressesResult, rewardsResult, referralsResult, notificationsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, payment_status, tracking_number, delivery_eta, total_amount, created_at, items_summary")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("addresses")
          .select("*")
          .eq("customer_id", customer.id)
          .order("is_default", { ascending: false }),
        supabase
          .from("reward_points")
          .select("id, points, reason, created_at")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("referrals")
          .select("id, referral_code, status, reward_to_referrer, reward_to_referred, created_at")
          .eq("referrer_customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("notifications")
          .select("id, title, body, kind, read_at, created_at")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(6)
      ]);

      const orders = ordersResult.data || [];
      const recentOrder = orders[0] || null;
      const reorderHint = recentOrder?.items_summary
        ? `Reorder ${recentOrder.items_summary} in one click from your orders.`
        : "Your recent favourites will show up here after your first order.";

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          customer: {
            ...customer,
            email: customer.email || authUser.email || ""
          },
          addresses: addressesResult.data || [],
          orders,
          rewards: rewardsResult.data || [],
          referrals: referralsResult.data || [],
          notifications: notificationsResult.data || [],
          insights: {
            recentOrder,
            reorderHint,
            repeatCustomer: Number(customer.total_orders || 0) > 1,
            supportMessage: "Need help with delivery, order changes, or gifting? Raise a support request from your orders section."
          }
        })
      };
    }

    const payload = JSON.parse(event.body || "{}");
    const customerPatch = {};

    if (payload.fullName !== undefined) {
      customerPatch.full_name = payload.fullName || customer.full_name;
      customerPatch.first_name = (payload.fullName || customer.full_name || "").split(" ")[0] || customer.first_name;
    }
    if (payload.phone !== undefined) customerPatch.phone = payload.phone || customer.phone;
    if (payload.avatarUrl !== undefined) customerPatch.avatar_url = payload.avatarUrl || null;
    if (payload.marketingOptIn !== undefined) customerPatch.marketing_opt_in = Boolean(payload.marketingOptIn);
    if (payload.orderUpdatesOptIn !== undefined) customerPatch.order_updates_opt_in = Boolean(payload.orderUpdatesOptIn);
    if (payload.supportOptIn !== undefined) customerPatch.support_opt_in = Boolean(payload.supportOptIn);

    if (Object.keys(customerPatch).length) {
      const { error } = await supabase.from("customers").update(customerPatch).eq("id", customer.id);
      if (error) throw error;
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Internal server error" }) };
  }
};
