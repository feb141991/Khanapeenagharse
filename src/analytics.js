// Google Analytics 4 (GA4) Analytics Module for Khana Peena Ghar Se
// Measurement ID: G-8FB4L3C44Y

export const GA_MEASUREMENT_ID = "G-8FB4L3C44Y";

/**
 * Safe helper to trigger gtag if initialized
 */
export function gtag(...args) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

/**
 * Track SPA Route Pageviews on React Router route transitions
 */
export function trackPageView(path, title) {
  const currentPath = path || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "");
  const currentTitle = title || (typeof document !== "undefined" ? document.title : "");
  
  gtag("event", "page_view", {
    page_title: currentTitle,
    page_location: typeof window !== "undefined" ? window.location.href : "",
    page_path: currentPath,
    send_to: GA_MEASUREMENT_ID
  });
}

/**
 * Generic custom event tracker
 */
export function trackEvent(action, params = {}) {
  gtag("event", action, params);
}

/**
 * GA4 Standard eCommerce: View Item (Product Detail or Modal)
 */
export function trackViewItem(product) {
  if (!product) return;
  gtag("event", "view_item", {
    currency: "INR",
    value: product.price || 0,
    items: [
      {
        item_id: product.slug || product.id,
        item_name: product.name,
        item_category: product.category || "Achar",
        price: product.price || 0,
        quantity: 1
      }
    ]
  });
}

/**
 * GA4 Standard eCommerce: Add to Cart
 */
export function trackAddToCart(product, quantity = 1) {
  if (!product) return;
  gtag("event", "add_to_cart", {
    currency: "INR",
    value: (product.price || 0) * quantity,
    items: [
      {
        item_id: product.slug || product.id,
        item_name: product.name,
        item_category: product.category || "Achar",
        price: product.price || 0,
        quantity
      }
    ]
  });
}

/**
 * GA4 Standard eCommerce: Remove from Cart
 */
export function trackRemoveFromCart(product, quantity = 1) {
  if (!product) return;
  gtag("event", "remove_from_cart", {
    currency: "INR",
    value: (product.price || 0) * quantity,
    items: [
      {
        item_id: product.slug || product.id,
        item_name: product.name,
        price: product.price || 0,
        quantity
      }
    ]
  });
}

/**
 * GA4 Standard eCommerce: Begin Checkout
 */
export function trackBeginCheckout(items = [], subtotal = 0) {
  gtag("event", "begin_checkout", {
    currency: "INR",
    value: subtotal,
    items: items.map((item) => ({
      item_id: item.product?.slug || item.slug,
      item_name: item.product?.name || item.name || item.slug,
      price: item.product?.price || item.price || 0,
      quantity: item.quantity || 1
    }))
  });
}

/**
 * GA4 Standard eCommerce: Purchase / Order Complete
 */
export function trackPurchase({ orderId, items = [], value = 0, shipping = 0, tax = 0 }) {
  gtag("event", "purchase", {
    transaction_id: orderId,
    value,
    currency: "INR",
    tax,
    shipping,
    items: items.map((item) => ({
      item_id: item.slug || item.item_id || item.product?.slug,
      item_name: item.name || item.item_name || item.product?.name,
      price: item.price || item.product?.price || 0,
      quantity: item.quantity || 1
    }))
  });
}

/**
 * Custom Event: Delivery Pincode Check
 */
export function trackPincodeCheck(pincode, deliverable, state = "", region = "") {
  gtag("event", "check_pincode", {
    pincode,
    deliverable: deliverable ? 1 : 0,
    delivery_state: state,
    delivery_region: region
  });
}

/**
 * Custom Event: Zomato Order Link Click
 */
export function trackZomatoClick(source = "hero") {
  gtag("event", "click_zomato_order", {
    source
  });
}

/**
 * Custom Event: Quick View Modal Open
 */
export function trackQuickView(product) {
  if (!product) return;
  gtag("event", "quick_view_open", {
    item_id: product.slug,
    item_name: product.name
  });
}
