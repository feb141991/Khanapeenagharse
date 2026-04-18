const CART_KEY = "kp_cart_v3";
const WISHLIST_KEY = "kp_wishlist_v3";

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function readJson(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable (private mode, quota) — fail silently */
  }
}

export function getCart() {
  return readJson(CART_KEY, []);
}

export function setCart(items) {
  writeJson(CART_KEY, items);
}

export function getWishlist() {
  return readJson(WISHLIST_KEY, []);
}

export function setWishlist(items) {
  writeJson(WISHLIST_KEY, items);
}

export const STORAGE_KEYS = { cart: CART_KEY, wishlist: WISHLIST_KEY };
