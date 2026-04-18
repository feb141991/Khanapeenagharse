/* Khana Peena Ghar Se — legacy (non-React) store.
   localStorage keys kept in sync with the React SPA (src/store.js, src/data.js). */

const STORAGE_KEYS = {
  cart: "kp_cart_v3",
  wishlist: "kp_wishlist_v3"
};

const IN_PRODUCTS_DIR =
  window.location.href.includes("/products/") ||
  window.location.pathname.includes("/products/");

function sitePath(path) {
  return `${IN_PRODUCTS_DIR ? "../" : ""}${path}`;
}

const KP_PRODUCTS = [
  {
    id: "aam-500",
    slug: "aam-ka-achar",
    name: "Aam Ka Achar",
    shortName: "Aam",
    tagline: "Raw mango, slow-bloom masala",
    price: 299,
    size: "500 g jar",
    stock: 24,
    spice: "Medium",
    ingredients: ["raw mango", "mustard oil", "methi", "saunf", "salt", "red chilli", "turmeric"],
    pairings: ["Paratha", "Dal-chawal", "Curd rice", "Khichdi"],
    shortDescription:
      "Raw mango, a sharp tang up top and layered roasted masala that settles into a balanced finish.",
    description:
      "Small-batch raw mango achar built around the long-bloom of mustard oil and a slow roast of methi, saunf, and house pickle masala.",
    image: sitePath("images/achars/aam-ka-achar.jpg"),
    deliveryNote: "Sealed glass jar. Local delivery and managed dispatch.",
    shelfLife: "6 months unopened · 3 months after opening"
  },
  {
    id: "hing-450",
    slug: "hing-ka-achar",
    name: "Hing Ka Achar",
    shortName: "Hing",
    tagline: "Aromatic, savoury, quietly addictive",
    price: 279,
    size: "450 g jar",
    stock: 18,
    spice: "Mild",
    ingredients: ["hing", "mustard oil", "salt", "red chilli", "turmeric", "pickle masala"],
    pairings: ["Plain roti", "Thepla", "Steamed rice", "Parathas"],
    shortDescription:
      "A hing-forward profile with savoury depth and a clean, aromatic finish.",
    description:
      "An aromatic hing-led achar with depth and a savoury finish that stands out with simple food.",
    image: sitePath("images/achars/hing-ka-achar.jpg"),
    deliveryNote: "Packed for direct kitchen dispatch.",
    shelfLife: "6 months unopened · 3 months after opening"
  },
  {
    id: "mirch-400",
    slug: "mirch-ka-achar",
    name: "Mirch Ka Achar",
    shortName: "Mirch",
    tagline: "Green chilli with a tangy masala coat",
    price: 259,
    size: "400 g jar",
    stock: 20,
    spice: "Hot",
    ingredients: ["green chilli", "mustard oil", "fenugreek", "salt", "mustard seeds", "pickle masala"],
    pairings: ["Rajma-chawal", "Parathas", "Poha", "Curd rice"],
    shortDescription:
      "A sharper chilli profile with clean heat and a tangy masala coating for stronger spice lovers.",
    description:
      "A chilli-first achar with clean heat — not muddled, not smoky. Built for people who want the spice to show up first.",
    image: sitePath("images/achars/mirch-ka-achar.jpg"),
    deliveryNote: "Spice-forward batch. Store in a cool place.",
    shelfLife: "6 months unopened · 3 months after opening"
  },
  {
    id: "mixveg-500",
    slug: "mix-veg-achar",
    name: "Mix Veg Achar",
    shortName: "Mix Veg",
    tagline: "Seasonal vegetables, balanced masala",
    price: 289,
    size: "500 g jar",
    stock: 16,
    spice: "Medium",
    ingredients: ["carrot", "cauliflower", "green chilli", "mustard oil", "salt", "turmeric", "masala mix"],
    pairings: ["Thali", "Puri", "Khichdi", "Biryani"],
    shortDescription:
      "A broader achar profile with multiple vegetables and a masala balance suited to larger family meals.",
    description:
      "A seasonal mix — carrot, cauliflower, green chilli — pickled together with a balanced masala and mustard oil.",
    image: sitePath("images/achars/mix-veg-achar.jpg"),
    deliveryNote: "Seasonal vegetables may vary slightly by batch.",
    shelfLife: "6 months unopened · 3 months after opening"
  }
];

function readStorage(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable — fail silently */
  }
}

window.KPStore = {
  getProducts() {
    return KP_PRODUCTS;
  },
  findProductBySlug(slug) {
    return KP_PRODUCTS.find((product) => product.slug === slug);
  },
  getCart() {
    return readStorage(STORAGE_KEYS.cart);
  },
  addToCart(slug, quantity = 1) {
    const cart = readStorage(STORAGE_KEYS.cart);
    const existing = cart.find((item) => item.slug === slug);
    if (existing) existing.quantity += quantity;
    else cart.push({ slug, quantity });
    writeStorage(STORAGE_KEYS.cart, cart);
  },
  updateCartQuantity(slug, quantity) {
    const cart = readStorage(STORAGE_KEYS.cart)
      .map((item) => (item.slug === slug ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    writeStorage(STORAGE_KEYS.cart, cart);
  },
  removeFromCart(slug) {
    const cart = readStorage(STORAGE_KEYS.cart).filter((item) => item.slug !== slug);
    writeStorage(STORAGE_KEYS.cart, cart);
  },
  clearCart() {
    writeStorage(STORAGE_KEYS.cart, []);
  },
  getWishlist() {
    return readStorage(STORAGE_KEYS.wishlist);
  },
  toggleWishlist(slug) {
    const wishlist = new Set(readStorage(STORAGE_KEYS.wishlist));
    if (wishlist.has(slug)) wishlist.delete(slug);
    else wishlist.add(slug);
    writeStorage(STORAGE_KEYS.wishlist, [...wishlist]);
  },
  isWishlisted(slug) {
    return readStorage(STORAGE_KEYS.wishlist).includes(slug);
  },
  sitePath(path) {
    return sitePath(path);
  },
  STORAGE_KEYS
};
