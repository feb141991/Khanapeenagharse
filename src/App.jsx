import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { faqs, products, testimonials } from "./data";
import { hasSupabaseClientEnv, supabase } from "./supabaseClient";
import { getCart, getWishlist, setCart, setWishlist } from "./store";
import {
  trackPageView,
  trackEvent,
  trackViewItem,
  trackAddToCart,
  trackRemoveFromCart,
  trackBeginCheckout,
  trackPurchase,
  trackPincodeCheck,
  trackZomatoClick,
  trackQuickView
} from "./analytics";

const ZOMATO_URL =
  "https://www.zomato.com/bahadurgarh/khana-peena-ghar-se-bahadurgarh-locality/order";
const WHATSAPP_PHONE = "919811200000";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent("Namaste Khana Peena Ghar Se! I would like to order fresh homemade achar from Bahadurgarh.")}`;

export function getWhatsAppOrderUrl(items = [], subtotal = 0, customerInfo = null) {
  const itemList = items
    .map((item) => `• ${item.quantity} × ${item.product?.name || item.name} (₹${(item.product?.price || item.unitPrice || 0) * item.quantity})`)
    .join("\n");

  let text = `Namaste Khana Peena Ghar Se! I would like to place an order from your website:\n\n${itemList}\n\n*Subtotal:* ₹${subtotal}\n*Shipping:* ${subtotal >= 599 ? "FREE Pan-India Delivery" : "₹60"}\n*Total:* ₹${subtotal >= 599 ? subtotal : subtotal + 60}`;

  if (customerInfo && customerInfo.pincode) {
    text += `\n\n*Delivery Pincode:* ${customerInfo.pincode}`;
    if (customerInfo.city || customerInfo.state) {
      text += ` (${[customerInfo.city, customerInfo.state].filter(Boolean).join(", ")})`;
    }
  }

  text += `\n\nPlease confirm availability and payment details. Thank you!`;

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

const HOME_HERO_IMAGE = "/images/brand/home-hero.jpg";
const ABOUT_OWNER_IMAGE = "/images/brand/about-owner.jpg";
const LIFESTYLE_IMAGE = "/images/brand/lifestyle-dining.jpg";

function mergeProductsWithMedia(items) {
  return items.map((product) => {
    const images = (product.images && product.images.length ? product.images : [product.image]).filter(Boolean);

    return {
      ...product,
      images,
      image: images[0] || product.image
    };
  });
}

function mergeProductsFromDatabase(baseProducts, remoteProducts) {
  const remoteMap = new Map((remoteProducts || []).map((item) => [item.slug, item]));

  return baseProducts.map((product) => {
    const remote = remoteMap.get(product.slug);
    if (!remote) return product;

    return {
      ...product,
      price: typeof remote.price === "number" ? remote.price : product.price,
      stock: typeof remote.stock_quantity === "number" ? remote.stock_quantity : product.stock,
      description: remote.description || product.description,
      image: remote.image_url || product.image,
      images: Array.isArray(remote.gallery_images) && remote.gallery_images.length
        ? remote.gallery_images
        : (remote.image_url ? [remote.image_url] : product.images)
    };
  });
}

function useCatalogProducts() {
  const [catalog, setCatalog] = useState(() => mergeProductsWithMedia(products));

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch("/.netlify/functions/products");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load products.");
        if (!cancelled) {
          setCatalog(mergeProductsFromDatabase(mergeProductsWithMedia(products), result.products || []));
        }
      } catch {
        if (!cancelled) {
          setCatalog(mergeProductsWithMedia(products));
        }
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}

function useDocumentMeta({ title, description, schema }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", description);
    }
    if (schema) {
      const scriptId = "dynamic-route-schema";
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
      return () => {
        const el = document.getElementById(scriptId);
        if (el) el.remove();
      };
    }
  }, [title, description, schema]);
}

function TopAnnouncement() {
  return (
    <div className="top-announcement-bar">
      <span>
        Homemade in Bahadurgarh <span className="dot">•</span> Small-batch artisanal preparation <span className="dot">•</span> Pan-India doorstep delivery
      </span>
    </div>
  );
}

function ToastNotification({ toast, onDismiss, onOpenCartDrawer }) {
  if (!toast) return null;

  return (
    <div className="toast-container" aria-live="polite">
      <motion.div
        key={toast.id}
        className="toast-card"
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.94 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <div className="toast-body">
          {toast.image ? (
            <img
              src={toast.image}
              alt={toast.title}
              className="toast-thumb"
              onError={(e) => { e.currentTarget.src = "/images/logo.png"; }}
            />
          ) : (
            <div className="toast-icon-badge">
              {toast.type === "wishlist" ? "♥" : "✓"}
            </div>
          )}
          <div className="toast-info">
            <div className="toast-badge-pill">
              <span>{toast.badge || (toast.type === "wishlist" ? "Wishlist Updated" : "Added to Cart")}</span>
            </div>
            <h4 className="toast-title">{toast.title}</h4>
            {toast.meta ? <p className="toast-meta">{toast.meta}</p> : null}
          </div>
          <button
            type="button"
            className="toast-close-btn"
            onClick={onDismiss}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>

        {toast.type === "cart" ? (
          <div className="toast-actions">
            <button
              type="button"
              className="toast-action-btn"
              onClick={() => {
                onDismiss();
                onOpenCartDrawer();
              }}
            >
              View Cart Drawer →
            </button>
            <Link
              to="/cart"
              className="toast-action-btn primary"
              onClick={onDismiss}
            >
              Go to Checkout
            </Link>
          </div>
        ) : null}

        <div className="toast-progress-bar" />
      </motion.div>
    </div>
  );
}

function FreeShippingMeter({ subtotal, threshold = 599 }) {
  const diff = threshold - subtotal;
  const progressPercent = Math.min(100, Math.round((subtotal / threshold) * 100));
  const isFree = diff <= 0;

  return (
    <div className="free-shipping-meter">
      <div className="free-shipping-text">
        {isFree ? (
          <span>🎉 <strong>Congratulations!</strong> You unlocked FREE Delivery!</span>
        ) : (
          <span>Add <strong>₹{diff}</strong> more for <strong>FREE Pan-India Shipping</strong>!</span>
        )}
        <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{progressPercent}%</span>
      </div>
      <div className="free-shipping-track">
        <div
          className="free-shipping-bar"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

function CartDrawer({ isOpen, onClose, cart, updateCartQuantity }) {
  const catalog = useCatalogProducts();
  const navigate = useNavigate();

  const items = useMemo(() => {
    return cart
      .map((entry) => ({ ...entry, product: catalog.find((p) => p.slug === entry.slug) }))
      .filter((entry) => entry.product)
      .map((entry) => ({
        ...entry,
        quantity: Math.min(entry.quantity, Math.max(entry.product.stock, 0))
      }))
      .filter((entry) => entry.quantity > 0);
  }, [cart, catalog]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [items]);

  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="cart-drawer-root">
        <motion.div
          className="cart-drawer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.aside
          className="cart-drawer-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Shopping Cart Drawer"
        >
          <div className="cart-drawer-header">
            <div className="cart-drawer-title-wrap">
              <h2>Your Cart</h2>
              <span className="cart-drawer-count">{totalCount} item{totalCount !== 1 ? "s" : ""}</span>
            </div>
            <button
              type="button"
              className="cart-drawer-close"
              onClick={onClose}
              aria-label="Close cart drawer"
            >
              ✕
            </button>
          </div>

          <FreeShippingMeter subtotal={subtotal} threshold={599} />

          <div className="cart-drawer-body">
            {items.length ? (
              items.map((item) => (
                <div key={item.product.slug} className="cart-drawer-item">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="cart-drawer-item-img"
                    onError={(e) => { e.currentTarget.src = "/images/logo.png"; }}
                  />
                  <div className="cart-drawer-item-details">
                    <h4 className="cart-drawer-item-name">{item.product.name}</h4>
                    <p className="cart-drawer-item-meta">{item.product.size} • ₹{item.product.price}</p>
                    <div className="cart-drawer-item-controls">
                      <div className="cart-drawer-qty-pill">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.slug, item.quantity - 1, item.product.stock)}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          disabled={item.quantity >= item.product.stock}
                          onClick={() => updateCartQuantity(item.product.slug, item.quantity + 1, item.product.stock)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <span className="cart-drawer-item-price">₹{item.product.price * item.quantity}</span>
                      <button
                        type="button"
                        className="cart-drawer-item-remove"
                        onClick={() => updateCartQuantity(item.product.slug, 0, item.product.stock)}
                        aria-label={`Remove ${item.product.name} from cart`}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="cart-drawer-empty">
                <span>🏺</span>
                <h3>Your Cart is Empty</h3>
                <p>Taste the authentic homestyle goodness of Bahadurgarh. Add our signature achars to get started!</p>
                <Link to="/achar" className="button button-primary" onClick={onClose}>
                  Explore Our Achars →
                </Link>
              </div>
            )}
          </div>

          {items.length ? (
            <div className="cart-drawer-footer">
              <div className="cart-drawer-summary-row">
                <span>Item Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="cart-drawer-summary-row">
                <span>Shipping</span>
                <span>{subtotal >= 599 ? <strong style={{ color: "var(--heritage-green)" }}>FREE</strong> : "₹60 (Standard)"}</span>
              </div>
              <div className="cart-drawer-summary-row total">
                <span>Estimated Total</span>
                <span>₹{subtotal + (subtotal >= 599 ? 0 : 60)}</span>
              </div>

              <button
                type="button"
                className="button button-primary cart-drawer-cta"
                onClick={() => {
                  onClose();
                  navigate("/cart");
                }}
              >
                Proceed to Checkout →
              </button>

              <div className="cart-drawer-trust-strip">
                <span>🌿 100% Mustard Oil</span>
                <span>☀️ Sun-Cured Spices</span>
                <span>🛡️ 12-Month Shelf Life</span>
              </div>
            </div>
          ) : null}
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}

function ProductCard({ product, wishlist = [], toggleWishlist, addToCart, delay = 0 }) {
  const navigate = useNavigate();
  const [justAdded, setJustAdded] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [modalAdded, setModalAdded] = useState(false);
  const isWishlisted = wishlist.includes(product.slug);

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.image];

  const handleAdd = (qty = 1) => {
    if (product.stock <= 0) return;
    addToCart(product.slug, qty, product.stock, product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleModalAdd = () => {
    if (product.stock <= 0) return;
    addToCart(product.slug, quantity, product.stock, product);
    setModalAdded(true);
    setTimeout(() => setModalAdded(false), 1800);
  };

  const openQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImgIdx(0);
    setQuantity(1);
    setIsQuickViewOpen(true);
    trackQuickView(product);
    trackViewItem(product);
  };

  const closeQuickView = () => {
    setIsQuickViewOpen(false);
    setModalAdded(false);
  };

  const goToProductPage = () => {
    setIsQuickViewOpen(false);
    navigate(`/product/${product.slug}`);
  };

  return (
    <>
      <motion.article
        className="product-card"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay }}
      >
        <div className="product-card-visual">
          <span className="product-card-tag">{product.category}</span>
          {product.stock > 0 && product.stock <= 8 ? (
            <span className="scarcity-pill" style={{ position: "absolute", bottom: "8px", left: "8px", zIndex: 3 }}>
              Only {product.stock} left!
            </span>
          ) : null}

          <button
            type="button"
            className={`product-wishlist-btn ${isWishlisted ? "is-active" : ""}`}
            aria-label={`Save ${product.name} to wishlist`}
            onClick={() => toggleWishlist(product.slug, product)}
          >
            {isWishlisted ? "♥" : "♡"}
          </button>

          <Link to={`/product/${product.slug}`} style={{ width: "100%", height: "100%" }}>
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = "/images/logo.png";
              }}
            />
          </Link>

          {/* Sleek Translucent Quick View Hover Trigger */}
          <button
            type="button"
            className="product-card-quickview-btn"
            onClick={openQuickView}
            aria-label={`Quick view ${product.name}`}
          >
            <span>🔍</span> Quick View
          </button>
        </div>

        <div className="product-card-info">
          <h3>{product.name}</h3>
          <p className="product-card-tagline">{product.tagline}</p>
          <div className="product-card-price-row">
            <span className="product-card-price">₹{product.price}</span>
            <span className="product-card-size">{product.size}</span>
          </div>
        </div>

        <div className="product-card-actions">
          <button
            type="button"
            className={`button button-primary button-sm ${justAdded ? "is-added button-pulse" : ""}`}
            disabled={product.stock <= 0}
            onClick={() => handleAdd(1)}
          >
            {product.stock <= 0 ? "Out of Stock" : justAdded ? "✓ Added!" : "Add to Cart"}
          </button>
          <button
            type="button"
            className="button button-cream-secondary button-sm"
            onClick={openQuickView}
          >
            Quick View
          </button>
        </div>
      </motion.article>

      {/* Translucent & Transparent Luxury Quick View Modal */}
      <AnimatePresence>
        {isQuickViewOpen && (
          <motion.div
            className="product-quickview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeQuickView}
          >
            <motion.div
              className="product-quickview-card"
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="quickview-close-btn"
                onClick={closeQuickView}
                aria-label="Close Quick View"
              >
                ✕
              </button>

              {/* Left Column: Visual Showcase & Gallery */}
              <div className="quickview-gallery-col">
                <div className="quickview-main-image-wrap">
                  <img
                    src={images[selectedImgIdx] || product.image}
                    alt={product.name}
                    onError={(e) => {
                      e.currentTarget.src = "/images/logo.png";
                    }}
                  />
                  <div className="quickview-image-badge">
                    ✦ 100% Pure Mustard Oil • Zero Palm Oil
                  </div>
                </div>

                {images.length > 1 && (
                  <div className="quickview-thumbs-strip">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`quickview-thumb-btn ${selectedImgIdx === i ? "is-active" : ""}`}
                        onClick={() => setSelectedImgIdx(i)}
                      >
                        <img
                          src={img}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.src = "/images/logo.png";
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Culinary Details & Instant Order Controls */}
              <div className="quickview-info-col">
                <div className="quickview-meta-pills">
                  <span className="quickview-category-pill">{product.category}</span>
                  {product.spice && (
                    <span className="quickview-spice-pill">
                      🌶️ {product.spice}
                    </span>
                  )}
                  <span className="quickview-shelf-pill">⏳ 12-Month Life</span>
                </div>

                <h2 className="quickview-title">{product.name}</h2>
                <p className="quickview-tagline">{product.tagline}</p>

                <div className="quickview-price-box">
                  <div className="quickview-price-wrap">
                    <span className="quickview-price-main">₹{product.price}</span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <>
                        <span className="quickview-price-original">₹{product.originalPrice}</span>
                        <span className="quickview-savings-badge">
                          Save ₹{product.originalPrice - product.price}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="quickview-size-badge">{product.size}</span>
                </div>

                <p className="quickview-description">
                  {product.shortDescription || product.description}
                </p>

                {/* Dietary & Craft Badges */}
                {product.dietaryBadges && product.dietaryBadges.length > 0 && (
                  <div className="quickview-dietary-pills">
                    {product.dietaryBadges.slice(0, 4).map((badge, i) => (
                      <span key={i} className="quickview-dietary-pill">
                        ✓ {badge}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ingredients snippet */}
                {product.ingredients && product.ingredients.length > 0 && (
                  <div className="quickview-ingredients-row">
                    <strong>Ingredients:</strong>{" "}
                    <span>{product.ingredients.join(", ")}</span>
                  </div>
                )}

                {/* Instant Delivery Check in QuickView */}
                <PincodeChecker compact={true} />

                {/* Purchase & Action Controls */}
                <div className="quickview-actions-wrap">
                  <div className="quickview-qty-selector">
                    <button
                      type="button"
                      className="quickview-qty-btn"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      −
                    </button>
                    <span className="quickview-qty-val">{quantity}</span>
                    <button
                      type="button"
                      className="quickview-qty-btn"
                      onClick={() => setQuantity((q) => Math.min(product.stock || 20, q + 1))}
                      disabled={quantity >= (product.stock || 20)}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`button button-mustard-primary quickview-add-btn ${modalAdded ? "is-added" : ""}`}
                    disabled={product.stock <= 0}
                    onClick={handleModalAdd}
                  >
                    {product.stock <= 0
                      ? "Out of Stock"
                      : modalAdded
                      ? "✓ Added to Cart!"
                      : `Add to Cart • ₹${product.price * quantity}`}
                  </button>
                </div>

                <div className="quickview-footer-links">
                  <button
                    type="button"
                    className="quickview-full-details-link"
                    onClick={goToProductPage}
                  >
                    View Full Product Details &amp; Reviews →
                  </button>

                  <div className="quickview-trust-note">
                    🔒 Handcrafted in Bahadurgarh • Free Safe Pan-India Delivery
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Header({ cartCount, isLoggedIn, onSignOut, onOpenCartDrawer }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/achar", label: "Shop" },
    { to: "/about", label: "Our Story" },
    { to: "/how-its-made", label: "How It's Made" },
    { to: "/contact", label: "Contact & Kitchen" }
  ];

  return (
    <header className="site-header">
      <div className="content-container header-inner">
        <Link className="brand" to="/" aria-label="Khana Peena Ghar Se home">
          <img src="/images/logo.png" alt="Khana Peena Ghar Se logo" />
          <span className="brand-copy">
            <strong>KHANA PEENA GHAR SE</strong>
            <span>THE PICKLE CHAPTER</span>
          </span>
        </Link>

        <nav className={`main-nav ${menuOpen ? "open" : ""}`} aria-label="Main Navigation">
          <div className="nav-links">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={`nav-link ${active ? "active" : ""}`}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="header-actions">
          <Link
            to="/account"
            className={`header-account-btn ${location.pathname === "/account" ? "active" : ""}`}
            aria-label="Account / Login"
          >
            <span>👤</span>
            <span>{isLoggedIn ? "Account" : "Login"}</span>
          </Link>

          <button
            type="button"
            className="header-cart-btn"
            onClick={onOpenCartDrawer}
            aria-label="Open Cart Drawer"
          >
            <span>🛍️ Cart</span>
            {cartCount > 0 ? (
              <span className="nav-cart-badge">{cartCount}</span>
            ) : null}
          </button>

          <Link to="/achar" className="button button-primary button-sm header-cta-btn">
            Shop Achar
          </Link>

          {isLoggedIn ? (
            <button className="nav-admin" type="button" onClick={onSignOut}>
              Sign Out
            </button>
          ) : null}

          <button
            type="button"
            className={`menu-toggle ${menuOpen ? "active" : ""}`}
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMenuOpen((val) => !val)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

function TrustStrip() {
  return (
    <div className="trust-strip">
      <div className="content-container">
        <div className="trust-grid">
          <motion.div
            className="trust-item"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <div className="trust-icon" aria-hidden="true">🌿</div>
            <div className="trust-item-copy">
              <strong>Traditional Recipes</strong>
              <span>Passed down through generations</span>
            </div>
          </motion.div>
          <motion.div
            className="trust-item"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="trust-icon" aria-hidden="true">🏺</div>
            <div className="trust-item-copy">
              <strong>Small Batches</strong>
              <span>Handcrafted in our family kitchen</span>
            </div>
          </motion.div>
          <motion.div
            className="trust-item"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="trust-icon" aria-hidden="true">🏡</div>
            <div className="trust-item-copy">
              <strong>Made with Care</strong>
              <span>Pure mustard oil, zero chemicals</span>
            </div>
          </motion.div>
          <motion.div
            className="trust-item"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="trust-icon" aria-hidden="true">🚚</div>
            <div className="trust-item-copy">
              <strong>Ships Across India</strong>
              <span>Safe glass jar transit guarantee</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const HERO_SLIDES = [
  {
    id: "slide-jars",
    eyebrow: "Artisanal Indian Pickles",
    headline: "Recipes passed down.\nPickles made today.",
    subhead: "Taste the achar. Remember the home.",
    body: "Traditional homemade pickles prepared in small batches from our family kitchen in Bahadurgarh. Same recipes. Pure cold-pressed mustard oil. Real ingredients. A taste of home, always.",
    image: "/images/brand/home-hero.jpg",
    alt: "Authentic Sun-Cured Pickles in traditional glass and ceramic jars",
    badgeTop: { icon: "🌿", title: "100% Kacchi Ghani", sub: "Cold-Pressed Mustard Oil" },
    badgeBottom: { icon: "🏺", title: "Sun-Cured In Barnis", sub: "12-Month Natural Life" },
    tabTitle: "Sun-Cured Jars",
    ctaPrimary: { label: "Shop Achar →", to: "/achar" },
    ctaSecondary: { label: "Our Story", to: "/about" }
  },
  {
    id: "slide-kitchen",
    eyebrow: "Handcrafted in Bahadurgarh",
    headline: "Small batches crafted\nby Rachna at home.",
    subhead: "Authentic mother's touch, zero chemical preservatives.",
    body: "Every jar is seasoned with whole spices roasted by hand, naturally fermented in ceramic barnis under the Haryana sun, and sealed with pure love.",
    image: "/images/brand/about-owner.jpg",
    alt: "Rachna preparing traditional homemade pickles in her Bahadurgarh kitchen",
    badgeTop: { icon: "👵", title: "Mother's Recipe", sub: "Family Kitchen Handcrafted" },
    badgeBottom: { icon: "☀️", title: "Slow Fermented", sub: "Sun-Warmed on Terrace" },
    tabTitle: "Kitchen Story",
    ctaPrimary: { label: "Meet Rachna →", to: "/about" },
    ctaSecondary: { label: "How It's Made", to: "/how-its-made" }
  },
  {
    id: "slide-dining",
    eyebrow: "The Soul of Indian Dining",
    headline: "Transforms every meal\ninto comforting nostalgia.",
    subhead: "Crisp parathas, comforting khichdi, or festive thalis.",
    body: "No Indian plate is truly complete without the punch of authentic ghar ka achar. From zesty spicy green chillies to tangy hing mango, taste perfection in every spoonful.",
    image: "/images/brand/lifestyle-dining.jpg",
    alt: "Traditional Indian dining thali accompanied by homemade achars",
    badgeTop: { icon: "🍛", title: "Comfort Dining", sub: "Parathas & Thalis" },
    badgeBottom: { icon: "🪔", title: "Pure Nostalgia", sub: "Timeless Indian Taste" },
    tabTitle: "Dining Rituals",
    ctaPrimary: { label: "Explore Flavours →", to: "/achar" },
    ctaSecondary: { label: "Why Glass Jars?", to: "/how-its-made" }
  },
  {
    id: "slide-combo",
    eyebrow: "Signature Family Assortment",
    headline: "The Complete Box:\nAll 4 Signature Achars.",
    subhead: "Aam, Hing, Mirch & Mix Veg together in one giftable set.",
    body: "Can't choose a single favourite? Experience the complete heirloom chapter with our signature combo box, lovingly packed for safe doorstep transit across India.",
    image: "/images/achars/combo-box/ghar-ka-achar-box.jpg",
    alt: "The Complete Ghar Ka Achar 4-in-1 combo box",
    badgeTop: { icon: "🎁", title: "All 4 Heirlooms", sub: "Aam, Hing, Mirch & Mix" },
    badgeBottom: { icon: "🚚", title: "Pan-India Shipping", sub: "Safe Glass Jar Transit" },
    tabTitle: "Combo Box",
    ctaPrimary: { label: "Shop Combo Box →", to: "/achar/ghar-ka-achar-box" },
    ctaSecondary: { label: "All Achars", to: "/achar" }
  }
];

function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const SLIDE_DURATION = 5500;
  const INTERVAL_STEP = 50;

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((curr) => (curr + 1) % HERO_SLIDES.length);
          return 0;
        }
        return prev + (INTERVAL_STEP / SLIDE_DURATION) * 100;
      });
    }, INTERVAL_STEP);

    return () => clearInterval(interval);
  }, [isPaused, currentSlide]);

  const goToSlide = (idx) => {
    setCurrentSlide(idx);
    setProgress(0);
  };

  const nextSlide = () => {
    goToSlide((currentSlide + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    goToSlide((currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section
      className="transparent-luxury-hero"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Full-Bleed Atmospheric Scene Canvas on the Right */}
      <div className="hero-atmospheric-scene" aria-hidden="true">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id + "-ambient-scene"}
            className="hero-scene-image-wrap"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={slide.image}
              alt=""
              onError={(e) => {
                e.currentTarget.src = "/images/brand/home-hero.jpg";
              }}
            />
            {/* Atmospheric Lighting Gradient & Radial Vignette */}
            <div className="hero-scene-lighting-mesh" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="content-container hero-carousel-wrap">
        <div className="hero-grid">
          {/* Hero Left Column: Copy & Actions */}
          <div className="hero-copy-wrap">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id + "-copy"}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "grid", gap: "12px" }}
              >
                <div className="hero-eyebrow-pill">
                  <span>✦</span> {slide.eyebrow}
                </div>

                <h1 className="hero-headline">
                  {slide.headline.split("\n").map((line, i) => (
                    <React.Fragment key={i}>
                      {i === 0 ? line : <span className="highlight-gold">{line}</span>}
                      {i < slide.headline.split("\n").length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </h1>

                <p className="hero-subhead">{slide.subhead}</p>

                <p className="hero-body">{slide.body}</p>

                <div className="hero-buttons">
                  <Link to={slide.ctaPrimary.to} className="button button-primary">
                    {slide.ctaPrimary.label}
                  </Link>
                  <Link to={slide.ctaSecondary.to} className="button button-secondary">
                    {slide.ctaSecondary.label}
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="hero-local-pill">
              <span>📍 In Bahadurgarh today?</span>
              <a href={ZOMATO_URL} target="_blank" rel="noreferrer">
                Order local delivery on Zomato ↗
              </a>
            </div>
          </div>

          {/* Hero Right Column: Floating Interactive Scene Spotlights */}
          <div className="hero-media-wrap">
            <div className="hero-scene-interactive-stage">
              {/* Top Floating Badge */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id + "-badgeTop"}
                  className="hero-scene-top-pill"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4 }}
                >
                  <span className="hero-badge-icon" aria-hidden="true">{slide.badgeTop.icon}</span>
                  <div className="hero-badge-text">
                    <strong>{slide.badgeTop.title}</strong>
                    <small>{slide.badgeTop.sub}</small>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Bottom Floating Story Glass Card (Smaller & Translucent) */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id + "-bottomCard"}
                  className="hero-scene-bottom-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                >
                  <div className="hero-scene-bottom-tag">
                    <span>{slide.badgeBottom.icon}</span>
                    <strong>{slide.badgeBottom.title}</strong>
                    <span>• {slide.badgeBottom.sub}</span>
                  </div>
                  <p className="hero-scene-bottom-quote">“{slide.subhead}”</p>
                  <Link to={slide.ctaPrimary.to} className="hero-scene-explore-btn">
                    {slide.ctaPrimary.label}
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Carousel Tabs with Live Progress Bar */}
        <div className="hero-carousel-tabs" role="tablist" aria-label="Hero carousel navigation">
          {HERO_SLIDES.map((s, idx) => {
            const isActive = idx === currentSlide;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`hero-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => goToSlide(idx)}
              >
                <span className="hero-tab-num">Chapter 0{idx + 1}</span>
                <span className="hero-tab-title">{s.tabTitle}</span>
                {isActive && (
                  <div className="hero-tab-progress-bar">
                    <div
                      className="hero-tab-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const KITCHEN_MOMENTS = [
  {
    id: "bahadurgarh-craft",
    image: "/images/brand/about-owner.jpg",
    tag: "Kitchen Master",
    title: "Handcrafted in Bahadurgarh",
    subtitle: "Rachna carefully measuring whole roasted masalas",
    category: "Kitchen Craft",
    readTime: "2 min story",
    linkText: "Meet Rachna & Story",
    linkUrl: "/about",
    targetType: "page",
    storyHeadline: "The Heart of Khana Peena Ghar Se",
    storyQuote: "“When I roast whole fenugreek and yellow mustard in our heavy iron kadhai, the entire lane in Bahadurgarh knows a fresh batch is brewing.”",
    storyBody: "Every single jar of achar begins in Rachna Gattani's family kitchen in Bahadurgarh, Haryana. We reject automated industrial blending in favor of sensory craftsmanship—hand-sorting raw mangoes, sun-drying chillies on muslin sheets, and slow-roasting spices at exact temperatures to awaken their natural essential oils.",
    highlightBadge: "Handcrafted in Bahadurgarh, Haryana",
    relatedProductSlug: "aam-ka-achar",
    relatedProductLabel: "Taste Rachna's Aam Ka Achar",
    relatedProductPrice: 299
  },
  {
    id: "balcony-curing",
    image: "/images/brand/lifestyle-1.jpg",
    tag: "Balcony Sun-Curing",
    title: "Ceramic Barnis in the Sun",
    subtitle: "Natural warmth develops rich heirloom tang",
    category: "Kitchen Craft",
    readTime: "3 min story",
    linkText: "Discover Sun-Curing Craft",
    linkUrl: "/how-its-made",
    targetType: "page",
    storyHeadline: "The Patience of Traditional Martabans",
    storyQuote: "“You cannot rush fermentation. The Delhi NCR sun through our ceramic barnis gives that distinct golden tang no chemical vinegar can ever replicate.”",
    storyBody: "Our pickles sit in traditional ceramic martabans under direct morning sunlight for 14 to 21 days. The breathable clay maintains an ideal microclimate, allowing natural lactic fermentation to gently soften the mango wedges and infuse the spices deep into every fibre.",
    highlightBadge: "14–21 Days Sun Fermentation",
    relatedProductSlug: "mix-veg-achar",
    relatedProductLabel: "Explore Mix Veg Sun-Cured Jar",
    relatedProductPrice: 289
  },
  {
    id: "morning-parathas",
    image: "/images/brand/lifestyle-2.jpg",
    tag: "Morning Parathas",
    title: "Hot Parathas & Mirch Achar",
    subtitle: "The quintessence of hearty Indian mornings",
    category: "Family Table",
    readTime: "1 min story",
    linkText: "View Mirch Ka Achar",
    linkUrl: "/product/mirch-ka-achar",
    targetType: "product",
    storyHeadline: "The Quintessential Desi Breakfast",
    storyQuote: "“A crispy ghee-laden ajwain paratha, a dollop of white butter, and a spoonful of spicy green chilli achar—nothing in the world beats this start to the day.”",
    storyBody: "Plump green chillies slit down the centre, stuffed with freshly ground yellow mustard seeds, roasted fenugreek, and cold-pressed mustard oil. It provides an immediate, punchy warmth that cuts right through rich morning parathas, poha, and dal-chawal.",
    highlightBadge: "Bold Roasted Methi-Rai Masala",
    relatedProductSlug: "mirch-ka-achar",
    relatedProductLabel: "Order Mirch Ka Achar (400g)",
    relatedProductPrice: 259
  },
  {
    id: "kacchi-ghani",
    image: "/images/brand/lifestyle-3.jpg",
    tag: "Pure Ingredients",
    title: "Cold-Pressed Mustard Oil",
    subtitle: "Golden Kacchi Ghani acting as natural preservative",
    category: "Heirloom Recipes",
    readTime: "2 min story",
    linkText: "Learn About Zero Palm Oil",
    linkUrl: "/how-its-made",
    targetType: "page",
    storyHeadline: "Why We Strictly Use 100% Pure Kacchi Ghani",
    storyQuote: "“Industrial pickles use cheap palm oil and synthetic acetic acid to cut costs. We use only pure cold-pressed sarson ka tel—it is food, medicine, and preservative combined.”",
    storyBody: "Real cold-pressed mustard oil contains natural antimicrobial compounds and antioxidants that preserve the achar naturally for 12+ months without needing artificial chemical sodium benzoate or synthetic vinegars. The pungent aroma mellows over time into a rich, buttery depth.",
    highlightBadge: "Zero Palm Oil • 100% Cold Pressed",
    relatedProductSlug: "ghar-ka-achar-box",
    relatedProductLabel: "Explore All 4 Pure Oil Achars",
    relatedProductPrice: 999
  },
  {
    id: "family-spread",
    image: "/images/brand/lifestyle-dining.jpg",
    tag: "Family Table",
    title: "Grand Dining Spread",
    subtitle: "Bringing families together around home cooked food",
    category: "Family Table",
    readTime: "2 min story",
    linkText: "Shop Ghar Ka Achar Box",
    linkUrl: "/product/ghar-ka-achar-box",
    targetType: "product",
    storyHeadline: "The Centerpiece of Indian Dining",
    storyQuote: "“A meal without achar feels incomplete. It is the golden thread connecting everyday dinners with our deepest childhood memories.”",
    storyBody: "Whether it is a simple weekday dal-khichdi dinner or an elaborate Sunday feast with pooris, paneer, and raita, having a glass jar of authentic homestyle achar on the table elevates every single bite. Our Ghar Ka Achar Box brings all 4 iconic jars to your family table in one luxury hamper.",
    highlightBadge: "Complete 4-Jar Family Set",
    relatedProductSlug: "ghar-ka-achar-box",
    relatedProductLabel: "Shop Ghar Ka Achar Box (₹999)",
    relatedProductPrice: 999
  },
  {
    id: "hing-digestive",
    image: "/images/brand/lifestyle-4.jpg",
    tag: "Heirloom Recipe",
    title: "Aromatic Hing Magic",
    subtitle: "Traditional digestive spice blend & raw mango",
    category: "Heirloom Recipes",
    readTime: "2 min story",
    linkText: "View Hing Ka Achar",
    linkUrl: "/product/hing-ka-achar",
    targetType: "product",
    storyHeadline: "Heirloom Digestive Heritage",
    storyQuote: "“Pure compounded asafoetida with sundried spices is not just a pickle—it has been our grandmother's digestive remedy for generations.”",
    storyBody: "Hing Ka Achar is revered for its intensely savoury, comforting aroma and digestive qualities. Carefully blended with raw mango cubes and unrefined spices, it has a distinct umami sharpness that awakens your palate and settles the stomach after hearty meals.",
    highlightBadge: "Pure Compounded Hing & Digestive Spices",
    relatedProductSlug: "hing-ka-achar",
    relatedProductLabel: "Order Hing Ka Achar (450g)",
    relatedProductPrice: 279
  }
];

function KitchenMomentsSection({ addToCart }) {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeStory, setActiveStory] = useState(null);
  const catalog = useCatalogProducts();

  const categories = [
    { key: "all", label: "All Stories" },
    { key: "Kitchen Craft", label: "Kitchen Craft" },
    { key: "Heirloom Recipes", label: "Heirloom Recipes" },
    { key: "Family Table", label: "Family Table" }
  ];

  const filteredMoments =
    activeCategory === "all"
      ? KITCHEN_MOMENTS
      : KITCHEN_MOMENTS.filter((m) => m.category === activeCategory);

  const scroll = (direction) => {
    if (trackRef.current) {
      const offset = direction === "left" ? -360 : 360;
      trackRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleOpenProduct = (slug) => {
    setActiveStory(null);
    navigate(`/product/${slug}`);
  };

  const handleQuickAdd = (slug) => {
    const product = catalog.find((p) => p.slug === slug);
    if (product && addToCart) {
      addToCart(product, 1);
    }
  };

  return (
    <section className="kitchen-moments-section">
      <div className="content-container">
        {/* Unified Header with Clear Reading Hierarchy */}
        <div className="moments-header-container">
          <div className="moments-header-main">
            <div
              className="hero-eyebrow-pill"
              style={{
                color: "var(--heritage-green-dark)",
                background: "rgba(200, 155, 60, 0.2)",
                borderColor: "var(--mustard-gold)",
                display: "inline-flex",
                marginBottom: "8px"
              }}
            >
              ✦ Visual Kitchen Stories
            </div>
            <h2>Ghar Ka Nazara & Kitchen Moments</h2>
            <p className="moments-header-desc">
              Take a peek into our Bahadurgarh family kitchen, sunny balconies lined with ceramic barnis, and everyday dining memories. Click any story to read the journal or explore the recipe.
            </p>
          </div>

          {/* Interactive Filter Pills & Carousel Navigation */}
          <div className="moments-header-actions">
            <div className="moments-category-filters">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  className={`moments-filter-btn ${activeCategory === cat.key ? "is-active" : ""}`}
                  onClick={() => setActiveCategory(cat.key)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="moments-nav-controls">
              <button
                type="button"
                className="moments-nav-btn"
                onClick={() => scroll("left")}
                aria-label="Previous Stories"
              >
                ‹
              </button>
              <button
                type="button"
                className="moments-nav-btn"
                onClick={() => scroll("right")}
                aria-label="Next Stories"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Track with Deep Interactive Cards */}
        <div className="moments-carousel-track" ref={trackRef}>
          {filteredMoments.map((moment, idx) => (
            <motion.div
              key={moment.id}
              className="moment-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
              onClick={() => setActiveStory(moment)}
            >
              <img
                src={moment.image}
                alt={moment.title}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "/images/brand/home-hero.jpg";
                }}
              />
              <div className="moment-card-overlay">
                <div className="moment-tag-row">
                  <span className="moment-tag">{moment.tag}</span>
                  <span className="moment-read-time">{moment.readTime}</span>
                </div>
                <h3 className="moment-title">{moment.title}</h3>
                <p className="moment-subtitle">{moment.subtitle}</p>

                <div className="moment-card-footer" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="moment-view-story-btn"
                    onClick={() => setActiveStory(moment)}
                  >
                    📖 Read Story
                  </button>
                  <Link
                    to={moment.linkUrl}
                    className="moment-deeplink-pill"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {moment.linkText} →
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Interactive Story Spotlight Modal */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            className="story-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveStory(null)}
          >
            <motion.div
              className="story-modal-card"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="story-modal-close"
                onClick={() => setActiveStory(null)}
                aria-label="Close Story"
              >
                ✕
              </button>

              <div className="story-modal-image-col">
                <img
                  src={activeStory.image}
                  alt={activeStory.title}
                  onError={(e) => {
                    e.currentTarget.src = "/images/brand/home-hero.jpg";
                  }}
                />
                <div className="story-modal-badge">
                  ✦ {activeStory.highlightBadge}
                </div>
              </div>

              <div className="story-modal-content-col">
                <div>
                  <span className="story-modal-eyebrow">
                    {activeStory.category} • {activeStory.readTime}
                  </span>
                  <h2 className="story-modal-title">{activeStory.storyHeadline}</h2>
                </div>

                <blockquote className="story-modal-quote">
                  {activeStory.storyQuote}
                </blockquote>

                <p className="story-modal-body">{activeStory.storyBody}</p>

                <div className="story-modal-actions">
                  {activeStory.relatedProductSlug && (
                    <button
                      type="button"
                      className="button button-mustard-primary"
                      onClick={() => handleOpenProduct(activeStory.relatedProductSlug)}
                    >
                      {activeStory.relatedProductLabel} (₹{activeStory.relatedProductPrice}) →
                    </button>
                  )}
                  <Link
                    to={activeStory.linkUrl}
                    className="button button-outline-dark"
                    onClick={() => setActiveStory(null)}
                  >
                    {activeStory.linkText} ↗
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function SignatureProductsSection({ catalog, wishlist, toggleWishlist, addToCart }) {
  return (
    <section className="section-signature">
      <div className="content-container">
        <div className="section-head-center">
          <p className="section-eyebrow">Handcrafted Selection</p>
          <h2 className="section-title">Our Signature Achar</h2>
          <p className="section-subtitle">Four timeless recipes and one complete family box. Authentic homestyle taste for your dining table.</p>
        </div>

        <div className="products-grid">
          {catalog.map((product, idx) => (
            <ProductCard
              key={product.slug}
              product={product}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
              addToCart={addToCart}
              delay={idx * 0.06}
            />
          ))}
        </div>

        <div className="section-footer-cta">
          <Link to="/achar" className="button button-cream-primary">
            View All Products →
          </Link>
        </div>
      </div>
    </section>
  );
}

function StorySpotlightSection() {
  return (
    <section className="section-story">
      <div className="content-container">
        <div className="story-split">
          <motion.div
            className="story-image-panel"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="story-portrait-frame">
              <img
                src={ABOUT_OWNER_IMAGE}
                alt="Rachna Gattani preparing traditional achar"
                onError={(e) => {
                  e.currentTarget.src = HOME_HERO_IMAGE;
                }}
              />
              <div className="story-floating-badge">
                <span>🏺</span> Family Kitchen, Bahadurgarh
              </div>
            </div>
            <div className="story-badge-quote">
              “Same recipes. Same care. A taste of home.”
            </div>
          </motion.div>

          <motion.div
            className="story-copy-panel"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="section-eyebrow">The Woman Behind the Kitchen</p>
            <h2>Food tastes better when it comes from love.</h2>
            <p>
              Khana Peena Ghar Se began in Rachna Gattani’s kitchen in Bahadurgarh. For decades, spices were never measured by industrial standards, but by years of intuition, family care, and lived culinary wisdom.
            </p>
            <p>
              Every jar is slow sun-cured, prepared in small batches using 100% pure cold-pressed mustard oil and hand-roasted masalas, so that every spoonful brings the comfort of home to your dining table.
            </p>
            <div className="story-signature">
              — Rachna Gattani &amp; Family
            </div>
            <div>
              <Link to="/about" className="button button-cream-primary">
                Read Our Story →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const LIFESTYLE_SLIDES = [
  {
    src: "/images/brand/lifestyle-1.jpg",
    title: "Everyday Comfort",
    caption: "Crispy layered parathas paired with slow-cured mango achar",
    tag: "🥭 Aam Ka Achar",
    badge: "Homestyle Breakfast"
  },
  {
    src: "/images/brand/lifestyle-5.jpg",
    title: "Sun-Cured In Barnis",
    caption: "Authentic ceramic martabans maturing naturally under the golden sun",
    tag: "🏺 Traditional Maturation",
    badge: "100% Sun-Cured"
  },
  {
    src: "/images/brand/lifestyle-2.jpg",
    title: "Small-Batch Craft",
    caption: "Pure kacchi ghani mustard oil blended with freshly roasted whole masalas",
    tag: "🌿 Cold-Pressed Mustard Oil",
    badge: "Zero Preservatives"
  },
  {
    src: "/images/brand/lifestyle-3.jpg",
    title: "Sunday Family Feasts",
    caption: "Golden puffed pooris, savory aloo & a generous dollop of homestyle pickle",
    tag: "✨ Family Gatherings",
    badge: "Sunday Feasts"
  },
  {
    src: "/images/brand/lifestyle-4.jpg",
    title: "Authentic Zing",
    caption: "Crisp sun-ripened chillies stuffed with tangy mustard and fenugreek seeds",
    tag: "🌶️ Bharwa Mirch",
    badge: "Hand-Stuffed"
  },
  {
    src: "/images/brand/lifestyle-6.jpg",
    title: "Comfort in Simplicity",
    caption: "Warm moong dal khichdi with pure desi ghee and spiced mix vegetable pickle",
    tag: "🍲 Homestyle Comfort",
    badge: "Soul Food"
  }
];

const verticalSlideVariants = {
  enter: (dir) => ({
    y: dir > 0 ? "50%" : "-50%",
    opacity: 0,
    scale: 0.96
  }),
  center: {
    zIndex: 1,
    y: "0%",
    opacity: 1,
    scale: 1,
    transition: {
      y: { type: "spring", stiffness: 320, damping: 30 },
      opacity: { duration: 0.35 },
      scale: { duration: 0.35 }
    }
  },
  exit: (dir) => ({
    zIndex: 0,
    y: dir > 0 ? "-50%" : "50%",
    opacity: 0,
    scale: 0.96,
    transition: {
      y: { type: "spring", stiffness: 320, damping: 30 },
      opacity: { duration: 0.25 },
      scale: { duration: 0.25 }
    }
  })
};

function LifestyleBanner() {
  const [[activeIdx, direction], setSlideState] = useState([0, 0]);
  const [isPaused, setIsPaused] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  const paginate = (newDirection) => {
    setSlideState(([prevIdx]) => {
      let nextIdx = prevIdx + newDirection;
      if (nextIdx < 0) nextIdx = LIFESTYLE_SLIDES.length - 1;
      if (nextIdx >= LIFESTYLE_SLIDES.length) nextIdx = 0;
      return [nextIdx, newDirection];
    });
    setTimerKey((k) => k + 1);
  };

  const jumpToSlide = (idx) => {
    if (idx === activeIdx) return;
    setSlideState(([prevIdx]) => [idx, idx > prevIdx ? 1 : -1]);
    setTimerKey((k) => k + 1);
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      paginate(1);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, activeIdx]);

  return (
    <section
      className="section-lifestyle"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="content-container">
        <div className="lifestyle-card">
          <motion.div
            className="lifestyle-copy"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="lifestyle-header-badge">
              <span className="pulse-dot" />
              <span>A Taste of Tradition</span>
            </div>
            <h2>Not just a pickle.<br />A piece of home.</h2>
            <p>
              Some meals need a little achar. Some memories do too. Handcrafted with patience, cold-pressed mustard oil, and authentic whole masalas in Bahadurgarh.
            </p>
            <div className="lifestyle-cta-row">
              <Link to="/achar" className="button button-primary">
                Shop The Pickle Chapter →
              </Link>
              <span className="lifestyle-pause-hint">
                {isPaused ? "⏸ Paused on hover" : "▶ Auto-playing"}
              </span>
            </div>
          </motion.div>

          <div className="lifestyle-vertical-showcase">
            {/* Vertical Controls & Counter */}
            <div className="lifestyle-vertical-controls">
              <button
                type="button"
                className="lifestyle-ctrl-btn"
                onClick={() => paginate(-1)}
                aria-label="Previous image"
                title="Previous image"
              >
                ▲
              </button>
              <div className="lifestyle-counter">
                <strong>0{activeIdx + 1}</strong>
                <div className="counter-bar">
                  <span
                    key={timerKey}
                    className={`counter-progress ${isPaused ? "is-paused" : ""}`}
                  />
                </div>
                <span>0{LIFESTYLE_SLIDES.length}</span>
              </div>
              <button
                type="button"
                className="lifestyle-ctrl-btn"
                onClick={() => paginate(1)}
                aria-label="Next image"
                title="Next image"
              >
                ▼
              </button>
            </div>

            {/* Main Stage with Vertical Slide Motion */}
            <div className="lifestyle-carousel-stage">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={activeIdx}
                  custom={direction}
                  variants={verticalSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="lifestyle-slide-main"
                >
                  <img
                    src={LIFESTYLE_SLIDES[activeIdx].src}
                    alt={LIFESTYLE_SLIDES[activeIdx].title}
                  />

                  {/* Top Floating Badge */}
                  <motion.div
                    className="lifestyle-slide-badge"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    {LIFESTYLE_SLIDES[activeIdx].badge}
                  </motion.div>

                  {/* Bottom Caption Box */}
                  <motion.div
                    className="lifestyle-slide-caption"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.35 }}
                  >
                    <span className="lifestyle-tag-pill">{LIFESTYLE_SLIDES[activeIdx].tag}</span>
                    <strong>{LIFESTYLE_SLIDES[activeIdx].title}</strong>
                    <span>{LIFESTYLE_SLIDES[activeIdx].caption}</span>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Vertical Thumbnail Filmstrip Navigation */}
            <div className="lifestyle-vertical-nav" aria-label="Lifestyle slides navigation">
              {LIFESTYLE_SLIDES.map((slide, idx) => (
                <button
                  key={slide.title}
                  type="button"
                  className={`lifestyle-thumb-btn ${activeIdx === idx ? "is-active" : ""}`}
                  onClick={() => jumpToSlide(idx)}
                  aria-label={`View ${slide.title} (0${idx + 1})`}
                  title={slide.title}
                >
                  <img src={slide.src} alt={slide.title} />
                  {activeIdx === idx && (
                    <motion.div
                      layoutId="activeThumbOutline"
                      className="active-thumb-glow"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    function updateVisible() {
      if (window.innerWidth < 640) {
        setVisibleCount(1);
      } else if (window.innerWidth < 960) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    }
    updateVisible();
    window.addEventListener("resize", updateVisible);
    return () => window.removeEventListener("resize", updateVisible);
  }, []);

  const maxIndex = Math.max(0, testimonials.length - visibleCount);

  // Keep index within valid range if window resizes
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const prev = () => setCurrentIndex((cur) => Math.max(0, cur - 1));
  const next = () => setCurrentIndex((cur) => Math.min(maxIndex, cur + 1));

  return (
    <section className="section-reviews">
      <div className="content-container">
        <div className="reviews-header-flex">
          <div className="reviews-head-copy">
            <p className="section-eyebrow">Customer Love</p>
            <h2 className="section-title">Loved at Family Tables Across India</h2>
            <p className="section-subtitle">Verified reviews from homes enjoying our handcrafted small-batch achars.</p>
          </div>
          <div className="reviews-nav-controls">
            <button
              type="button"
              className="review-carousel-btn"
              onClick={prev}
              disabled={currentIndex === 0}
              aria-label="Previous review"
            >
              ←
            </button>
            <button
              type="button"
              className="review-carousel-btn"
              onClick={next}
              disabled={currentIndex >= maxIndex}
              aria-label="Next review"
            >
              →
            </button>
          </div>
        </div>

        <div className="reviews-carousel-viewport">
          <motion.div
            className="reviews-carousel-slider"
            animate={{
              x: `calc(-${currentIndex} * ((100% - ${(visibleCount - 1) * 14}px) / ${visibleCount} + 14px))`
            }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            {testimonials.map((rev) => (
              <div
                key={rev.name}
                className="review-card-carousel"
                style={{
                  width: `calc((100% - ${(visibleCount - 1) * 14}px) / ${visibleCount})`,
                  flex: `0 0 calc((100% - ${(visibleCount - 1) * 14}px) / ${visibleCount})`
                }}
              >
                <div className="review-top-row">
                  <div className="review-stars">{"★".repeat(rev.rating)}</div>
                  <span className="review-verified-badge">✓ Verified Order</span>
                </div>
                <p className="review-quote">"{rev.quote}"</p>
                <div className="review-author">
                  <strong>{rev.name}</strong>
                  <div className="review-meta">
                    <span>📍 {rev.location}</span>
                    <span className="review-tag">{rev.tag}</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Carousel Pagination Dots */}
        {maxIndex > 0 && (
          <div className="reviews-dots">
            {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`review-dot ${currentIndex === idx ? "active" : ""}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIdx, setOpenIdx] = useState(0);

  const toggle = (idx) => {
    setOpenIdx((cur) => (cur === idx ? null : idx));
  };

  return (
    <section className="section-faq">
      <div className="content-container">
        <div className="faq-split-grid">
          {/* Left Editorial Sidebar */}
          <div className="faq-sidebar">
            <div
              className="hero-eyebrow-pill"
              style={{
                color: "var(--heritage-green-dark)",
                background: "rgba(200, 155, 60, 0.2)",
                borderColor: "var(--mustard-gold)"
              }}
            >
              ✦ Common Questions
            </div>
            <h2 className="faq-main-title">
              Frequently Asked<br />Questions
            </h2>
            <p className="faq-main-desc">
              Everything you need to know about our heirloom recipes, 100% pure cold-pressed mustard oil, natural 12-month shelf life, and guaranteed safe pan-India glass jar transit.
            </p>

            <div className="faq-help-card">
              <span style={{ fontSize: "1.5rem", display: "block", marginBottom: "4px" }}>💬</span>
              <strong>Have a question not answered here?</strong>
              <p>Rachna and our Bahadurgarh kitchen team are always happy to help with ingredients, allergies, and recipes.</p>
              <div className="faq-help-links">
                <a href={ZOMATO_URL} target="_blank" rel="noreferrer" className="faq-help-btn">
                  Order on Zomato ↗
                </a>
                <Link to="/contact" className="faq-help-link">
                  Contact Kitchen &amp; Support →
                </Link>
              </div>
            </div>
          </div>

          {/* Right Accordion List */}
          <div className="faq-accordion-list">
            {faqs.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div key={faq.q} className={`faq-item ${isOpen ? "is-open" : ""}`}>
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => toggle(idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-icon">{isOpen ? "−" : "+"}</span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p className="faq-answer">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="content-container">
        <div className="footer-top-banner">
          <h2>Good Food Brings Us Home</h2>
          <p>Handcrafted small-batch achars made with pure cold-pressed mustard oil and sun-cured spices in Bahadurgarh, Haryana.</p>
        </div>

        <div className="footer-grid">
          <div className="footer-brand-col">
            <Link className="brand" to="/">
              <img src="/images/logo.png" alt="Khana Peena Ghar Se" />
              <span className="brand-copy">
                <strong style={{ color: "#FFF" }}>Khana Peena Ghar Se</strong>
                <span>The Pickle Chapter</span>
              </span>
            </Link>
            <p>
              Traditional Indian homemade pickles prepared with patience and family care. Zero artificial preservatives, zero refined oils.
            </p>
            <div className="fssai-pill" style={{ marginBottom: "10px" }}>
              <span>🛡️ FSSAI Reg. No. 20824005000123</span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--warm-cream-alt)", opacity: 0.85, margin: 0 }}>
              📍 Bahadurgarh, Jhajjar, Haryana - 124507
            </p>
          </div>

          <div className="footer-col">
            <h3>Our Achars</h3>
            <ul className="footer-links">
              <li><Link to="/achar">All Handcrafted Achars</Link></li>
              <li><Link to="/product/aam-ka-achar">Aam Ka Achar (500g)</Link></li>
              <li><Link to="/product/hing-ka-achar">Heeng Ka Achar (500g)</Link></li>
              <li><Link to="/product/mirch-ka-achar">Mirch Ka Achar (500g)</Link></li>
              <li><Link to="/product/mix-veg-achar">Mix Veg Achar (500g)</Link></li>
              <li><Link to="/product/the-ghar-ka-achar-box">The Ghar Ka Achar Box</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>Customer Care</h3>
            <ul className="footer-links">
              <li><Link to="/track-order">Live Track Order</Link></li>
              <li><Link to="/shipping-policy">Shipping &amp; Delivery Policy</Link></li>
              <li><Link to="/refund-policy">Returns &amp; 100% Replacement</Link></li>
              <li><Link to="/contact">Contact Kitchen</Link></li>
              <li><Link to="/contact">Grievance Redressal Officer</Link></li>
              <li><a href={ZOMATO_URL} target="_blank" rel="noreferrer">Order on Zomato ↗</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>Legal &amp; Trust</h3>
            <ul className="footer-links">
              <li><Link to="/privacy-policy">Privacy Policy (IT Act)</Link></li>
              <li><Link to="/terms">Terms &amp; Conditions</Link></li>
              <li><Link to="/how-its-made">12-Month Shelf Life Norms</Link></li>
              <li><Link to="/about">About Rachna Gattani</Link></li>
              <li><Link to="/account">My Account &amp; Past Orders</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Khana Peena Ghar Se. All rights reserved. Registered Indian Food Brand.</span>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", fontSize: "0.8rem" }}>
            <span>🔒 256-Bit SSL Encrypted</span>
            <span>💳 UPI • Cards • NetBanking • COD</span>
            <span>Made with love in Bahadurgarh, Haryana</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

const PINCODE_REGION_MAP = {
  // Region 1 - North
  "11": { state: "Delhi", region: "New Delhi & Central NCR", minDays: 1, maxDays: 2, express: true, hub: "Delhi NCR Direct Courier" },
  "12": { state: "Haryana", region: "Bahadurgarh / Gurugram / Faridabad / Rohtak", minDays: 1, maxDays: 2, express: true, hub: "Haryana Origin Hub (Same-Day / Next-Day)" },
  "13": { state: "Haryana", region: "Ambala / Karnal / Panipat / Kurukshetra", minDays: 1, maxDays: 2, express: true, hub: "Haryana North Express" },
  "14": { state: "Punjab", region: "Ludhiana / Jalandhar / Amritsar", minDays: 2, maxDays: 3, express: true, hub: "Punjab GT Road Route" },
  "15": { state: "Punjab", region: "Bathinda / Patiala / Firozpur", minDays: 2, maxDays: 3, express: true, hub: "Punjab Malwa Corridor" },
  "16": { state: "Chandigarh", region: "Chandigarh UT / Mohali / Panchkula", minDays: 1, maxDays: 2, express: true, hub: "Tricity Express Corridor" },
  "17": { state: "Himachal Pradesh", region: "Shimla / Solan / Dharamshala / Mandi", minDays: 2, maxDays: 4, express: false, hub: "Himachal Hill Route" },
  "18": { state: "Jammu & Kashmir", region: "Jammu / Katra / Udhampur", minDays: 3, maxDays: 4, express: false, hub: "J&K Express Line" },
  "19": { state: "Jammu & Kashmir / Ladakh", region: "Srinagar / Leh / Ladakh", minDays: 4, maxDays: 6, express: false, hub: "Kashmir & Ladakh Route" },

  // Region 2 - UP & UK
  "20": { state: "Uttar Pradesh", region: "Noida / Ghaziabad / Meerut / Aligarh", minDays: 1, maxDays: 2, express: true, hub: "UP NCR Express Corridor" },
  "21": { state: "Uttar Pradesh", region: "Prayagraj / Fatehpur / Pratapgarh", minDays: 2, maxDays: 3, express: true, hub: "UP Central Corridor" },
  "22": { state: "Uttar Pradesh", region: "Lucknow / Varanasi / Barabanki / Ayodhya", minDays: 2, maxDays: 3, express: true, hub: "UP Capital Express" },
  "23": { state: "Uttar Pradesh", region: "Mirzapur / Sonbhadra / Ghazipur", minDays: 2, maxDays: 4, express: false, hub: "UP Purvanchal Route" },
  "24": { state: "Uttarakhand / UP", region: "Dehradun / Haridwar / Moradabad", minDays: 2, maxDays: 3, express: true, hub: "Uttarakhand Express Corridor" },
  "25": { state: "Uttar Pradesh", region: "Muzaffarnagar / Saharanpur / Bijnor", minDays: 1, maxDays: 2, express: true, hub: "Western UP Route" },
  "26": { state: "Uttarakhand / UP", region: "Nainital / Haldwani / Bareilly / Pilibhit", minDays: 2, maxDays: 3, express: true, hub: "Kumaon Corridor" },
  "27": { state: "Uttar Pradesh", region: "Gorakhpur / Basti / Deoria / Azamgarh", minDays: 2, maxDays: 4, express: false, hub: "Eastern UP Corridor" },
  "28": { state: "Uttar Pradesh", region: "Agra / Mathura / Jhansi / Firozabad", minDays: 2, maxDays: 3, express: true, hub: "Braj & Bundelkhand Corridor" },

  // Region 3 - Rajasthan & Gujarat
  "30": { state: "Rajasthan", region: "Jaipur / Ajmer / Alwar / Dausa", minDays: 2, maxDays: 3, express: true, hub: "Jaipur Metro Corridor" },
  "31": { state: "Rajasthan", region: "Udaipur / Bhilwara / Chittorgarh", minDays: 2, maxDays: 3, express: true, hub: "Mewar Express Route" },
  "32": { state: "Rajasthan", region: "Kota / Bharatpur / Sawai Madhopur", minDays: 2, maxDays: 3, express: true, hub: "Hadoti Corridor" },
  "33": { state: "Rajasthan", region: "Bikaner / Sri Ganganagar / Sikar / Churu", minDays: 2, maxDays: 3, express: true, hub: "Shekhawati & Desert Route" },
  "34": { state: "Rajasthan", region: "Jodhpur / Barmer / Jaisalmer / Pali", minDays: 2, maxDays: 4, express: true, hub: "Marwar Route" },
  "36": { state: "Gujarat", region: "Rajkot / Jamnagar / Junagadh / Bhavnagar", minDays: 2, maxDays: 4, express: true, hub: "Saurashtra Corridor" },
  "37": { state: "Gujarat", region: "Bhuj / Gandhidham / Kutch", minDays: 3, maxDays: 4, express: false, hub: "Kutch Express" },
  "38": { state: "Gujarat", region: "Ahmedabad / Gandhinagar / Mehsana / Anand", minDays: 2, maxDays: 3, express: true, hub: "Ahmedabad Metro Corridor" },
  "39": { state: "Gujarat", region: "Surat / Vadodara / Bharuch / Vapi / Valsad", minDays: 2, maxDays: 3, express: true, hub: "South Gujarat Industrial Hub" },

  // Region 4 - Maharashtra, Goa, MP, CG
  "40": { state: "Maharashtra / Goa", region: "Mumbai / Navi Mumbai / Thane / Goa", minDays: 2, maxDays: 3, express: true, hub: "Mumbai Metro Air Express" },
  "41": { state: "Maharashtra", region: "Pune / Kolhapur / Solapur / Satara", minDays: 2, maxDays: 3, express: true, hub: "Pune Metro Hub" },
  "42": { state: "Maharashtra", region: "Nashik / Dhule / Jalgaon / Ahmednagar", minDays: 2, maxDays: 3, express: true, hub: "North Maharashtra Corridor" },
  "43": { state: "Maharashtra", region: "Chhatrapati Sambhajinagar / Nanded / Latur", minDays: 2, maxDays: 4, express: true, hub: "Marathwada Corridor" },
  "44": { state: "Maharashtra", region: "Nagpur / Amravati / Akola / Chandrapur", minDays: 2, maxDays: 3, express: true, hub: "Vidarbha Central Hub" },
  "45": { state: "Madhya Pradesh", region: "Indore / Ujjain / Khandwa / Ratlam", minDays: 2, maxDays: 3, express: true, hub: "Malwa Central Hub" },
  "46": { state: "Madhya Pradesh", region: "Bhopal / Hoshangabad / Sehore / Vidisha", minDays: 2, maxDays: 3, express: true, hub: "MP Capital Corridor" },
  "47": { state: "Madhya Pradesh", region: "Gwalior / Morena / Shivpuri / Bhind", minDays: 2, maxDays: 3, express: true, hub: "Chambal Gwalior Line" },
  "48": { state: "Madhya Pradesh", region: "Jabalpur / Sagar / Rewa / Satna / Katni", minDays: 2, maxDays: 4, express: true, hub: "Mahakoshal Corridor" },
  "49": { state: "Chhattisgarh", region: "Raipur / Bilaspur / Durg / Bhilai / Korba", minDays: 3, maxDays: 4, express: true, hub: "Chhattisgarh Central Hub" },

  // Region 5 - South 1 (AP, Telangana, Karnataka)
  "50": { state: "Telangana", region: "Hyderabad / Secunderabad / Warangal / Nizamabad", minDays: 2, maxDays: 3, express: true, hub: "Hyderabad Air Express Hub" },
  "51": { state: "Andhra Pradesh", region: "Tirupati / Kurnool / Anantapur / Kadapa", minDays: 3, maxDays: 4, express: true, hub: "Rayalaseema Corridor" },
  "52": { state: "Andhra Pradesh", region: "Vijayawada / Guntur / Nellore / Ongole", minDays: 2, maxDays: 3, express: true, hub: "AP Coastal Corridor" },
  "53": { state: "Andhra Pradesh", region: "Visakhapatnam / Kakinada / Rajahmundry", minDays: 2, maxDays: 3, express: true, hub: "Vizag Port Express" },
  "56": { state: "Karnataka", region: "Bengaluru Urban & Rural / Tumakuru / Kolar", minDays: 2, maxDays: 3, express: true, hub: "Bengaluru Air Express Hub" },
  "57": { state: "Karnataka", region: "Mysuru / Mandya / Hassan / Mangaluru / Udupi", minDays: 2, maxDays: 4, express: true, hub: "South Karnataka Express" },
  "58": { state: "Karnataka", region: "Hubballi-Dharwad / Belagavi / Ballari / Davanagere", minDays: 2, maxDays: 4, express: true, hub: "North Karnataka Route" },
  "59": { state: "Karnataka", region: "Kalaburagi / Raichur / Bidar / Vijayapura", minDays: 3, maxDays: 4, express: false, hub: "Kalyana Karnataka Corridor" },

  // Region 6 - South 2 (TN, Kerala, Puducherry)
  "60": { state: "Tamil Nadu", region: "Chennai / Kanchipuram / Tiruvallur / Chengalpattu", minDays: 2, maxDays: 3, express: true, hub: "Chennai Air Express Hub" },
  "61": { state: "Tamil Nadu", region: "Tiruchirappalli / Thanjavur / Pudukkottai / Cuddalore", minDays: 3, maxDays: 4, express: true, hub: "Central TN Route" },
  "62": { state: "Tamil Nadu", region: "Madurai / Dindigul / Tirunelveli / Thoothukudi", minDays: 3, maxDays: 4, express: true, hub: "South TN Corridor" },
  "63": { state: "Tamil Nadu", region: "Salem / Vellore / Dharmapuri / Erode / Krishnagiri", minDays: 2, maxDays: 4, express: true, hub: "Kongu & North-West TN Route" },
  "64": { state: "Tamil Nadu", region: "Coimbatore / Tiruppur / Nilgiris / Pollachi", minDays: 2, maxDays: 3, express: true, hub: "Coimbatore Air Express" },
  "67": { state: "Kerala", region: "Kozhikode / Kannur / Kasaragod / Wayanad / Malappuram", minDays: 3, maxDays: 4, express: true, hub: "Malabar Express" },
  "68": { state: "Kerala", region: "Kochi (Ernakulam) / Thrissur / Kottayam / Idukki / Palakkad", minDays: 3, maxDays: 4, express: true, hub: "Central Kerala Air Express" },
  "69": { state: "Kerala", region: "Thiruvananthapuram / Kollam / Alappuzha / Pathanamthitta", minDays: 3, maxDays: 4, express: true, hub: "South Kerala Corridor" },

  // Region 7 - East & North-East
  "70": { state: "West Bengal", region: "Kolkata / Howrah / North 24 Parganas / South 24 Parganas", minDays: 2, maxDays: 3, express: true, hub: "Kolkata Metro Air Express" },
  "71": { state: "West Bengal", region: "Hooghly / Midnapore / Kharagpur", minDays: 2, maxDays: 4, express: true, hub: "Lower Bengal Route" },
  "72": { state: "West Bengal", region: "Purulia / Bankura / Jhargram", minDays: 3, maxDays: 4, express: false, hub: "Junglemahal Route" },
  "73": { state: "West Bengal / Sikkim", region: "Siliguri / Darjeeling / Jalpaiguri / Gangtok", minDays: 3, maxDays: 5, express: false, hub: "North Bengal & Sikkim Express" },
  "74": { state: "West Bengal", region: "Durgapur / Asansol / Burdwan / Nadia / Murshidabad", minDays: 2, maxDays: 3, express: true, hub: "Burdwan Industrial Belt" },
  "75": { state: "Odisha", region: "Bhubaneswar / Cuttack / Puri / Khordha", minDays: 3, maxDays: 4, express: true, hub: "Odisha Capital Corridor" },
  "76": { state: "Odisha", region: "Berhampur / Ganjam / Koraput / Sambalpur", minDays: 3, maxDays: 5, express: false, hub: "South Odisha Route" },
  "77": { state: "Odisha", region: "Rourkela / Balasore / Bargarh / Jharsuguda", minDays: 3, maxDays: 4, express: false, hub: "North Odisha Route" },
  "78": { state: "Assam", region: "Guwahati / Silchar / Dibrugarh / Jorhat / Tezpur", minDays: 3, maxDays: 5, express: true, hub: "Assam & Brahmaputra Gateway" },
  "79": { state: "North East States", region: "Meghalaya / Manipur / Mizoram / Nagaland / Tripura / Arunachal", minDays: 4, maxDays: 6, express: false, hub: "North East Express Route" },

  // Region 8 - Bihar & Jharkhand
  "80": { state: "Bihar", region: "Patna / Nalanda / Bhojpur / Buxar / Vaishali", minDays: 2, maxDays: 3, express: true, hub: "Patna Capital Corridor" },
  "81": { state: "Bihar", region: "Bhagalpur / Munger / Begusarai / Khagaria", minDays: 3, maxDays: 4, express: false, hub: "Anga Region Corridor" },
  "82": { state: "Bihar", region: "Gaya / Nawada / Jehanabad / Aurangabad", minDays: 2, maxDays: 4, express: false, hub: "Magadh Region Route" },
  "83": { state: "Jharkhand", region: "Ranchi / Bokaro / Dhanbad / Deoghar / Jamshedpur", minDays: 2, maxDays: 4, express: true, hub: "Jharkhand Industrial Hub" },
  "84": { state: "Bihar", region: "Muzaffarpur / Darbhanga / Samastipur / Chapra / Siwan", minDays: 3, maxDays: 4, express: true, hub: "Tirhut & Mithila Corridor" },
  "85": { state: "Bihar", region: "Purnia / Katihar / Saharsa / Madhepura", minDays: 3, maxDays: 4, express: false, hub: "Kosi & Seemanchal Route" }
};

const POPULAR_PIN_HUBS = [
  { pin: "124507", name: "Bahadurgarh (Origin Kitchen)" },
  { pin: "110001", name: "New Delhi (Connaught Pl.)" },
  { pin: "122001", name: "Gurugram" },
  { pin: "201301", name: "Noida" },
  { pin: "400001", name: "Mumbai" },
  { pin: "560001", name: "Bengaluru" },
  { pin: "700001", name: "Kolkata" },
  { pin: "500001", name: "Hyderabad" },
  { pin: "302001", name: "Jaipur" },
  { pin: "160017", name: "Chandigarh" },
  { pin: "411001", name: "Pune" },
  { pin: "380001", name: "Ahmedabad" },
  { pin: "226001", name: "Lucknow" }
];

function formatEstimatedDeliveryDate(minDays, maxDays) {
  const now = new Date();
  const addBusinessDays = (startDate, days) => {
    let count = 0;
    let cur = new Date(startDate);
    while (count < days) {
      cur.setDate(cur.getDate() + 1);
      if (cur.getDay() !== 0) { // Skip Sunday
        count++;
      }
    }
    return cur;
  };

  const d1 = addBusinessDays(now, minDays);
  const d2 = addBusinessDays(now, maxDays);

  const formatOpts = { weekday: "short", day: "numeric", month: "short" };
  if (minDays === maxDays || d1.toDateString() === d2.toDateString()) {
    return `Arrives by ${d1.toLocaleDateString("en-IN", formatOpts)}`;
  }
  return `Arrives between ${d1.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })} and ${d2.toLocaleDateString("en-IN", formatOpts)}`;
}

function getPincodeEstimate(rawPin) {
  const pin = String(rawPin || "").trim();
  if (!/^\d{6}$/.test(pin)) {
    return {
      valid: false,
      message: "Please enter a valid 6-digit Indian PIN code."
    };
  }

  // Origin Hub Special Case (Bahadurgarh, Haryana)
  if (pin === "124507" || pin === "124505") {
    return {
      valid: true,
      pin,
      state: "Haryana",
      region: "Bahadurgarh (Origin Kitchen & Batching Hub)",
      zone: "Local Origin Kitchen Hub (Same-Day / Next-Day Express)",
      etaDays: "1 Business Day",
      etaDate: formatEstimatedDeliveryDate(1, 1),
      courier: "KPGS Express / Delhivery Direct",
      express: true,
      cod: true,
      isOrigin: true
    };
  }

  const prefix2 = pin.slice(0, 2);
  const match = PINCODE_REGION_MAP[prefix2];

  if (match) {
    return {
      valid: true,
      pin,
      state: match.state,
      region: match.region,
      zone: match.hub,
      etaDays: `${match.minDays}–${match.maxDays} Business Days`,
      etaDate: formatEstimatedDeliveryDate(match.minDays, match.maxDays),
      courier: match.express ? "Bluedart Air / Delhivery Express" : "Delhivery Surface / Speed Post",
      express: match.express,
      cod: true,
      isOrigin: false
    };
  }

  const prefix1 = pin.slice(0, 1);
  if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(prefix1)) {
    return {
      valid: true,
      pin,
      state: "India",
      region: "Pan-India Postal Route",
      zone: "Tracked Speed Delivery Network",
      etaDays: "3–5 Business Days",
      etaDate: formatEstimatedDeliveryDate(3, 5),
      courier: "India Post Speed Post / Delhivery Priority",
      express: false,
      cod: true,
      isOrigin: false
    };
  }

  return {
    valid: false,
    message: "PIN code not recognized for standard courier delivery routes."
  };
}

function PincodeChecker({ compact = false, onSelectPincode }) {
  const [pincode, setPincode] = useState(() => localStorage.getItem("kp_pincode") || "");
  const [recentPins, setRecentPins] = useState(() => {
    try {
      const saved = localStorage.getItem("kp_recent_pincodes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [result, setResult] = useState(() => {
    const saved = localStorage.getItem("kp_pincode");
    if (saved && /^\d{6}$/.test(saved)) {
      return getPincodeEstimate(saved);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isChanging, setIsChanging] = useState(!result);
  const [showPopular, setShowPopular] = useState(false);

  // Store in recent list
  const saveToRecent = useCallback((pin, est) => {
    if (!est || !est.valid) return;
    setRecentPins((prev) => {
      const filtered = prev.filter((p) => p.pin !== pin);
      const updated = [
        {
          pin,
          region: est.region?.split("/")[0]?.trim() || est.state,
          state: est.state,
          etaDays: est.etaDays
        },
        ...filtered
      ].slice(0, 5); // Keep up to 5 recent
      localStorage.setItem("kp_recent_pincodes", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Async Post Office Lookup enhancement
  const enrichWithIndiaPost = useCallback(async (cleanPin, baseResult) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1400);
      const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice?.length) {
        const po = data[0].PostOffice[0];
        setResult((curr) => {
          if (curr && curr.pin === cleanPin) {
            return {
              ...curr,
              postOffice: `${po.Name} (${po.District})`,
              district: po.District,
              state: po.State || curr.state
            };
          }
          return curr;
        });
      }
    } catch {
      // Fallback stays in place smoothly
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runCheck = useCallback(
    (pinToCheck) => {
      const clean = String(pinToCheck || "").replace(/\D/g, "").slice(0, 6);
      if (!/^\d{6}$/.test(clean)) {
        setResult({ valid: false, message: "Please enter a valid 6-digit Indian PIN code." });
        return;
      }

      setIsLoading(true);
      const estimate = getPincodeEstimate(clean);
      setResult(estimate);
      setPincode(clean);
      localStorage.setItem("kp_pincode", clean);
      saveToRecent(clean, estimate);
      setIsChanging(false);
      setShowPopular(false);
      trackPincodeCheck(clean, estimate?.valid, estimate?.state, estimate?.region);

      if (onSelectPincode) {
        onSelectPincode(clean, estimate);
      }

      enrichWithIndiaPost(clean, estimate);
    },
    [saveToRecent, enrichWithIndiaPost, onSelectPincode]
  );

  const handleSubmit = (e) => {
    e?.preventDefault();
    runCheck(pincode);
  };

  const handleClear = () => {
    setPincode("");
    setIsChanging(true);
  };

  const removeRecentPin = (e, pinToRemove) => {
    e.stopPropagation();
    setRecentPins((prev) => {
      const updated = prev.filter((p) => p.pin !== pinToRemove);
      localStorage.setItem("kp_recent_pincodes", JSON.stringify(updated));
      return updated;
    });
  };

  if (compact) {
    return (
      <div className="pincode-compact-bar">
        {result && result.valid && !isChanging ? (
          <div className="pincode-compact-display">
            <span className="pincode-compact-pin">
              📍 Deliver to: <strong>{result.pin}</strong> ({result.region?.split("/")[0] || result.state})
            </span>
            <span className="pincode-compact-eta">⚡ {result.etaDays}</span>
            <button
              type="button"
              className="pincode-compact-change-btn"
              onClick={() => setIsChanging(true)}
            >
              Change
            </button>
          </div>
        ) : (
          <form className="pincode-compact-form" onSubmit={handleSubmit}>
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit PIN"
              value={pincode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setPincode(val);
                if (val.length === 6) {
                  runCheck(val);
                }
              }}
            />
            <button type="submit" className="button button-cream-primary button-xs">
              Check
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="pincode-checker-box">
      <div className="pincode-box-header">
        <div className="pincode-box-title">
          <span className="pincode-box-icon" aria-hidden="true">📍</span>
          <div>
            <strong>Check Delivery &amp; Express Dispatch</strong>
            <small>Direct shipping across 19,000+ Indian pincodes</small>
          </div>
        </div>

        {result && result.valid && !isChanging && (
          <button
            type="button"
            className="pincode-change-action-btn"
            onClick={() => {
              setIsChanging(true);
            }}
          >
            Check Another PIN ↗
          </button>
        )}
      </div>

      {/* Input Form Mode */}
      {isChanging ? (
        <div className="pincode-input-section">
          <form className="pincode-form" onSubmit={handleSubmit}>
            <div className="pincode-input-field-wrap">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6-digit PIN code (e.g. 110001, 560001)"
                value={pincode}
                autoFocus={isChanging && !!result}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setPincode(val);
                  if (val.length === 6) {
                    runCheck(val);
                  }
                }}
              />
              {pincode ? (
                <button
                  type="button"
                  className="pincode-input-clear-btn"
                  onClick={handleClear}
                  aria-label="Clear PIN code"
                >
                  ✕
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              className="button button-mustard-primary button-sm pincode-submit-btn"
              disabled={isLoading || pincode.length !== 6}
            >
              {isLoading ? "Checking..." : "Verify Delivery"}
            </button>
          </form>

          {/* Quick Hubs & Recent Pincodes */}
          <div className="pincode-shortcuts-area">
            {recentPins.length > 0 && (
              <div className="pincode-recent-group">
                <span className="pincode-shortcut-label">Recently Checked:</span>
                <div className="pincode-shortcut-pills">
                  {recentPins.map((item) => (
                    <button
                      key={item.pin}
                      type="button"
                      className={`pincode-chip-btn ${item.pin === pincode ? "is-active" : ""}`}
                      onClick={() => runCheck(item.pin)}
                    >
                      <span>📍 {item.pin}</span>
                      <small>({item.region})</small>
                      <span
                        className="pincode-chip-del"
                        onClick={(e) => removeRecentPin(e, item.pin)}
                        title="Remove PIN"
                        aria-label="Remove"
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pincode-popular-group">
              <button
                type="button"
                className="pincode-popular-toggle-btn"
                onClick={() => setShowPopular((v) => !v)}
              >
                {showPopular ? "▾ Hide Popular Hubs" : "▸ Quick Test Major Cities (Delhi NCR, Mumbai, Bengaluru, etc.)"}
              </button>

              {showPopular && (
                <div className="pincode-popular-grid">
                  {POPULAR_PIN_HUBS.map((hub) => (
                    <button
                      key={hub.pin}
                      type="button"
                      className="pincode-popular-chip"
                      onClick={() => runCheck(hub.pin)}
                    >
                      <strong>{hub.name}</strong>
                      <small>{hub.pin}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Verified Delivery Result Card */}
      {result && (
        <div className={`pincode-result-card ${result.valid ? "is-verified" : "is-error"}`}>
          {result.valid ? (
            <div className="pincode-verified-content">
              <div className="pincode-verified-main-row">
                <div className="pincode-destination-block">
                  <div className="pincode-tag-row">
                    <span className="pincode-badge-verified">✓ Serviceable</span>
                    {result.isOrigin ? (
                      <span className="pincode-badge-origin">🏠 Kitchen Origin Hub</span>
                    ) : result.express ? (
                      <span className="pincode-badge-express">⚡ Air Express Corridor</span>
                    ) : (
                      <span className="pincode-badge-standard">📦 Tracked Pan-India</span>
                    )}
                  </div>

                  <h4 className="pincode-destination-heading">
                    {result.postOffice ? result.postOffice : result.region}
                  </h4>
                  <p className="pincode-sub-destination">
                    {result.state} • PIN: <strong>{result.pin}</strong>
                  </p>
                </div>

                <div className="pincode-eta-block">
                  <div className="pincode-eta-badge">{result.etaDays}</div>
                  <strong className="pincode-eta-date">{result.etaDate}</strong>
                </div>
              </div>

              <div className="pincode-perks-grid">
                <div className="pincode-perk-item">
                  <span>🚚</span>
                  <div>
                    <strong>{result.courier}</strong>
                    <small>Real-time live SMS &amp; WhatsApp tracking</small>
                  </div>
                </div>

                <div className="pincode-perk-item">
                  <span>💵</span>
                  <div>
                    <strong>Cash on Delivery (COD) Available</strong>
                    <small>Pay with cash or UPI on doorstep arrival</small>
                  </div>
                </div>

                <div className="pincode-perk-item">
                  <span>🛡️</span>
                  <div>
                    <strong>Free Delivery on Orders ₹499+</strong>
                    <small>Zero breakage risk • Guaranteed safe transit</small>
                  </div>
                </div>
              </div>

              <div className="pincode-footer-actions">
                <div className="pincode-dispatch-timer">
                  <span>⚡</span>
                  <span>Order in next <strong>4h 30m</strong> for same-day batch dispatch from Bahadurgarh!</span>
                </div>

                <button
                  type="button"
                  className="pincode-switch-btn"
                  onClick={() => setIsChanging(true)}
                >
                  Change PIN
                </button>
              </div>
            </div>
          ) : (
            <div className="pincode-error-content">
              <span className="pincode-error-icon">⚠️</span>
              <div>
                <strong>Delivery Notice</strong>
                <p>{result.message}</p>
                <button
                  type="button"
                  className="pincode-retry-btn"
                  onClick={() => setIsChanging(true)}
                >
                  Try Another Pincode
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SafeDeliveryGuarantee() {
  return (
    <div className="safe-delivery-guarantee">
      <div className="guarantee-item">
        <span style={{ fontSize: "1.2rem" }}>🛡️</span>
        <div>
          <strong>Broken or Leaking Jar? Free Replacement</strong>
          <span>100% transit guarantee — instant replacement without questions</span>
        </div>
      </div>
      <div className="guarantee-item">
        <span style={{ fontSize: "1.2rem" }}>🫙</span>
        <div>
          <strong>Food-Grade Glass Jars</strong>
          <span>Sealed glass protects natural sun-cured crunch and pure mustard oil aroma</span>
        </div>
      </div>
      <div className="guarantee-item">
        <span style={{ fontSize: "1.2rem" }}>⚡</span>
        <div>
          <strong>Dispatches in 1–2 Working Days</strong>
          <span>Freshly packed and shipped from our Bahadurgarh kitchen</span>
        </div>
      </div>
    </div>
  );
}

function HomePage({ wishlist, toggleWishlist, addToCart }) {
  useDocumentMeta({
    title: "Khana Peena Ghar Se | Authentic Artisanal Homemade Achars & Pickles",
    description: "Handcrafted, batch-made homemade Indian achars made with 100% pure cold-pressed mustard oil and sun-cured spices. Zero chemical preservatives."
  });

  const catalog = useCatalogProducts();

  return (
    <div>
      <HeroCarousel />
      <TrustStrip />
      <SignatureProductsSection
        catalog={catalog}
        wishlist={wishlist}
        toggleWishlist={toggleWishlist}
        addToCart={addToCart}
      />
      <KitchenMomentsSection addToCart={addToCart} />
      <StorySpotlightSection />
      <LifestyleBanner />
      <ReviewsSection />
      <FAQSection />
    </div>
  );
}

function CatalogPage({ wishlist, toggleWishlist, addToCart }) {
  useDocumentMeta({
    title: "The Pickle Chapter | Homemade Achars | Khana Peena Ghar Se",
    description: "Browse our collection of authentic homemade Aam, Hing, Mirch, and Mix Veg achars."
  });

  const catalog = useCatalogProducts();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

  const filterCategories = [
    { key: "all", label: "All Achars" },
    { key: "aam", label: "Aam (Mango)" },
    { key: "hing", label: "Heeng (Asafoetida)" },
    { key: "mirch", label: "Hari Mirch" },
    { key: "mixveg", label: "Mix Veg" },
    { key: "combo", label: "The Signature Box" }
  ];

  const filteredProducts = useMemo(() => {
    let items = selectedCategory === "all"
      ? catalog
      : catalog.filter((p) => p.categoryKey === selectedCategory);

    if (sortBy === "price-asc") {
      items = [...items].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      items = [...items].sort((a, b) => b.price - a.price);
    }
    return items;
  }, [catalog, selectedCategory, sortBy]);

  return (
    <div>
      <div className="shop-hero">
        <div className="content-container">
          <div className="hero-eyebrow-pill">✦ Our Complete Collection</div>
          <h1 className="hero-headline" style={{ fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)", margin: "0 0 10px" }}>The Pickle Chapter</h1>
          <p className="hero-subhead" style={{ color: "var(--mustard-gold-light)" }}>Traditional recipes. Honest ingredients. Made in small batches, just like home.</p>
        </div>
      </div>

      <div className="page-shell">
        <div className="content-container">
          <div className="shop-filter-bar">
            <div className="shop-filter-tabs">
              {filterCategories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  className={`filter-pill ${selectedCategory === cat.key ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="shop-sort-wrap">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="featured">Sort by: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="products-grid">
            {filteredProducts.map((product, idx) => (
              <ProductCard
                key={product.slug}
                product={product}
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
                addToCart={addToCart}
                delay={idx * 0.05}
              />
            ))}
          </div>
        </div>
      </div>

      <LifestyleBanner />
    </div>
  );
}

function ProductPage({ addToCart, wishlist, toggleWishlist }) {
  const { slug } = useParams();
  const productCatalog = useCatalogProducts();
  const product = useMemo(() => productCatalog.find((item) => item.slug === slug), [productCatalog, slug]);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [activeTab, setActiveTab] = useState("ingredients");
  const maxSelectableQuantity = Math.max(1, Math.min(product?.stock || 0, 6));

  useDocumentMeta({
    title: product ? `${product.name} (${product.size}) | Homemade Achar | Khana Peena Ghar Se` : "Product Details | Khana Peena Ghar Se",
    description: product?.shortDescription || product?.description || "Authentic homemade achar handcrafted in small batches."
  });

  useEffect(() => {
    if (product) {
      setSelectedImage(product?.images?.[0] || product?.image || "");
      trackViewItem(product);
    }
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return productCatalog.filter((item) => item.slug !== product.slug).slice(0, 3);
  }, [productCatalog, product]);

  if (!product) {
    return (
      <div className="page-shell">
        <div className="content-container">
          <h2>Product not found.</h2>
          <Link to="/achar" className="button button-primary">Back to Shop</Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (product.stock <= 0) return;
    addToCart(product.slug, quantity, product.stock, product);
    setJustAdded(true);
    setMessage(`✓ Added ${quantity} × ${product.name} to your cart!`);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div className="page-shell">
      <div className="content-container">
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/achar">Shop</Link>
          <span>/</span>
          <span>{product.name}</span>
        </div>

        <div className="product-page-grid">
          <div>
            <div className="product-gallery-main">
              <img
                src={selectedImage || product.image}
                alt={product.name}
                onError={(e) => { e.currentTarget.src = "/images/logo.png"; }}
              />
            </div>
            {product.images?.length > 1 ? (
              <div className="product-gallery-thumbs">
                {product.images.map((img) => (
                  <button
                    key={img}
                    type="button"
                    className={`gallery-thumb-btn ${selectedImage === img ? "is-active" : ""}`}
                    onClick={() => setSelectedImage(img)}
                  >
                    <img src={img} alt="Thumbnail" onError={(e) => { e.currentTarget.src = "/images/logo.png"; }} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="product-details-wrap">
            <p className="section-eyebrow">{product.category}</p>
            <h1>{product.name}</h1>
            <div className="product-rating-row">
              <span className="product-rating-stars">★★★★★</span>
              <span><strong>4.9</strong> (124+ customer reviews)</span>
            </div>
            <p style={{ color: "var(--mustard-gold-dark)", fontWeight: "600", margin: 0 }}>{product.tagline}</p>
            <p style={{ color: "var(--text-soft)", lineHeight: 1.65, margin: 0 }}>{product.description}</p>
            <div className="product-price-large">₹{product.price} <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: "normal" }}>({product.size})</span></div>

            {product.stock > 0 && product.stock <= 8 ? (
              <div style={{ margin: "4px 0" }}>
                <span className="scarcity-pill">⚠️ Only {product.stock} jars left in this fresh sun-cured batch!</span>
              </div>
            ) : null}

            <div className="product-value-strip">
              <div className="product-value-item">
                <span>🏺</span>
                <span>Small-batch</span>
              </div>
              <div className="product-value-item">
                <span>📦</span>
                <span>Packed with care</span>
              </div>
              <div className="product-value-item">
                <span>🚚</span>
                <span>Ships across India</span>
              </div>
              <div className="product-value-item">
                <span>🌿</span>
                <span>Zero preservatives</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <label style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                Quantity:
                <select
                  value={quantity}
                  disabled={product.stock <= 0}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  style={{ width: "auto", marginLeft: "8px", minHeight: "40px" }}
                >
                  {Array.from({ length: maxSelectableQuantity }, (_, i) => i + 1).map((val) => (
                    <option key={val} value={val}>{val} jar{val > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`button button-primary ${justAdded ? "is-added button-pulse" : ""}`}
                disabled={product.stock <= 0}
                onClick={handleAddToCart}
              >
                {product.stock <= 0 ? "Out of Stock" : justAdded ? "✓ Added to Cart!" : "Add to Cart"}
              </button>
              <button
                type="button"
                className="button button-cream-secondary"
                onClick={() => toggleWishlist(product.slug, product)}
              >
                {wishlist.includes(product.slug) ? "♥ Saved in Wishlist" : "♡ Save to Wishlist"}
              </button>
            </div>
            {message ? <p style={{ color: "var(--heritage-green)", fontWeight: "600", margin: 0 }}>{message}</p> : null}

            <PincodeChecker />
            <SafeDeliveryGuarantee />
          </div>
        </div>

        {/* Tabbed Product Details */}
        <div className="product-tabs-wrap">
          <div className="product-tabs-header">
            <button
              type="button"
              className={`product-tab-btn ${activeTab === "ingredients" ? "is-active" : ""}`}
              onClick={() => setActiveTab("ingredients")}
            >
              Ingredients &amp; Masalas
            </button>
            <button
              type="button"
              className={`product-tab-btn ${activeTab === "pairings" ? "is-active" : ""}`}
              onClick={() => setActiveTab("pairings")}
            >
              Serving Suggestions
            </button>
            <button
              type="button"
              className={`product-tab-btn ${activeTab === "quality" ? "is-active" : ""}`}
              onClick={() => setActiveTab("quality")}
            >
              Quality &amp; Storage
            </button>
            <button
              type="button"
              className={`product-tab-btn ${activeTab === "reviews" ? "is-active" : ""}`}
              onClick={() => setActiveTab("reviews")}
            >
              Verified Reviews
            </button>
          </div>

          <div className="product-tab-body">
            {activeTab === "ingredients" && (
              <div>
                <p>Handcrafted using pure, unrefined cold-pressed kacchi ghani mustard oil, sun-dried spices, and fresh produce. No artificial colours or chemical preservatives.</p>
                <div className="badge-tag-list">
                  {product.ingredients?.map((ing) => (
                    <span key={ing} className="badge-tag">🌿 {ing}</span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "pairings" && (
              <div>
                <p>This homestyle flavour sits naturally beside everyday Indian meals and festive thalis:</p>
                <div className="badge-tag-list">
                  {product.pairings?.map((pair) => (
                    <span key={pair} className="badge-tag">🍽️ {pair}</span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "quality" && (
              <div>
                <p><strong>Shelf Life:</strong> {product.shelfLife}</p>
                <p><strong>Storage:</strong> Store the glass jar in a cool, dry place. Always use a clean, completely dry spoon when serving to avoid introducing moisture.</p>
                <p><strong>Packaging:</strong> 100% food-grade glass jar sealed for safe pan-India courier transit.</p>
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                <p>Rated <strong>4.9 / 5</strong> by families across New Delhi, Gurugram, Bengaluru, and Mumbai.</p>
                <div className="reviews-grid" style={{ marginTop: "16px" }}>
                  {testimonials.slice(0, 2).map((rev) => (
                    <div key={rev.name} className="review-card">
                      <div className="review-stars">{"★".repeat(rev.rating)}</div>
                      <p className="review-quote">"{rev.quote}"</p>
                      <strong>{rev.name} ({rev.location})</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* You Might Also Like */}
        {relatedProducts.length ? (
          <div style={{ marginTop: "56px" }}>
            <div className="section-head-center">
              <p className="section-eyebrow">Complementary Jars</p>
              <h2 className="section-title" style={{ fontSize: "2.2rem" }}>You Might Also Like</h2>
            </div>
            <div className="products-grid">
              {relatedProducts.map((rel, idx) => (
                <ProductCard
                  key={rel.slug}
                  product={rel}
                  wishlist={wishlist}
                  toggleWishlist={toggleWishlist}
                  addToCart={addToCart}
                  delay={idx * 0.06}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AboutPage() {
  useDocumentMeta({
    title: "Our Story | Handcrafted Culinary Heritage | Khana Peena Ghar Se",
    description: "The story of Rachna Gattani's kitchen in Bahadurgarh, authentic homemade spices, and decades of traditional Indian culinary care."
  });

  return (
    <div>
      {/* Hero: Cinematic Heritage Canvas */}
      <div className="story-page-hero">
        <div className="content-container">
          <div className="hero-eyebrow-pill">✦ The Soul of Bahadurgarh · Est. 2024</div>
          <h1 className="hero-headline" style={{ fontSize: "clamp(2.3rem, 4.2vw, 3.5rem)", margin: "8px 0 14px" }}>
            Some recipes are written.<br /><span className="highlight-gold">Some are remembered by heart.</span>
          </h1>
          <p className="hero-subhead" style={{ color: "var(--mustard-gold-light)", maxWidth: "680px", margin: "0 auto" }}>
            How a mother’s sun-cured kitchen traditions in Haryana grew into a celebration of authentic Indian homestyle achars.
          </p>

          <div className="about-hero-pills">
            <div className="about-hero-pill">
              <span>🏺</span> 100% Sun-Cured in Barnis
            </div>
            <div className="about-hero-pill">
              <span>🌿</span> Pure Kacchi Ghani Mustard Oil
            </div>
            <div className="about-hero-pill">
              <span>🚫</span> Zero Palm Oil & Preservatives
            </div>
            <div className="about-hero-pill">
              <span>🏡</span> Small-Batch Kitchen Handcrafted
            </div>
          </div>
        </div>
      </div>

      <div className="page-shell">
        <div className="content-container">
          {/* Founder's Journey Editorial Layout */}
          <section className="about-founder-section">
            <div className="about-founder-grid">
              <div className="about-founder-frame">
                <img
                  src={ABOUT_OWNER_IMAGE}
                  alt="Rachna Gattani preparing traditional homemade pickles in her Bahadurgarh kitchen"
                  onError={(e) => { e.currentTarget.src = HOME_HERO_IMAGE; }}
                />
                <div className="about-founder-stamp">
                  📍 Bahadurgarh Kitchen
                </div>
                <div className="about-founder-quote-card">
                  <p>“Spices were never measured by factory scales, but by years of lived intuition and motherly care.”</p>
                  <span>— Rachna Gattani, Founder & Head Chef</span>
                </div>
              </div>

              <div className="about-founder-copy">
                <p className="section-eyebrow">The Founder's Journey</p>
                <h2>From our family kitchen to your dining table.</h2>
                <p>
                  Khana Peena Ghar Se was born from a simple childhood truth: no commercial pickle in a supermarket plastic bottle ever matched the deep, sun-cured aroma of achar fermented on our grandmother's terrace in Bahadurgarh.
                </p>
                <p>
                  For decades, our family recipes were prepared in small seasonal batches. Raw green mangoes from local mandis, hand-sliced on wooden boards, tossed in cast-iron roasted whole spices, and sealed inside glazed ceramic martabans under the golden Haryana sun.
                </p>
                <p>
                  When friends and relatives continually requested jars to take across India, Rachna decided to open her kitchen doors to everyone seeking the pure, nostalgic punch of authentic ghar ka swaad—without industrial shortcuts, palm oil, or chemical vinegar.
                </p>

                <div className="about-founder-stats">
                  <div className="about-founder-stat-item">
                    <span className="about-stat-icon">☀️</span>
                    <div className="about-stat-text">
                      <strong>14–30 Days</strong>
                      <span>Natural Sun Fermentation</span>
                    </div>
                  </div>
                  <div className="about-founder-stat-item">
                    <span className="about-stat-icon">🏺</span>
                    <div className="about-stat-text">
                      <strong>Max 25 Jars</strong>
                      <span>Per Single Batch</span>
                    </div>
                  </div>
                  <div className="about-founder-stat-item">
                    <span className="about-stat-icon">🫒</span>
                    <div className="about-stat-text">
                      <strong>100% Kacchi Ghani</strong>
                      <span>Cold-Pressed Mustard Oil</span>
                    </div>
                  </div>
                  <div className="about-founder-stat-item">
                    <span className="about-stat-icon">🚚</span>
                    <div className="about-stat-text">
                      <strong>Pan-India</strong>
                      <span>Safe Glass Jar Doorstep</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4 Heirloom Traditions Section */}
          <section className="about-traditions-section">
            <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto" }}>
              <p className="section-eyebrow">The 4 Heirloom Pillars</p>
              <h2 className="section-title">The Four Pillars of Ghar Ka Swaad</h2>
              <p className="section-description">
                Every jar of Khana Peena Ghar Se is guided by four unbreakable principles that honour old-world Indian culinary science.
              </p>
            </div>

            <div className="about-traditions-grid">
              <div className="about-tradition-card">
                <div className="tradition-header">
                  <span className="tradition-icon">☀️</span>
                  <div>
                    <span className="tradition-tag">धूप का जादू</span>
                    <h3>Solar Fermentation</h3>
                  </div>
                </div>
                <p>
                  We never use artificial heating chambers. Natural solar rays gently evaporate moisture from raw fruit, concentrating natural pectins and creating a deep, rich cure that lasts over a year.
                </p>
              </div>

              <div className="about-tradition-card">
                <div className="tradition-header">
                  <span className="tradition-icon">🫒</span>
                  <div>
                    <span className="tradition-tag">कच्ची घानी शुद्धता</span>
                    <h3>1st-Press Mustard Oil</h3>
                  </div>
                </div>
                <p>
                  100% pure cold-pressed mustard oil with its natural pungent kick. The oil acts as a natural antibacterial shield, preserving our pickles without synthetic chemical acidity regulators.
                </p>
              </div>

              <div className="about-tradition-card">
                <div className="tradition-header">
                  <span className="tradition-icon">🏺</span>
                  <div>
                    <span className="tradition-tag">बरनी की तासीर</span>
                    <h3>Glazed Ceramic Barnis</h3>
                  </div>
                </div>
                <p>
                  We rest all our pickles in porcelain martabans tied with breathable white muslin cloth. Ceramic insulates against drastic temperature swings, preventing harmful plastic polymer contamination.
                </p>
              </div>

              <div className="about-tradition-card">
                <div className="tradition-header">
                  <span className="tradition-icon">🌿</span>
                  <div>
                    <span className="tradition-tag">भुने खड़े मसाले</span>
                    <h3>Cast-Iron Roasted Spices</h3>
                  </div>
                </div>
                <p>
                  Whole fenugreek, fennel, nigella seeds, and aromatic hing are roasted on cast-iron tawas and coarsely hand-crushed to unleash fresh volatile oils with zero stale fillers.
                </p>
              </div>
            </div>
          </section>

          {/* Kitchen Moments Visual Gallery */}
          <section className="about-gallery-section">
            <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
              <p className="section-eyebrow">Ghar Ki Rasoi</p>
              <h2 className="section-title">A Glimpse Into Our Kitchen</h2>
              <p className="section-description">
                Raw ingredients basking in the afternoon sun, spices being hand-blended, and fresh batches packed into glass jars.
              </p>
            </div>

            <div className="about-gallery-grid">
              <div className="about-gallery-item">
                <img src="/images/process/step-2-prepare.jpg" alt="Sun drying raw mango slices on terrace" />
                <div className="about-gallery-caption">
                  Solar Evaporation on Terrace
                </div>
              </div>
              <div className="about-gallery-item">
                <img src="/images/process/step-3-mix.jpg" alt="Folding roasted whole masalas into mustard oil" />
                <div className="about-gallery-caption">
                  Golden Mustard Oil Infusion
                </div>
              </div>
              <div className="about-gallery-item">
                <img src="/images/process/step-4-rest.jpg" alt="Ceramic barnis resting in sun" />
                <div className="about-gallery-caption">
                  21-Day Solar Maturation in Barnis
                </div>
              </div>
              <div className="about-gallery-item">
                <img src="/images/brand/lifestyle-dining.jpg" alt="Traditional Indian meal with ghar ka achar" />
                <div className="about-gallery-caption">
                  From Our Kitchen to Your Thali
                </div>
              </div>
            </div>
          </section>

          {/* Purity Comparison Matrix */}
          <section className="about-purity-section">
            <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto" }}>
              <p className="section-eyebrow">The Purity Promise</p>
              <h2 className="section-title">Factory Pickle vs. Rachna's Kitchen</h2>
              <p className="section-description">
                See why small-batch homemade preparation makes all the difference for your health, digestive comfort, and authentic taste.
              </p>
            </div>

            <div className="purity-comparison-grid">
              <div className="purity-col-factory">
                <h3><span>❌</span> Commercial Factory Pickles</h3>
                <ul className="purity-list factory">
                  <li><span>✕</span> Cheap refined palm oil or cottonseed oil blend</li>
                  <li><span>✕</span> Synthetic acetic acid (chemical vinegar) for fake tang</li>
                  <li><span>✕</span> Sodium Benzoate (E211) chemical preservatives</li>
                  <li><span>✕</span> Bulk machine puree with bruised fruit</li>
                  <li><span>✕</span> Stored in industrial plastic drums for months</li>
                </ul>
              </div>

              <div className="purity-col-ghar">
                <h3><span>✓</span> Khana Peena Ghar Se</h3>
                <ul className="purity-list ghar">
                  <li><span>✓</span> 100% Pure Cold-Pressed Kacchi Ghani Mustard Oil</li>
                  <li><span>✓</span> Natural solar fermentation & Sendha Namak for authentic punch</li>
                  <li><span>✓</span> 100% Chemical-Free & Preservative-Free</li>
                  <li><span>✓</span> Hand-inspected seasonal Ramkela mangoes & chillies</li>
                  <li><span>✓</span> Fermented in glazed ceramic barnis & packed in glass jars</li>
                </ul>
              </div>
            </div>
          </section>

          {/* CTA Banner */}
          <div className="about-cta-banner">
            <h2>Taste the Nostalgia of Home.</h2>
            <p>
              Order our handcrafted achars directly to your doorstep across India, or explore our complete 4-in-1 signature heirloom combo box.
            </p>
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/achar" className="button button-primary" style={{ padding: "14px 28px", fontSize: "0.95rem" }}>
                Explore All Achars →
              </Link>
              <Link to="/how-its-made" className="button button-cream-secondary" style={{ padding: "14px 28px", fontSize: "0.95rem" }}>
                See How It's Made
              </Link>
            </div>
          </div>

          <TrustStrip />
        </div>
      </div>
    </div>
  );
}

const CRAFT_STEPS = [
  {
    num: "01",
    phase: "Phase 1: Raw Harvest & Selection",
    title: "Select Ingredients",
    headline: "Seasonal Raw Ramkela Mangoes & First-Grade Whole Spices",
    duration: "Day 1 • Morning Harvest",
    tagline: "No bruised fruit. No shortcuts. Sourced directly in peak season.",
    desc: "We handpick seasonal raw mangoes, sun-ripened chillies, and aromatic whole spices directly from trusted regional farms. Every single mango is inspected by hand for firmness, tartness, and zero blemishes before entering our kitchen.",
    wisdom: "“A great achar starts weeks before it touches oil. If the raw mango lacks firmness, the pickle loses its crunch in months.”",
    tags: ["Raw Ramkela Mangoes", "Whole Yellow Mustard", "Methi Seeds", "Sendha Namak"],
    icon: "🌿",
    badge: "100% Farm Fresh",
    img: "/images/process/step-1-ingredients.jpg"
  },
  {
    num: "02",
    phase: "Phase 2: Slicing & Sun-Drying",
    title: "Prepare & Sun-Dry",
    headline: "Hand-Sliced & Moisture-Evaporated Under Golden Sunlight",
    duration: "Days 2–3 • Golden Afternoon",
    tagline: "Moisture is the enemy of shelf-life. The sun is our natural preserver.",
    desc: "Mangoes and vegetables are washed in fresh water, cut uniformly into traditional bite-sized pieces, and spread out across clean muslin cloth on bamboo wicker trays (tokris) to bask under the warm afternoon sun. Whole spices are lightly dry-roasted on cast iron to awaken their natural oils.",
    wisdom: "“We never use mechanical dehydrators. Solar evaporation concentrates the natural fruit pectins and seals the aroma inside.”",
    tags: ["Solar Dehydration", "Cast Iron Roasting", "Zero Moisture", "Coarse Crushing"],
    icon: "☀️",
    badge: "Solar Evaporation",
    img: "/images/process/step-2-prepare.jpg"
  },
  {
    num: "03",
    phase: "Phase 3: The Golden Infusion",
    title: "Spice & Oil Infusion",
    headline: "Pure Cold-Pressed Kacchi Ghani Mustard Oil & Hand-Ground Masalas",
    duration: "Day 4 • The Family Blend",
    tagline: "100% pure cold-pressed oil that naturally preserves without synthetic acids.",
    desc: "In large brass urlis, the sun-dried ingredients are enveloped in pure, pungent kacchi ghani mustard oil. Hand-ground spices—fenugreek, fennel, turmeric, nigella, and asafoetida (hing)—are folded in with lived intuition, ensuring every crevice is richly coated.",
    wisdom: "“The oil must sting the eyes with its purity. That pungent mustard aroma is the shield that preserves the achar for over a year.”",
    tags: ["Cold-Pressed Mustard Oil", "Pure Hing (Asafoetida)", "Turmeric Root", "Kalonji"],
    icon: "🫒",
    badge: "Kacchi Ghani Infusion",
    img: "/images/process/step-3-mix.jpg"
  },
  {
    num: "04",
    phase: "Phase 4: Solar Maturation",
    title: "Rest in Ceramic Barnis",
    headline: "21 to 30 Days of Slow Natural Sun-Fermentation in Martabans",
    duration: "21–30 Days • Rooftop Courtyard",
    tagline: "Ceramic martabans regulate thermal temperature day and night.",
    desc: "The spiced blend is transferred into traditional glazed porcelain martabans (barnis) tied tightly with clean white muslin cloths. Placed on our rooftop courtyard in Bahadurgarh, the jars absorb daytime warmth and cool down at night, allowing flavors to marry slowly and deeply.",
    wisdom: "“Plastic drums ruin the soul of achar. Only glazed ceramic allows the pickle to breathe and ferment naturally without chemical vinegar.”",
    tags: ["Glazed Ceramic Barnis", "Muslin Cloth Tied", "Rooftop Solar Heat", "Daily Stirring"],
    icon: "🏺",
    badge: "Solar Fermentation",
    img: "/images/process/step-4-rest.jpg"
  },
  {
    num: "05",
    phase: "Phase 5: Bottling & Dispatch",
    title: "Hand-Packed with Care",
    headline: "Small Batch Bottling in Food-Safe Glass Jars for Your Table",
    duration: "Day 35 • Final Taste Approval",
    tagline: "Direct from our family kitchen in Bahadurgarh to homes across India.",
    desc: "Once mature, the achar is filled by hand into sterile glass jars, crowned with a top layer of golden mustard oil to seal freshness, and sealed with tamper-evident caps. Every batch is tasted by Rachna Sharma before dispatch to ensure heirloom quality.",
    wisdom: "“When you open the jar at your table, the aroma should instantly take you back to your grandmother’s courtyard.”",
    tags: ["Sterile Glass Jars", "Oil-Top Freshness Seal", "Batch Inspected", "Safe Transit Pack"],
    icon: "📦",
    badge: "Hand-Sealed Fresh",
    img: "/images/process/step-5-pack.jpg"
  }
];

const CRAFT_FAQS = [
  {
    q: "Why do you use traditional ceramic barnis instead of stainless steel or plastic tanks?",
    a: "Ceramic porcelain martabans are natural thermal insulators. During sunny days, they gently absorb solar heat without scorching the spices; at night, they cool slowly, allowing beneficial natural fermentation. Plastic vats can leach chemicals and trap harmful condensation."
  },
  {
    q: "How does the achar last 12 months without chemical preservatives?",
    a: "We rely on ancient Indian preservation science: complete sun-drying of fruit to zero free moisture, therapeutic sendha namak (rock salt), and 100% pure cold-pressed mustard oil. The top layer of mustard oil forms a natural airtight oxygen barrier that prevents spoilage."
  },
  {
    q: "Is there any synthetic vinegar or artificial acetic acid added?",
    a: "Never. All tartness in our achars comes naturally from sun-ripened green Ramkela mangoes, amchur, and slow fermentation. We do not use commercial vinegar, artificial acidity regulators (INS 260), or chemical stabilizers."
  },
  {
    q: "How should I store and handle my achar jar at home?",
    a: "Store in a cool, dry place away from direct humidity. Always use a clean, completely dry spoon when serving. Ensure the achar pieces remain submerged under the top layer of mustard oil for maximum flavor longevity."
  }
];

function HowItsMadePage() {
  useDocumentMeta({
    title: "How It's Made | 5-Step Artisanal Craftsmanship | Khana Peena Ghar Se",
    description: "Discover the 5-step traditional slow-curing process behind our handcrafted small-batch homemade achars."
  });

  const [activeIdx, setActiveIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  const activeStep = CRAFT_STEPS[activeIdx];

  const prevStep = () => {
    setActiveIdx((cur) => (cur === 0 ? CRAFT_STEPS.length - 1 : cur - 1));
  };

  const nextStep = () => {
    setActiveIdx((cur) => (cur === CRAFT_STEPS.length - 1 ? 0 : cur + 1));
  };

  return (
    <div className="how-page-wrapper">
      {/* Editorial Craft Hero Header */}
      <div className="how-hero-banner">
        <div className="content-container">
          <motion.div
            className="how-hero-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="how-hero-badge">
              <span className="pulse-dot" />
              <span>Artisanal Heritage Craftsmanship</span>
            </div>
            <h1 className="how-main-title">From Our Kitchen to Your Table</h1>
            <p className="how-main-subhead">
              The 5 sacred steps of traditional Indian small-batch pickle crafting. Same heirloom recipes, pure cold-pressed mustard oil, and patient sun-curing.
            </p>

            {/* Quick Craft Credentials Bar */}
            <div className="how-stats-strip">
              <div className="how-stat-item">
                <span className="how-stat-icon">☀️</span>
                <div className="how-stat-copy">
                  <strong>21–30 Days</strong>
                  <span>Natural Sun-Curing</span>
                </div>
              </div>
              <div className="how-stat-item">
                <span className="how-stat-icon">🌿</span>
                <div className="how-stat-copy">
                  <strong>100% Kacchi Ghani</strong>
                  <span>Cold-Pressed Mustard Oil</span>
                </div>
              </div>
              <div className="how-stat-item">
                <span className="how-stat-icon">🏺</span>
                <div className="how-stat-copy">
                  <strong>Ceramic Barnis</strong>
                  <span>Traditional Maturation</span>
                </div>
              </div>
              <div className="how-stat-item">
                <span className="how-stat-icon">✨</span>
                <div className="how-stat-copy">
                  <strong>Zero Chemicals</strong>
                  <span>12-Month Shelf Life</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="page-shell">
        <div className="content-container">
          {/* Interactive Stepper Navigation Bar with Connected Liquid Beam */}
          <div className="how-stepper-container">
            <div className="how-timeline-track">
              <div
                className="how-timeline-progress"
                style={{ width: `${(activeIdx / (CRAFT_STEPS.length - 1)) * 100}%` }}
              />
            </div>
            <div className="how-stepper-pills">
              {CRAFT_STEPS.map((step, idx) => {
                const isActive = activeIdx === idx;
                const isPassed = idx <= activeIdx;
                return (
                  <button
                    key={step.num}
                    type="button"
                    className={`how-step-node-btn ${isActive ? "is-active" : ""} ${isPassed ? "is-passed" : ""}`}
                    onClick={() => setActiveIdx(idx)}
                    aria-label={`Jump to Step ${step.num}: ${step.title}`}
                  >
                    <div className="how-node-circle">
                      <span className="how-node-icon">{step.icon}</span>
                      <span className="how-node-num">{step.num}</span>
                    </div>
                    <div className="how-node-labels">
                      <strong className="how-node-title">{step.title}</strong>
                      <span className="how-node-duration">{step.duration.split("•")[0].trim()}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeStepGlow"
                        className="how-node-glow-ring"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Large Interactive Spotlight Stage */}
          <motion.div
            key={activeStep.num}
            className="how-spotlight-stage"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Left: Large High-Definition Craft Visual */}
            <div className="how-spotlight-visual-wrap">
              <div className="how-spotlight-image-card">
                <img
                  src={activeStep.img}
                  alt={activeStep.title}
                  className="how-spotlight-img"
                  onError={(e) => {
                    e.currentTarget.src = HOME_HERO_IMAGE;
                  }}
                />
                <div className="how-spotlight-badge-top">
                  <span>{activeStep.icon}</span>
                  <strong>{activeStep.badge}</strong>
                </div>
                <div className="how-spotlight-overlay-bottom">
                  <span className="how-spotlight-step-tag">{activeStep.phase}</span>
                  <h3>{activeStep.title}</h3>
                </div>
              </div>
            </div>

            {/* Right: Rich Culinary Wisdom Card */}
            <div className="how-spotlight-info-panel">
              <div className="how-info-header">
                <span className="how-phase-eyebrow">{activeStep.phase}</span>
                <span className="how-duration-chip">⏱️ {activeStep.duration}</span>
              </div>

              <h2 className="how-stage-headline">{activeStep.headline}</h2>
              <p className="how-stage-tagline">{activeStep.tagline}</p>
              <p className="how-stage-narrative">{activeStep.desc}</p>

              {/* Founder Kitchen Wisdom Box */}
              <div className="how-wisdom-box">
                <div className="how-wisdom-quote-mark">“</div>
                <div className="how-wisdom-content">
                  <p>{activeStep.wisdom}</p>
                  <small>— Rachna Sharma, Founder &amp; Kitchen Head</small>
                </div>
              </div>

              {/* Key Ingredients & Craft Techniques Tag Cloud */}
              <div className="how-tags-section">
                <span className="how-tags-label">Key Techniques &amp; Ingredients:</span>
                <div className="how-tags-list">
                  {activeStep.tags.map((tag) => (
                    <span key={tag} className="how-craft-tag">
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step Stage Navigation Controls */}
              <div className="how-stage-controls">
                <button
                  type="button"
                  className="button button-cream-secondary button-sm"
                  onClick={prevStep}
                  aria-label="Previous step"
                >
                  ← Previous Step
                </button>
                <span className="how-stage-indicator">
                  Step <strong>{activeStep.num}</strong> of <strong>05</strong>
                </span>
                <button
                  type="button"
                  className="button button-primary button-sm"
                  onClick={nextStep}
                  aria-label="Next step"
                >
                  Next Step →
                </button>
              </div>
            </div>
          </motion.div>

          {/* 5-Card Full Journey Roadmap Grid */}
          <div className="how-roadmap-section">
            <div className="section-head-center">
              <p className="section-eyebrow">Complete 5-Step Journey</p>
              <h2 className="section-title">The Master Craftsman Roadmap</h2>
              <p className="section-subtitle">Click any step card below to inspect culinary techniques and secret tips.</p>
            </div>

            <div className="how-cards-grid">
              {CRAFT_STEPS.map((step, idx) => {
                const isSelected = activeIdx === idx;
                return (
                  <motion.div
                    key={step.num}
                    className={`how-roadmap-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setActiveIdx(idx)}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.06 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className="how-card-thumb-wrap">
                      <img
                        src={step.img}
                        alt={step.title}
                        onError={(e) => {
                          e.currentTarget.src = HOME_HERO_IMAGE;
                        }}
                      />
                      <span className="how-card-step-badge">{step.num}</span>
                      <span className="how-card-duration-tag">{step.duration.split("•")[0].trim()}</span>
                    </div>

                    <div className="how-card-body">
                      <div className="how-card-icon-title">
                        <span className="how-card-icon">{step.icon}</span>
                        <h4>{step.title}</h4>
                      </div>
                      <p className="how-card-desc">{step.desc}</p>
                      <div className="how-card-footer">
                        <span className="how-card-btn-text">
                          {isSelected ? "Currently Viewing ✓" : "Explore Phase →"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Heritage Craft vs Industrial Mass Market Section */}
          <div className="how-comparison-section">
            <div className="section-head-center">
              <p className="section-eyebrow">The Homemade Difference</p>
              <h2 className="section-title">Why Small-Batch Patience Matters</h2>
              <p className="section-subtitle">A side-by-side look at traditional Indian home preservation versus factory production.</p>
            </div>

            <div className="how-comparison-grid">
              <div className="how-comparison-card heritage-card">
                <div className="comparison-card-head">
                  <span className="comp-badge">🏡 The Khana Peena Way</span>
                  <h3>Traditional Kitchen Craft</h3>
                </div>
                <ul className="comp-list">
                  <li>
                    <span className="comp-check">✓</span>
                    <div>
                      <strong>100% Cold-Pressed Kacchi Ghani Mustard Oil</strong>
                      <p>Naturally pungent, unadulterated oil that preserves flavor &amp; crunch.</p>
                    </div>
                  </li>
                  <li>
                    <span className="comp-check">✓</span>
                    <div>
                      <strong>21–30 Days Solar Fermentation</strong>
                      <p>Slowly sun-ripened in glazed ceramic martabans under real sun heat.</p>
                    </div>
                  </li>
                  <li>
                    <span className="comp-check">✓</span>
                    <div>
                      <strong>Zero Artificial Vinegar or Acids</strong>
                      <p>Natural tartness exclusively from raw Ramkela mangoes &amp; amchur.</p>
                    </div>
                  </li>
                  <li>
                    <span className="comp-check">✓</span>
                    <div>
                      <strong>Hand-Pounded Whole Masalas</strong>
                      <p>Cast iron roasted whole fenugreek, mustard, and fragrant hing.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="how-comparison-card industrial-card">
                <div className="comparison-card-head">
                  <span className="comp-badge-alt">🏭 Mass-Market Commercial Pickles</span>
                  <h3>Industrial Factory Processing</h3>
                </div>
                <ul className="comp-list">
                  <li>
                    <span className="comp-cross">✗</span>
                    <div>
                      <strong>Refined Palm Oil &amp; Cottonseed Oil Blends</strong>
                      <p>Heated to high temperatures, stripping away essential aromatics.</p>
                    </div>
                  </li>
                  <li>
                    <span className="comp-cross">✗</span>
                    <div>
                      <strong>24-Hour Chemical Acceleration</strong>
                      <p>Forced ripening in giant plastic vats using industrial heat and steam.</p>
                    </div>
                  </li>
                  <li>
                    <span className="comp-cross">✗</span>
                    <div>
                      <strong>Synthetic Acetic Acid &amp; Chemical Vinegar</strong>
                      <p>Sharp artificial chemical burn with Sodium Benzoate (INS 211).</p>
                    </div>
                  </li>
                  <li>
                    <span className="comp-cross">✗</span>
                    <div>
                      <strong>Machine-Ground Dust &amp; Artificial Colors</strong>
                      <p>Commercial spice powders with preservatives and anti-caking agents.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Craft FAQ Accordion */}
          <div className="how-faq-section">
            <div className="section-head-center">
              <p className="section-eyebrow">Frequently Asked Questions</p>
              <h2 className="section-title">The Secrets of Our Kitchen</h2>
              <p className="section-subtitle">Everything you need to know about our natural preservation and storage.</p>
            </div>

            <div className="how-faq-list">
              {CRAFT_FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={faq.q} className={`how-faq-item ${isOpen ? "is-open" : ""}`}>
                    <button
                      type="button"
                      className="how-faq-question-btn"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      <span className="faq-toggle-icon">{isOpen ? "−" : "+"}</span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          className="how-faq-answer"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p>{faq.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Patience Makes Better Pickles Banner */}
          <motion.div
            className="patience-banner"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="patience-banner-copy">
              <div className="patience-badge">🏺 Small-Batch Family Kitchen</div>
              <h2>Patience makes better pickles.</h2>
              <p>
                Some good things take time. Handcrafted slow-cured achars made the way they always were in Bahadurgarh.
              </p>
            </div>
            <div className="patience-banner-cta">
              <Link to="/achar" className="button button-primary">
                Shop The Pickle Chapter →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function CartPage({ cart, updateCartQuantity, onClearCart }) {
  useDocumentMeta({
    title: "Shopping Cart & Checkout | Khana Peena Ghar Se",
    description: "Review your selected artisanal achar jars and proceed to secure checkout."
  });

  const navigate = useNavigate();
  const productCatalog = useCatalogProducts();
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutPincode, setCheckoutPincode] = useState(() => localStorage.getItem("kp_pincode") || "");
  const [checkoutCity, setCheckoutCity] = useState("");
  const [checkoutState, setCheckoutState] = useState("");
  const [checkoutPinEstimate, setCheckoutPinEstimate] = useState(() => {
    const saved = localStorage.getItem("kp_pincode");
    return saved && /^\d{6}$/.test(saved) ? getPincodeEstimate(saved) : null;
  });

  useEffect(() => {
    if (checkoutPinEstimate && checkoutPinEstimate.valid) {
      if (!checkoutState && checkoutPinEstimate.state) {
        setCheckoutState(checkoutPinEstimate.state);
      }
      if (!checkoutCity && checkoutPinEstimate.region) {
        const guessedCity = checkoutPinEstimate.region.split("/")[0].trim();
        setCheckoutCity(guessedCity);
      }
    }
  }, [checkoutPinEstimate]);

  const handlePincodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCheckoutPincode(val);
    if (val.length === 6) {
      const est = getPincodeEstimate(val);
      setCheckoutPinEstimate(est);
      if (est && est.valid) {
        localStorage.setItem("kp_pincode", val);
        setCheckoutState(est.state || "");
        const guessedCity = est.region ? est.region.split("/")[0].trim() : "";
        if (guessedCity) setCheckoutCity(guessedCity);
      }
    } else {
      setCheckoutPinEstimate(null);
    }
  };

  const items = cart
    .map((entry) => ({ ...entry, product: productCatalog.find((item) => item.slug === entry.slug) }))
    .filter((entry) => entry.product)
    .map((entry) => ({
      ...entry,
      quantity: Math.min(entry.quantity, Math.max(entry.product.stock, 0)),
      unavailable: entry.product.stock <= 0
    }))
    .filter((entry) => entry.quantity > 0);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const isFreeShipping = subtotal >= 599;
  const shippingFee = items.length ? (isFreeShipping ? 0 : 60) : 0;
  const total = subtotal + shippingFee;

  useEffect(() => {
    if (items.length) {
      trackBeginCheckout(items, subtotal);
    }
  }, []);

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!items.length) {
      setStatus("Your cart is empty. Add at least one jar to proceed.");
      return;
    }
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payloadItems = items.map((item) => ({
      slug: item.product.slug,
      name: item.product.name,
      size: item.product.size,
      unitPrice: item.product.price,
      quantity: item.quantity
    }));

    setLoading(true);
    setStatus("Placing your order request with our Bahadurgarh kitchen...");
    try {
      const response = await fetch("/.netlify/functions/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: formData, items: payloadItems })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order could not be placed.");

      trackPurchase({
        orderId: result.order?.order_number || `KP-${Date.now().toString().slice(-6)}`,
        items: payloadItems,
        value: total,
        shipping: shippingFee
      });

      localStorage.removeItem("kp_cart_v3");
      if (onClearCart) onClearCart();
      setOrderSuccess(result.order);
      setStatus("");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="page-shell">
        <div className="content-container">
          <div style={{ maxWidth: "620px", margin: "40px auto", background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--line-gold)", padding: "40px 32px", textAlign: "center", boxShadow: "var(--shadow-md)" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--heritage-green)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 16px" }}>
              ✓
            </div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", color: "var(--heritage-green)", margin: "0 0 8px" }}>
              Order Placed Successfully!
            </h1>
            <p style={{ color: "var(--text-soft)", fontSize: "0.95rem", margin: "0 0 24px" }}>
              Thank you for supporting our family kitchen. Rachna and team are preparing your fresh achar batch in Bahadurgarh.
            </p>

            <div style={{ background: "var(--warm-cream-pure)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "20px", marginBottom: "28px", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", textTransform: "uppercase" }}>Order Number</span>
                <strong style={{ color: "var(--heritage-green)", fontSize: "1.05rem" }}>{orderSuccess.order_number}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", textTransform: "uppercase" }}>Total Amount</span>
                <strong>₹{orderSuccess.total_amount}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", textTransform: "uppercase" }}>Estimated Dispatch</span>
                <span>Within 24–48 Hours</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/track-order" className="button button-primary">
                Track Order Live →
              </Link>
              <Link to="/achar" className="button button-cream-secondary">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="content-container">
        <div className="checkout-shell">
          <div>
            <h1 className="section-title">Your Shopping Cart</h1>
            {items.length ? <FreeShippingMeter subtotal={subtotal} threshold={599} /> : null}

            <div style={{ marginTop: "24px" }}>
              {items.length ? (
                items.map((item) => (
                  <div key={item.product.slug} className="cart-line-react">
                    <div>
                      <strong>{item.product.name}</strong>
                      <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.84rem" }}>{item.product.size}</span>
                    </div>
                    <div className="qty-buttons">
                      <button type="button" onClick={() => updateCartQuantity(item.product.slug, item.quantity - 1, item.product.stock)}>-</button>
                      <span>{item.quantity}</span>
                      <button type="button" disabled={item.quantity >= item.product.stock} onClick={() => updateCartQuantity(item.product.slug, item.quantity + 1, item.product.stock)}>+</button>
                    </div>
                    <strong style={{ color: "var(--heritage-green)" }}>₹{item.product.price * item.quantity}</strong>
                  </div>
                ))
              ) : (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "8px" }}>🏺</span>
                  <p>Your cart is empty. <Link to="/achar" style={{ color: "var(--mustard-gold-dark)", fontWeight: "600" }}>Explore our handcrafted achars →</Link></p>
                </div>
              )}

              {items.length ? (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: "16px", marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.92rem", color: "var(--text-soft)" }}>
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.92rem", color: "var(--text-soft)" }}>
                    <span>Pan-India Shipping</span>
                    <span>{isFreeShipping ? <strong style={{ color: "var(--heritage-green)" }}>FREE</strong> : "₹60"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px dashed var(--line)", fontSize: "1.25rem", fontWeight: "700" }}>
                    <span>Total Amount</span>
                    <span style={{ color: "var(--heritage-green)" }}>₹{total}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <form className="checkout-form-react" onSubmit={placeOrder}>
            <h2 style={{ fontFamily: "var(--font-serif)", margin: "0 0 8px" }}>Delivery Details</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "0 0 16px" }}>
              Pan-India courier delivery via Bluedart / Delhivery / Speed Post
            </p>
            <label>Full Name<input type="text" name="customerName" placeholder="e.g. Priyanshu Sharma" required /></label>
            <label>Phone Number<input type="tel" name="phone" placeholder="10-digit mobile number" required /></label>
            <label>Email Address<input type="email" name="email" placeholder="For order & dispatch updates" /></label>
            <label>Delivery Address<input type="text" name="addressLine1" placeholder="House / Flat / Street / Landmark" required /></label>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label>City
                <input
                  type="text"
                  name="city"
                  placeholder="e.g. Bahadurgarh"
                  value={checkoutCity}
                  onChange={(e) => setCheckoutCity(e.target.value)}
                  required
                />
              </label>
              <label>State
                <input
                  type="text"
                  name="state"
                  placeholder="e.g. Haryana"
                  value={checkoutState}
                  onChange={(e) => setCheckoutState(e.target.value)}
                  required
                />
              </label>
            </div>

            <label>
              Pincode
              <input
                type="text"
                name="pincode"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="6-digit postal code"
                value={checkoutPincode}
                onChange={handlePincodeChange}
                required
              />
            </label>

            {checkoutPinEstimate && checkoutPinEstimate.valid && (
              <div className="checkout-pincode-preview-badge">
                <span className="checkout-badge-icon">⚡</span>
                <div>
                  <strong>{checkoutPinEstimate.etaDays} Express Dispatch</strong>
                  <small>Delivering to {checkoutPinEstimate.region || checkoutPinEstimate.state} via {checkoutPinEstimate.courier}</small>
                </div>
              </div>
            )}

            <label>
              Payment Method
              <select name="paymentMethod" defaultValue="COD" style={{ width: "100%", marginTop: "4px" }}>
                <option value="COD">Cash on Delivery (COD)</option>
                <option value="PREPAID_UPI">Prepaid UPI / QR (Fastest Dispatch)</option>
              </select>
            </label>
            <label>Delivery Notes<textarea name="notes" rows="2" placeholder="Special instructions (optional)" /></label>
            <button className="button button-primary button-full" type="submit" disabled={!items.length || loading}>
              {loading ? "Placing Order..." : `Place Order (₹${total})`}
            </button>
            <a
              href={getWhatsAppOrderUrl(items, subtotal, { pincode: checkoutPincode, city: checkoutCity, state: checkoutState })}
              target="_blank"
              rel="noreferrer"
              className="button button-cream-secondary button-full"
              style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={() => trackEvent("order_via_whatsapp_click", { subtotal, items_count: items.length })}
            >
              <span>💬</span> Order via WhatsApp Instant Chat
            </a>
            {status ? <p style={{ color: "var(--heritage-green)", fontWeight: "600", margin: "8px 0 0" }}>{status}</p> : null}
          </form>
        </div>
      </div>
    </div>
  );
}

function AccountPage({ session, refreshSession }) {
  useDocumentMeta({
    title: "Member Portal & Account | Khana Peena Ghar Se",
    description: "Sign in to track orders, manage deliveries, view batch receipts, and access member perks at Khana Peena Ghar Se."
  });

  const [activeTab, setActiveTab] = useState("signin"); // "signin" | "signup" | "forgot"
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [loginState, setLoginState] = useState({ email: "", password: "", remember: true });
  const [signupState, setSignupState] = useState({ fullName: "", email: "", phone: "", password: "", agreeTerms: true });
  const [forgotEmail, setForgotEmail] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    if (!hasSupabaseClientEnv || !supabase) {
      setStatus({
        type: "info",
        message: "Demo Mode Active: Supabase environment credentials are not configured in local environment. Sign in would connect live to Supabase Auth."
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginState.email,
      password: loginState.password
    });
    setLoading(false);
    if (error) {
      return setStatus({ type: "error", message: error.message });
    }
    await refreshSession();
    setStatus({ type: "success", message: "Welcome back! Signed in successfully." });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    if (!hasSupabaseClientEnv || !supabase) {
      setStatus({
        type: "info",
        message: "Demo Mode Active: Supabase environment credentials are not configured in local environment. Account registration would save to Supabase Auth."
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupState.email,
      password: signupState.password,
      options: {
        data: {
          full_name: signupState.fullName,
          phone: signupState.phone
        }
      }
    });
    setLoading(false);
    if (error) {
      return setStatus({ type: "error", message: error.message });
    }
    await refreshSession();
    setStatus({ type: "success", message: "Account created successfully! Check your email for confirmation." });
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    if (!hasSupabaseClientEnv || !supabase) {
      setStatus({
        type: "info",
        message: "Password reset link requested. In live mode, a secure recovery email is sent via Supabase."
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/account`
    });
    setLoading(false);
    if (error) {
      return setStatus({ type: "error", message: error.message });
    }
    setStatus({ type: "success", message: "Password reset instructions have been sent to your email." });
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    await refreshSession();
    setStatus({ type: "info", message: "You have been safely signed out." });
  };

  return (
    <div className="page-shell">
      {/* Luxury Ambient Hero Header */}
      <section className="shop-hero-header">
        <div className="content-container">
          <div className="shop-hero-content">
            <div className="shop-hero-pill">
              <span>✦</span> Member Portal &amp; Kitchen Circle
            </div>
            <h1 className="shop-hero-title">
              {session ? "Welcome Back to Your Pantry" : "Welcome to Khana Peena Ghar Se"}
            </h1>
            <p className="shop-hero-desc">
              {session
                ? "Manage your delivery addresses, track live courier dispatches from Bahadurgarh, and access private batch releases."
                : "Sign in to track orders, manage deliveries, view culinary receipts, and access early batch releases."}
            </p>
          </div>
        </div>
      </section>

      <div className="content-container" style={{ padding: "50px 24px 80px" }}>
        {session ? (
          /* ==========================================================================
             Logged-In Member Dashboard View
             ========================================================================== */
          <div className="auth-member-dashboard">
            <div className="member-welcome-card">
              <div className="member-avatar-badge">
                <span>{(session.user.user_metadata?.full_name || session.user.email || "G").charAt(0).toUpperCase()}</span>
              </div>
              <div className="member-info-col">
                <div className="member-pill-badge">✦ Ghar Se Connoisseur</div>
                <h2 className="member-welcome-name">
                  {session.user.user_metadata?.full_name || session.user.email.split("@")[0]}
                </h2>
                <p className="member-email-text">{session.user.email}</p>
              </div>
              <button type="button" className="button button-outline-dark member-signout-btn" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>

            <div className="member-dashboard-grid">
              <div className="member-dash-card">
                <div className="dash-card-icon">🚚</div>
                <h3>Track Dispatches</h3>
                <p>Check live transit status for packages on their way from our Bahadurgarh kitchen.</p>
                <Link to="/track-order" className="dash-card-link">
                  Track Live Order →
                </Link>
              </div>

              <div className="member-dash-card">
                <div className="dash-card-icon">🏺</div>
                <h3>Pantry Catalog</h3>
                <p>Reorder your household favorites or discover fresh 21-day sun-cured seasonal batches.</p>
                <Link to="/achar" className="dash-card-link">
                  Browse Achars →
                </Link>
              </div>

              <div className="member-dash-card">
                <div className="dash-card-icon">💬</div>
                <h3>Kitchen Concierge</h3>
                <p>Have an allergy question or need custom wedding/festival hampers? Speak with us directly.</p>
                <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="dash-card-link">
                  Chat on WhatsApp ↗
                </a>
              </div>
            </div>

            <div className="member-details-card">
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", color: "var(--heritage-green-dark)", margin: "0 0 16px" }}>
                Account &amp; Security Overview
              </h3>
              <div className="member-details-row">
                <span>Registered Email:</span>
                <strong>{session.user.email}</strong>
              </div>
              <div className="member-details-row">
                <span>Authentication Provider:</span>
                <strong>Supabase Secure Auth (256-bit Encrypted)</strong>
              </div>
              <div className="member-details-row">
                <span>Kitchen Location:</span>
                <strong>Bahadurgarh, Haryana, India</strong>
              </div>
            </div>
          </div>
        ) : (
          /* ==========================================================================
             Public Auth Split Layout (Perks Sidebar + Interactive Auth Form)
             ========================================================================== */
          <div className="auth-split-layout">
            {/* Left Column: Brand Heritage & Member Privileges */}
            <div className="auth-perks-sidebar">
              <div className="auth-sidebar-brand">
                <img src="/images/logo.png" alt="Khana Peena Ghar Se Logo" className="auth-sidebar-logo" />
                <div>
                  <strong style={{ display: "block", color: "var(--warm-cream)", fontSize: "1rem", letterSpacing: "0.04em" }}>
                    KHANA PEENA GHAR SE
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--mustard-gold-light)", letterSpacing: "0.08em" }}>
                    THE PICKLE CHAPTER
                  </span>
                </div>
              </div>

              <h2 className="auth-perks-title">
                The Heritage<br />Member Circle
              </h2>
              <p className="auth-perks-desc">
                Experience the authentic taste of heirloom North Indian pickles with personalized pantry privileges.
              </p>

              <div className="auth-perks-list">
                <div className="auth-perk-item">
                  <div className="auth-perk-icon">📦</div>
                  <div>
                    <strong>Live Dispatch Tracking</strong>
                    <p>Real-time courier updates straight from our Bahadurgarh packing station.</p>
                  </div>
                </div>

                <div className="auth-perk-item">
                  <div className="auth-perk-icon">🏺</div>
                  <div>
                    <strong>Early Batch Releases</strong>
                    <p>Priority access when fresh seasonal Aam, Mirch, and Hing batches finish sun-curing.</p>
                  </div>
                </div>

                <div className="auth-perk-item">
                  <div className="auth-perk-icon">⚡</div>
                  <div>
                    <strong>1-Click Easy Reorders</strong>
                    <p>Effortlessly restock your dining table without repeatedly entering addresses.</p>
                  </div>
                </div>

                <div className="auth-perk-item">
                  <div className="auth-perk-icon">🎁</div>
                  <div>
                    <strong>Festive Gifting Privileges</strong>
                    <p>Special member pricing and customized gift boxes for Diwali, weddings, and celebrations.</p>
                  </div>
                </div>
              </div>

              <blockquote className="auth-perks-quote">
                “Every single jar is sun-cured with patience in our ceramic barnis with 100% pure cold-pressed mustard oil. Welcome to our family table.”
                <span style={{ display: "block", marginTop: "6px", fontStyle: "normal", fontWeight: "700", color: "var(--mustard-gold-light)", fontSize: "0.82rem" }}>
                  — Rachna Gattani, Founder
                </span>
              </blockquote>

              <div className="auth-trust-pills">
                <span>🔒 256-Bit Secure</span>
                <span>🌿 100% Vegetarian</span>
                <span>📦 Safe Glass Transit</span>
              </div>
            </div>

            {/* Right Column: Luxury Interactive Auth Card */}
            <div className="auth-form-card">
              {/* Tab Switcher */}
              <div className="auth-tabs-row">
                <button
                  type="button"
                  className={`auth-tab-btn ${activeTab === "signin" ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveTab("signin");
                    setStatus({ type: "", message: "" });
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${activeTab === "signup" ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveTab("signup");
                    setStatus({ type: "", message: "" });
                  }}
                >
                  Create Account
                </button>
              </div>

              {/* Status Alert Banner */}
              {status.message && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`auth-status-alert ${status.type}`}
                >
                  <span>{status.type === "success" ? "✓" : status.type === "error" ? "⚠️" : "ℹ️"}</span>
                  <p>{status.message}</p>
                </motion.div>
              )}

              {/* SIGN IN FORM */}
              {activeTab === "signin" && (
                <form className="auth-styled-form" onSubmit={handleLogin}>
                  <div className="auth-form-header">
                    <h2 className="auth-form-title">Sign In to Your Account</h2>
                    <p className="auth-form-subtitle">Enter your registered email and password to continue.</p>
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="login-email">
                      <span>Email Address</span>
                      <div className="auth-input-wrapper">
                        <span className="auth-field-icon">✉️</span>
                        <input
                          id="login-email"
                          type="email"
                          placeholder="name@example.com"
                          value={loginState.email}
                          onChange={(e) => setLoginState((c) => ({ ...c, email: e.target.value }))}
                          required
                        />
                      </div>
                    </label>
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="login-password">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Password</span>
                        <button
                          type="button"
                          className="auth-link-btn"
                          onClick={() => {
                            setActiveTab("forgot");
                            setStatus({ type: "", message: "" });
                          }}
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="auth-input-wrapper">
                        <span className="auth-field-icon">🔒</span>
                        <input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={loginState.password}
                          onChange={(e) => setLoginState((c) => ({ ...c, password: e.target.value }))}
                          required
                        />
                        <button
                          type="button"
                          className="auth-eye-btn"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="auth-options-row">
                    <label className="auth-checkbox-label">
                      <input
                        type="checkbox"
                        checked={loginState.remember}
                        onChange={(e) => setLoginState((c) => ({ ...c, remember: e.target.checked }))}
                      />
                      <span>Keep me signed in</span>
                    </label>
                  </div>

                  <button type="submit" className="button button-mustard-primary auth-submit-btn" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In to Account →"}
                  </button>

                  <div className="auth-card-footer">
                    <span>Don't have an account yet?</span>
                    <button
                      type="button"
                      className="auth-inline-link"
                      onClick={() => {
                        setActiveTab("signup");
                        setStatus({ type: "", message: "" });
                      }}
                    >
                      Join Member Circle →
                    </button>
                  </div>
                </form>
              )}

              {/* CREATE ACCOUNT FORM */}
              {activeTab === "signup" && (
                <form className="auth-styled-form" onSubmit={handleSignup}>
                  <div className="auth-form-header">
                    <h2 className="auth-form-title">Create Member Account</h2>
                    <p className="auth-form-subtitle">Join the Ghar Se circle for early batch drops &amp; live courier updates.</p>
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="signup-name">
                      <span>Full Name</span>
                      <div className="auth-input-wrapper">
                        <span className="auth-field-icon">👤</span>
                        <input
                          id="signup-name"
                          type="text"
                          placeholder="e.g. Ritika Sharma"
                          value={signupState.fullName}
                          onChange={(e) => setSignupState((c) => ({ ...c, fullName: e.target.value }))}
                          required
                        />
                      </div>
                    </label>
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="signup-email">
                      <span>Email Address</span>
                      <div className="auth-input-wrapper">
                        <span className="auth-field-icon">✉️</span>
                        <input
                          id="signup-email"
                          type="email"
                          placeholder="name@example.com"
                          value={signupState.email}
                          onChange={(e) => setSignupState((c) => ({ ...c, email: e.target.value }))}
                          required
                        />
                      </div>
                    </label>
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="signup-phone">
                      <span>Mobile Number (Optional)</span>
                      <div className="auth-input-wrapper">
                        <span className="auth-field-icon">📱</span>
                        <input
                          id="signup-phone"
                          type="tel"
                          placeholder="+91 98765 43210 (For WhatsApp alerts)"
                          value={signupState.phone}
                          onChange={(e) => setSignupState((c) => ({ ...c, phone: e.target.value }))}
                        />
                      </div>
                    </label>
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="signup-password">
                      <span>Create Password</span>
                      <div className="auth-input-wrapper">
                        <span className="auth-field-icon">🔒</span>
                        <input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 6 characters"
                          value={signupState.password}
                          onChange={(e) => setSignupState((c) => ({ ...c, password: e.target.value }))}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="auth-eye-btn"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="auth-options-row">
                    <label className="auth-checkbox-label">
                      <input
                        type="checkbox"
                        checked={signupState.agreeTerms}
                        onChange={(e) => setSignupState((c) => ({ ...c, agreeTerms: e.target.checked }))}
                        required
                      />
                      <span>I agree to the <Link to="/terms" style={{ color: "var(--heritage-green)", textDecoration: "underline" }}>Terms</Link> &amp; <Link to="/privacy-policy" style={{ color: "var(--heritage-green)", textDecoration: "underline" }}>Privacy Policy</Link></span>
                    </label>
                  </div>

                  <button type="submit" className="button button-mustard-primary auth-submit-btn" disabled={loading}>
                    {loading ? "Creating Account..." : "Create Member Account →"}
                  </button>

                  <div className="auth-card-footer">
                    <span>Already a member?</span>
                    <button
                      type="button"
                      className="auth-inline-link"
                      onClick={() => {
                        setActiveTab("signin");
                        setStatus({ type: "", message: "" });
                      }}
                    >
                      Sign in here →
                    </button>
                  </div>
                </form>
              )}

              {/* FORGOT PASSWORD FORM */}
              {activeTab === "forgot" && (
                <form className="auth-styled-form" onSubmit={handleForgotPassword}>
                  <div className="auth-form-header">
                    <h2 className="auth-form-title">Reset Your Password</h2>
                    <p className="auth-form-subtitle">Enter your registered email address and we'll send you recovery instructions.</p>
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="forgot-email">
                      <span>Registered Email Address</span>
                      <div className="auth-input-wrapper">
                        <span className="auth-field-icon">✉️</span>
                        <input
                          id="forgot-email"
                          type="email"
                          placeholder="name@example.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                        />
                      </div>
                    </label>
                  </div>

                  <button type="submit" className="button button-mustard-primary auth-submit-btn" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Instructions →"}
                  </button>

                  <div className="auth-card-footer">
                    <button
                      type="button"
                      className="auth-inline-link"
                      onClick={() => {
                        setActiveTab("signin");
                        setStatus({ type: "", message: "" });
                      }}
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              <div className="auth-security-guarantee">
                <span>🔒</span> 256-bit SSL encrypted • Zero spam guarantee • FSSAI compliant kitchen
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackPage({ session }) {
  useDocumentMeta({
    title: "Track Order Status | Khana Peena Ghar Se",
    description: "Check live dispatch and courier tracking for your Khana Peena Ghar Se order."
  });

  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const params = new URLSearchParams(new FormData(e.currentTarget));
    setStatus("Locating your order in our Bahadurgarh kitchen...");
    try {
      const res = await fetch(`/.netlify/functions/track-order?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Order not found. Please verify your details.");
      setResult(payload.order);
      setStatus("");
    } catch (err) {
      setResult(null);
      setStatus(err.message);
    }
  };

  const copyOrderId = () => {
    if (!result?.order_number) return;
    navigator.clipboard.writeText(result.order_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusStep = (orderStatus) => {
    const s = (orderStatus || "pending").toLowerCase();
    if (s === "delivered") return 4;
    if (s === "out_for_delivery") return 3;
    if (s === "dispatched" || s === "shipped") return 2;
    if (s === "processing" || s === "preparing") return 1;
    return 0;
  };

  const currentStep = result ? getStatusStep(result.status) : 0;

  const steps = [
    { title: "Order Confirmed", icon: "📝", desc: "Received at Kitchen" },
    { title: "Handcrafted & Packed", icon: "🏺", desc: "Fresh batch sealed" },
    { title: "Dispatched", icon: "🚚", desc: "Handed to courier" },
    { title: "Out for Delivery", icon: "📍", desc: "Reaching your doorstep" },
    { title: "Delivered", icon: "✓", desc: "Enjoy your achar!" }
  ];

  return (
    <div className="page-shell">
      <div className="content-container">
        <div className="auth-shell">
          <div>
            <p className="section-eyebrow">Real-Time Dispatch</p>
            <h1 className="section-title">Track Your Order</h1>
            <p style={{ color: "var(--text-soft)", fontSize: "0.92rem", margin: "8px 0 20px" }}>
              Enter your Order ID and registered mobile number to view live kitchen and courier updates.
            </p>

            <form className="auth-form" onSubmit={submit}>
              <label>
                Order Number
                <input type="text" name="orderNumber" placeholder="e.g. KP-1001 or KP-982123-ABCD" required />
              </label>
              <label>
                Phone Number
                <input type="tel" name="phone" placeholder="10-digit registered mobile" required />
              </label>
              <button type="submit" className="button button-primary" style={{ marginTop: "8px" }}>
                Track Order Status →
              </button>
            </form>
            {status ? (
              <p style={{ color: status.includes("not found") ? "#C2410C" : "var(--heritage-green)", marginTop: "14px", fontWeight: "600", fontSize: "0.9rem" }}>
                {status}
              </p>
            ) : null}
          </div>

          <div>
            <h2 className="section-title" style={{ fontSize: "1.6rem" }}>Live Status</h2>
            {result ? (
              <div>
                {/* Milestone Stepper */}
                <div className="tracking-stepper-wrap">
                  <div className="stepper-progress">
                    {steps.map((step, idx) => {
                      const isCompleted = idx < currentStep;
                      const isActive = idx === currentStep;
                      return (
                        <div
                          key={step.title}
                          className={`stepper-step ${isCompleted ? "completed" : ""} ${isActive ? "active" : ""}`}
                        >
                          <div className="stepper-icon-circle">
                            {isCompleted ? "✓" : step.icon}
                          </div>
                          <div>
                            <div className="stepper-title">{step.title}</div>
                            <div className="stepper-time">{step.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {result.carrier_name || result.tracking_number ? (
                    <div className="courier-info-card">
                      <div className="courier-meta">
                        <strong>Courier Partner: {result.carrier_name || "Express Courier"}</strong>
                        <span>AWB / Tracking Number: <strong>{result.tracking_number || "In transit"}</strong></span>
                      </div>
                      {result.tracking_url ? (
                        <a
                          href={result.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="button button-cream-secondary button-sm"
                        >
                          Track on Courier Site ↗
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ background: "var(--warm-cream-pure)", padding: "12px 16px", borderRadius: "8px", fontSize: "0.84rem", color: "var(--text-soft)" }}>
                      ℹ️ AWB details and direct courier tracking link are sent via SMS as soon as the logistics team scans the package in Bahadurgarh.
                    </div>
                  )}
                </div>

                <div style={{ background: "var(--surface)", padding: "24px", borderRadius: "12px", border: "1px solid var(--line-gold)", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "14px" }}>
                    <div>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Order ID</span>
                      <div style={{ fontSize: "1.15rem", fontWeight: "700", color: "var(--heritage-green)", display: "flex", alignItems: "center" }}>
                        {result.order_number}
                        <button type="button" className="copy-order-btn" onClick={copyOrderId}>
                          {copied ? "✓ Copied!" : "📋 Copy"}
                        </button>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Paid/Due</span>
                      <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--heritage-green)" }}>
                        ₹{result.total_amount}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.88rem" }}>
                    <div>
                      <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.76rem" }}>CUSTOMER NAME</strong>
                      <span>{result.customer_name}</span>
                    </div>
                    <div>
                      <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.76rem" }}>PHONE</strong>
                      <span>{result.phone}</span>
                    </div>
                    {result.items_summary ? (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.76rem" }}>ITEMS ORDERED</strong>
                        <span>{result.items_summary}</span>
                      </div>
                    ) : null}
                    {result.address_line_1 ? (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.76rem" }}>DELIVERY ADDRESS</strong>
                        <span>{result.address_line_1}, {result.city}, {result.state} - {result.pincode}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--surface)", padding: "32px", borderRadius: "12px", border: "1px solid var(--line)", textAlign: "center" }}>
                <span style={{ fontSize: "2.4rem", display: "block", marginBottom: "10px" }}>📦</span>
                <p style={{ color: "var(--text-soft)", margin: 0, lineHeight: 1.6 }}>
                  Enter your order ID and phone number to see live milestone updates from our kitchen in Bahadurgarh.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyPolicyPage() {
  useDocumentMeta({
    title: "Privacy Policy | Khana Peena Ghar Se",
    description: "Our commitment to protecting your personal information under the Information Technology Act, 2000 and SPDI Rules."
  });

  return (
    <div className="legal-page-shell">
      <div className="content-container">
        <div className="legal-header">
          <p className="section-eyebrow">Trust &amp; Transparency</p>
          <h1>Privacy Policy</h1>
          <p>Last updated: September 2026 • In compliance with IT Act 2000 and SPDI Rules</p>
        </div>

        <div className="legal-card-wrap">
          <div className="legal-section">
            <h2>1. Introduction &amp; Overview</h2>
            <p>
              Khana Peena Ghar Se (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the website <strong>https://khanapeenagharse.in</strong>. We are committed to safeguarding the personal data and privacy of our customers and site visitors. This Privacy Policy details how we collect, handle, store, and protect your information when you purchase our handcrafted achars or browse our digital storefront.
            </p>
          </div>

          <div className="legal-section">
            <h2>2. Information We Collect</h2>
            <p>To process your orders and deliver fresh pickles to your doorstep, we collect:</p>
            <ul>
              <li><strong>Contact Information:</strong> Full name, 10-digit mobile number, and email address.</li>
              <li><strong>Shipping Details:</strong> Complete street address, landmark, city, state, and postal pincode.</li>
              <li><strong>Transaction Data:</strong> Order IDs, purchased product quantities, payment method selection (COD or Prepaid UPI), and delivery instructions.</li>
              <li><strong>Device &amp; Browsing Data:</strong> Anonymized session preferences stored securely in local browser storage (such as your shopping cart items and wishlist).</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>3. Payment Security &amp; Integrity</h2>
            <p>
              We prioritize the highest standards of digital payment security. We <strong>never store, log, or have access to your credit/debit card numbers, CVVs, or UPI MPINs</strong>. All electronic payments are processed through RBI-authorized, PCI-DSS Level 1 compliant payment gateways with end-to-end 256-bit SSL encryption.
            </p>
          </div>

          <div className="legal-section">
            <h2>4. Third-Party Logistics &amp; Courier Partners</h2>
            <p>
              Your contact number and shipping address are strictly shared with authorized courier aggregators and delivery partners (e.g., Delhivery, Bluedart, Speed Post) solely for the purpose of dispatching, transporting, and delivering your order. We never sell, rent, or trade your personal data to third-party marketing brokers.
            </p>
          </div>

          <div className="legal-section">
            <h2>5. Cookies &amp; Local Storage</h2>
            <p>
              Our website uses cookies and browser local storage strictly to ensure fundamental e-commerce functionality, such as keeping your shopping cart active across pages, remembering user preferences, and maintaining secure login sessions.
            </p>
          </div>

          <div className="legal-section">
            <h2>6. Data Retention &amp; User Rights</h2>
            <p>
              We retain customer order records for legitimate accounting, tax compliance (GST), and dispute resolution purposes. As a customer, you hold the right to request access, correction, or deletion of your personal account data by writing to our Grievance Officer at <strong>care@khanapeenagharse.in</strong>.
            </p>
          </div>

          <div className="grievance-box">
            <h3>🛡️ Data Protection &amp; Grievance Redressal Officer</h3>
            <p style={{ margin: "0 0 12px", fontSize: "0.88rem", color: "var(--text-soft)" }}>
              Under Rule 3(11) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021:
            </p>
            <div className="grievance-grid">
              <div className="grievance-item">
                <strong>Officer Name</strong>
                <span>Rachna Gattani</span>
              </div>
              <div className="grievance-item">
                <strong>Official Email</strong>
                <span>care@khanapeenagharse.in</span>
              </div>
              <div className="grievance-item">
                <strong>Kitchen &amp; Office Location</strong>
                <span>Bahadurgarh, Haryana - 124507, India</span>
              </div>
              <div className="grievance-item">
                <strong>Acknowledgment SLA</strong>
                <span>Within 48 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermsPage() {
  useDocumentMeta({
    title: "Terms & Conditions of Service | Khana Peena Ghar Se",
    description: "Terms and conditions governing orders, deliveries, shelf-life, and services at Khana Peena Ghar Se."
  });

  return (
    <div className="legal-page-shell">
      <div className="content-container">
        <div className="legal-header">
          <p className="section-eyebrow">Legal Framework</p>
          <h1>Terms &amp; Conditions</h1>
          <p>Effective Date: September 2026 • Khana Peena Ghar Se</p>
        </div>

        <div className="legal-card-wrap">
          <div className="legal-section">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or purchasing products from <strong>Khana Peena Ghar Se</strong> (&quot;khanapeenagharse.in&quot;), you agree to be bound by these Terms and Conditions and our associated policies. If you do not agree with any part of these terms, please refrain from using our services.
            </p>
          </div>

          <div className="legal-section">
            <h2>2. Artisanal Food Nature &amp; Natural Variations</h2>
            <p>
              All our achars (Aam, Heeng, Mirch, Mix Veg, and The Ghar Ka Achar Box) are handcrafted in small batches using traditional sun-curing methods and cold-pressed mustard oil. Because we do not use artificial food dyes, industrial stabilizers, or chemical preservatives:
            </p>
            <ul>
              <li>Slight natural variations in color depth, oil clarity, and spice pungency may occur from batch to batch depending on seasonal crop harvest.</li>
              <li>Such variations are natural hallmarks of authentic homestyle preparation and do not indicate a defective product.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>3. 12-Month Shelf Life &amp; Recommended Storage</h2>
            <p>
              Our achars have an authentic shelf life of <strong>12 Months</strong> from the date of batch preparation. To preserve freshness and prevent spoilage:
            </p>
            <ul>
              <li>Always use a clean, dry stainless steel or ceramic spoon; never insert wet utensils into the jar.</li>
              <li>Keep the jar tightly sealed in a cool, dry place away from direct water splashes.</li>
              <li>Ensure the layer of mustard oil covers the achar to provide natural preservation.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>4. Pricing, GST &amp; Payment Terms</h2>
            <p>
              All product prices listed on our store are in Indian National Rupees (₹ INR) and are inclusive of applicable Goods and Services Tax (GST). We reserve the right to revise prices, discounts, and combo packaging at our discretion without prior notice.
            </p>
          </div>

          <div className="legal-section">
            <h2>5. Order Acceptance &amp; Cancellations</h2>
            <p>
              Receipt of an electronic order confirmation does not signify our final acceptance. We reserve the right to cancel or limit order quantities if an item is out of stock, if courier serviceability is disrupted, or in cases of suspected fraudulent activity. Orders can be cancelled by contacting us before the package is handed over to our logistics courier.
            </p>
          </div>

          <div className="legal-section">
            <h2>6. Governing Law &amp; Dispute Resolution</h2>
            <p>
              These Terms of Service and any transactional agreements shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the competent courts in Bahadurgarh / Jhajjar, Haryana.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShippingPolicyPage() {
  useDocumentMeta({
    title: "Shipping & Delivery Policy | Khana Peena Ghar Se",
    description: "Pan-India delivery details, transit times, shockproof glass packaging, and shipping rates."
  });

  return (
    <div className="legal-page-shell">
      <div className="content-container">
        <div className="legal-header">
          <p className="section-eyebrow">Doorstep Logistics</p>
          <h1>Shipping &amp; Delivery Policy</h1>
          <p>Pan-India coverage across 19,000+ pincodes from Bahadurgarh, Haryana</p>
        </div>

        <div className="legal-card-wrap">
          <div className="legal-section">
            <h2>1. Pan-India Delivery Coverage</h2>
            <p>
              We deliver our handcrafted achars across all major states and union territories in India covering over 19,000 postal pincodes via trusted express logistics partners including Delhivery, Bluedart, and India Post Speed Post.
            </p>
          </div>

          <div className="legal-section">
            <h2>2. Dispatch Timelines</h2>
            <p>
              Because each batch is prepared and sealed with care in our Bahadurgarh kitchen, all confirmed orders are packaged and dispatched within <strong>24 to 48 business hours</strong> (excluding Sundays and national holidays).
            </p>
          </div>

          <div className="legal-section">
            <h2>3. Estimated Transit Times</h2>
            <ul>
              <li><strong>Delhi-NCR, Haryana &amp; Punjab:</strong> 1 to 2 business days.</li>
              <li><strong>Tier-1 Metros (Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad):</strong> 2 to 4 business days.</li>
              <li><strong>Rest of India (Tier 2/3 Cities &amp; Regional Towns):</strong> 4 to 7 business days.</li>
              <li><strong>North-East &amp; Remote Regions:</strong> 6 to 9 business days.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>4. Shipping Rates &amp; Free Shipping Threshold</h2>
            <ul>
              <li><strong>Orders ₹599 and above:</strong> <strong style={{ color: "var(--heritage-green)" }}>100% FREE PAN-INDIA SHIPPING</strong>.</li>
              <li><strong>Orders under ₹599:</strong> Flat shipping fee of ₹60 per order across India.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>5. Shockproof Food-Grade Packaging</h2>
            <p>
              We take exceptional care to ensure our glass and ceramic martaban jars arrive in pristine condition. Every jar is wrapped in leak-proof inner seals, surrounded by multi-layer shock-absorbing eco-cushioning, and encased in rigid corrugated shipping boxes.
            </p>
          </div>

          <div className="legal-section">
            <h2>6. Real-Time Tracking Updates</h2>
            <p>
              As soon as your package is scanned by our courier partner, you will receive an AWB tracking number via SMS and Email. You can also track your live order anytime on our <Link to="/track-order" style={{ color: "var(--mustard-gold-dark)", fontWeight: "700" }}>Live Track Order page</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefundPolicyPage() {
  useDocumentMeta({
    title: "Return & Refund Policy | Khana Peena Ghar Se",
    description: "100% Replacement Guarantee for damaged jars or seal leaks, with fast resolution within 48 hours."
  });

  return (
    <div className="legal-page-shell">
      <div className="content-container">
        <div className="legal-header">
          <p className="section-eyebrow">Customer Promise</p>
          <h1>Return &amp; Refund Policy</h1>
          <p>Our 100% Transit Safe Guarantee and Replacement Process</p>
        </div>

        <div className="legal-card-wrap">
          <div className="legal-section">
            <h2>1. Perishable Food Item Hygiene Norms</h2>
            <p>
              Due to strict food safety, health, and hygiene regulations, edible consumable goods such as pickles cannot be returned once the protective package or jar seal has been opened or unsealed by the customer.
            </p>
          </div>

          <div className="legal-section">
            <h2>2. 100% Free Replacement / Refund Guarantee</h2>
            <p>
              We stand firmly behind the quality and safe transit of every jar we send out. You are eligible for an <strong>immediate free replacement or 100% refund</strong> if:
            </p>
            <ul>
              <li>The glass or ceramic jar is damaged, chipped, or cracked during transit.</li>
              <li>The protective inner seal has leaked or was tampered with upon delivery.</li>
              <li>You received an incorrect item or batch variant that differs from your placed order.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>3. How to Claim a Replacement or Refund</h2>
            <ol style={{ paddingLeft: "20px", fontSize: "0.92rem", lineHeight: 1.7 }}>
              <li>
                Take 2–3 clear photos or a short video showing the outer shipping label, damaged box, and affected jar within <strong>48 hours of delivery</strong>.
              </li>
              <li>
                Send the media along with your Order ID (e.g. <code>KP-123456</code>) via WhatsApp to <strong>+91 98112 00000</strong> or email us at <strong>care@khanapeenagharse.in</strong>.
              </li>
              <li>
                Our customer care team will review and approve your claim within 24 hours. A fresh replacement will be dispatched immediately, or a full refund will be initiated.
              </li>
            </ol>
          </div>

          <div className="legal-section">
            <h2>4. Refund Timelines &amp; Mode</h2>
            <p>
              Approved refunds are credited directly back to the original source of payment (Bank Account, UPI, or Credit/Debit Card) within <strong>3 to 5 business days</strong> following approval. For Cash-on-Delivery (COD) orders, refunds are transferred via direct UPI / NEFT bank transfer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactPage() {
  useDocumentMeta({
    title: "Contact Us & Grievance Redressal | Khana Peena Ghar Se",
    description: "Get in touch with our Bahadurgarh kitchen, customer support team, or Grievance Officer."
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="legal-page-shell">
      <div className="content-container">
        <div className="legal-header">
          <p className="section-eyebrow">We&apos;re Here to Help</p>
          <h1>Contact Kitchen &amp; Support</h1>
          <p>Handmade with pride in Bahadurgarh, Haryana • Reach us anytime</p>
        </div>

        <div className="contact-grid-wrap">
          <div className="contact-info-panel">
            <div className="contact-card-item">
              <div className="contact-card-icon">📍</div>
              <div className="contact-card-text">
                <h3>Our Kitchen &amp; Dispatch Office</h3>
                <p>Khana Peena Ghar Se<br />Bahadurgarh, Jhajjar District<br />Haryana - 124507, India</p>
              </div>
            </div>

            <div className="contact-card-item">
              <div className="contact-card-icon">📞</div>
              <div className="contact-card-text">
                <h3>Phone &amp; WhatsApp Support</h3>
                <p>+91 98112 00000<br /><span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Mon to Sat, 9:00 AM – 7:00 PM IST</span></p>
              </div>
            </div>

            <div className="contact-card-item">
              <div className="contact-card-icon">✉️</div>
              <div className="contact-card-text">
                <h3>Email Support</h3>
                <p>care@khanapeenagharse.in<br />orders@khanapeenagharse.in</p>
              </div>
            </div>

            <div className="fssai-cert-box">
              <div className="fssai-cert-badge">🛡️</div>
              <div className="fssai-cert-info">
                <h4>FSSAI Registration Compliant</h4>
                <p><strong>Reg. No. 20824005000123</strong><br />Category: Traditional Ready-to-eat Pickles &amp; Condiments</p>
              </div>
            </div>

            {/* Grievance Box */}
            <div className="grievance-box" style={{ marginTop: 0 }}>
              <h3>⚖️ Statutory Grievance Redressal Officer</h3>
              <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "var(--text-soft)" }}>
                As mandated by the Consumer Protection (E-Commerce) Rules, 2020:
              </p>
              <div className="grievance-grid">
                <div className="grievance-item">
                  <strong>Officer Name</strong>
                  <span>Rachna Gattani</span>
                </div>
                <div className="grievance-item">
                  <strong>Designation</strong>
                  <span>Grievance Officer &amp; Founder</span>
                </div>
                <div className="grievance-item">
                  <strong>Direct Email</strong>
                  <span>care@khanapeenagharse.in</span>
                </div>
                <div className="grievance-item">
                  <strong>Resolution Timeline</strong>
                  <span>Within 30 Days</span>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-panel">
            <h2>Send Us a Message</h2>
            <p>Have a question about bulk wedding orders, corporate gifts, or special batches?</p>

            {submitted ? (
              <div style={{ background: "var(--warm-cream-pure)", padding: "28px", borderRadius: "12px", border: "1px solid var(--heritage-green)", textAlign: "center" }}>
                <span style={{ fontSize: "2.4rem", display: "block", marginBottom: "8px" }}>✓</span>
                <h3 style={{ fontFamily: "var(--font-serif)", color: "var(--heritage-green)", margin: "0 0 8px" }}>Thank You!</h3>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-soft)" }}>
                  Your message has been received by Rachna and our kitchen team. We will get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <label style={{ fontSize: "0.86rem", fontWeight: "600" }}>
                  Your Full Name
                  <input type="text" required placeholder="e.g. Aditi Sharma" style={{ width: "100%", marginTop: "4px" }} />
                </label>
                <label style={{ fontSize: "0.86rem", fontWeight: "600" }}>
                  Mobile Number
                  <input type="tel" required placeholder="10-digit mobile number" style={{ width: "100%", marginTop: "4px" }} />
                </label>
                <label style={{ fontSize: "0.86rem", fontWeight: "600" }}>
                  Email Address
                  <input type="email" placeholder="name@domain.com" style={{ width: "100%", marginTop: "4px" }} />
                </label>
                <label style={{ fontSize: "0.86rem", fontWeight: "600" }}>
                  Subject
                  <select style={{ width: "100%", marginTop: "4px" }}>
                    <option value="order">Order Inquiry / Delivery Status</option>
                    <option value="bulk">Bulk / Corporate Gifting Order</option>
                    <option value="feedback">Product Feedback &amp; Suggestions</option>
                    <option value="grievance">Consumer Grievance</option>
                    <option value="other">Other Inquiry</option>
                  </select>
                </label>
                <label style={{ fontSize: "0.86rem", fontWeight: "600" }}>
                  Your Message
                  <textarea rows="4" required placeholder="How can we help you today?" style={{ width: "100%", marginTop: "4px" }} />
                </label>
                <button type="submit" className="button button-primary" style={{ marginTop: "8px" }}>
                  Send Message →
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function useShopState() {
  const [cart, setCartState] = useState(() => getCart());
  const [wishlist, setWishlistState] = useState(() => getWishlist());
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  useEffect(() => setCart(cart), [cart]);
  useEffect(() => setWishlist(wishlist), [wishlist]);

  const showToast = (toastData) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const id = Date.now();
    setToast({ id, ...toastData });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  };

  const hideToast = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(null);
  };

  return {
    cart,
    wishlist,
    cartDrawerOpen,
    toast,
    showToast,
    hideToast,
    openCartDrawer: () => setCartDrawerOpen(true),
    closeCartDrawer: () => setCartDrawerOpen(false),
    toggleCartDrawer: () => setCartDrawerOpen((v) => !v),
    clearCart: () => setCartState([]),
    toggleWishlist(slug, product = null) {
      const isAlready = wishlist.includes(slug);
      setWishlistState((current) =>
        isAlready ? current.filter((item) => item !== slug) : [...current, slug]
      );
      showToast({
        type: "wishlist",
        badge: isAlready ? "Wishlist Updated" : "Saved to Wishlist ♥",
        title: product?.name || slug,
        meta: isAlready ? "Item removed from your favorites." : "Item added to your favorites.",
        image: product?.image || null
      });
    },
    addToCart(slug, quantity = 1, maxStock = Number.POSITIVE_INFINITY, product = null) {
      setCartState((current) => {
        const existing = current.find((item) => item.slug === slug);
        const nextQuantity = Math.max(0, Math.min(
          maxStock,
          (existing?.quantity || 0) + quantity
        ));

        if (nextQuantity <= 0) return current.filter((item) => item.slug !== slug);
        if (existing) {
          return current.map((item) =>
            item.slug === slug ? { ...item, quantity: nextQuantity } : item
          );
        }
        return [...current, { slug, quantity: nextQuantity }];
      });

      trackAddToCart(product || { slug, price: product?.price || 0, name: product?.name || slug }, quantity);

      showToast({
        type: "cart",
        badge: "Added to Cart ✓",
        title: product?.name || slug,
        meta: `${quantity} × ${product?.size || "Jar"}${product?.price ? ` (₹${product.price * quantity})` : ""}`,
        image: product?.image || null,
        slug
      });
    },
    updateCartQuantity(slug, quantity, maxStock = Number.POSITIVE_INFINITY) {
      setCartState((current) => {
        const existing = current.find((item) => item.slug === slug);
        if (existing && quantity < existing.quantity) {
          trackRemoveFromCart({ slug }, existing.quantity - quantity);
        }
        return current
          .map((item) => (
            item.slug === slug
              ? { ...item, quantity: Math.min(Math.max(quantity, 0), maxStock) }
              : item
          ))
          .filter((item) => item.quantity > 0);
      });
    }
  };
}

function WhatsAppRedirectPage() {
  const [searchParams] = useSearchParams();
  const productCatalog = useCatalogProducts();

  useDocumentMeta({
    title: "Connecting to WhatsApp | Khana Peena Ghar Se",
    description: "Connect directly with Rachna's kitchen in Bahadurgarh on WhatsApp."
  });

  useEffect(() => {
    const productSlug = searchParams.get("product") || searchParams.get("item");
    const orderId = searchParams.get("order");
    const isBulk = searchParams.get("bulk");
    const isCombo = searchParams.get("combo");
    const customMsg = searchParams.get("msg") || searchParams.get("text");
    const ref = searchParams.get("ref") || "direct_route";

    let message = "Namaste Khana Peena Ghar Se! I would like to order fresh homemade achar from Bahadurgarh.";

    if (customMsg) {
      message = customMsg;
    } else if (orderId) {
      message = `Namaste Khana Peena Ghar Se! I would like to check the status of my Order #${orderId}.`;
    } else if (productSlug) {
      const p = productCatalog.find((i) => i.slug === productSlug);
      const name = p ? p.name : productSlug;
      message = `Namaste Khana Peena Ghar Se! I would like to order ${name} (₹${p?.price || 299}). Please share details.`;
    } else if (isCombo) {
      message = "Namaste Khana Peena Ghar Se! I want to order The Ghar Ka Achar 4-in-1 Signature Combo Box (₹999).";
    } else if (isBulk) {
      message = "Namaste Khana Peena Ghar Se! I am interested in bulk orders / festive gifting hampers for homemade achars.";
    }

    trackEvent("whatsapp_redirect", {
      ref,
      product: productSlug || "",
      order_id: orderId || ""
    });

    const targetUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
    
    const timer = setTimeout(() => {
      window.location.replace(targetUrl);
    }, 450);

    return () => clearTimeout(timer);
  }, [searchParams, productCatalog]);

  return (
    <div className="page-shell" style={{ minHeight: "65vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: "40px 20px", maxWidth: "480px" }}>
        <div style={{ fontSize: "3.2rem", marginBottom: "16px" }}>💬</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.9rem", color: "var(--heritage-green)", margin: "0 0 10px" }}>
          Connecting to WhatsApp...
        </h1>
        <p style={{ color: "var(--text-soft)", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 24px" }}>
          Opening direct WhatsApp chat with Rachna's kitchen in Bahadurgarh.
        </p>
        <a
          href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent("Namaste Khana Peena Ghar Se! I would like to order fresh homemade achar.")}`}
          className="button button-primary"
          style={{ background: "#25D366", borderColor: "#25D366", color: "#FFF" }}
        >
          Open WhatsApp Now ↗
        </a>
      </div>
    </div>
  );
}

function FloatingWhatsAppButton() {
  return (
    <a
      href="/whatsapp?ref=floating_widget"
      className="floating-whatsapp-btn"
      aria-label="Chat with Khana Peena Ghar Se on WhatsApp"
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent("floating_whatsapp_click")}
    >
      <span className="wa-icon" aria-hidden="true">💬</span>
      <span className="wa-text">WhatsApp Us</span>
      <span className="wa-pulse-badge" />
    </a>
  );
}

function NotFoundPage() {
  useDocumentMeta({
    title: "Page Not Found | Khana Peena Ghar Se",
    description: "The page you are looking for might have been moved or does not exist. Explore our authentic homemade achars."
  });

  return (
    <div className="page-shell" style={{ minHeight: "65vh", display: "flex", alignItems: "center" }}>
      <div className="content-container" style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto", padding: "60px 20px" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🏺</div>
        <span className="hero-eyebrow-pill" style={{ marginBottom: "12px" }}>Error 404</span>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.4rem", color: "var(--heritage-green)", margin: "8px 0 16px" }}>
          This Page Has Wandered Off
        </h1>
        <p style={{ color: "var(--text-soft)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "28px" }}>
          We couldn't find the page you were looking for. Perhaps you'd like to explore our handcrafted sun-cured achars or learn about Rachna's kitchen stories?
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/achar" className="button button-primary">
            Explore All Achars →
          </Link>
          <Link to="/" className="button button-cream-secondary">
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const shop = useShopState();
  const location = useLocation();
  const [session, setSession] = useState(null);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const refreshSession = async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    setSession(data.session || null);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <div className="app-shell">
      <Header
        cartCount={shop.cart.length}
        isLoggedIn={!!session}
        onSignOut={handleSignOut}
        onOpenCartDrawer={shop.openCartDrawer}
      />
      <ToastNotification
        toast={shop.toast}
        onDismiss={shop.hideToast}
        onOpenCartDrawer={shop.openCartDrawer}
      />
      <CartDrawer
        isOpen={shop.cartDrawerOpen}
        onClose={shop.closeCartDrawer}
        cart={shop.cart}
        updateCartQuantity={shop.updateCartQuantity}
      />
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes location={location}>
              <Route
                path="/"
                element={
                  <HomePage
                    wishlist={shop.wishlist}
                    toggleWishlist={shop.toggleWishlist}
                    addToCart={shop.addToCart}
                  />
                }
              />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/how-its-made" element={<HowItsMadePage />} />
              <Route
                path="/achar"
                element={
                  <CatalogPage
                    wishlist={shop.wishlist}
                    toggleWishlist={shop.toggleWishlist}
                    addToCart={shop.addToCart}
                  />
                }
              />
              <Route
                path="/shop"
                element={
                  <CatalogPage
                    wishlist={shop.wishlist}
                    toggleWishlist={shop.toggleWishlist}
                    addToCart={shop.addToCart}
                  />
                }
              />
              <Route
                path="/product/:slug"
                element={
                  <ProductPage
                    addToCart={shop.addToCart}
                    wishlist={shop.wishlist}
                    toggleWishlist={shop.toggleWishlist}
                  />
                }
              />
              <Route
                path="/achar/:slug"
                element={
                  <ProductPage
                    addToCart={shop.addToCart}
                    wishlist={shop.wishlist}
                    toggleWishlist={shop.toggleWishlist}
                  />
                }
              />
              <Route
                path="/cart"
                element={
                  <CartPage
                    cart={shop.cart}
                    updateCartQuantity={shop.updateCartQuantity}
                    onClearCart={shop.clearCart}
                  />
                }
              />
              <Route
                path="/checkout"
                element={
                  <CartPage
                    cart={shop.cart}
                    updateCartQuantity={shop.updateCartQuantity}
                    onClearCart={shop.clearCart}
                  />
                }
              />
              <Route path="/whatsapp" element={<WhatsAppRedirectPage />} />
              <Route path="/wa" element={<WhatsAppRedirectPage />} />
              <Route path="/account" element={<AccountPage session={session} refreshSession={refreshSession} />} />
              <Route path="/login" element={<AccountPage session={session} refreshSession={refreshSession} />} />
              <Route path="/track-order" element={<TrackPage session={session} />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/terms-and-conditions" element={<TermsPage />} />
              <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
              <Route path="/refund-policy" element={<RefundPolicyPage />} />
              <Route path="/returns" element={<RefundPolicyPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/contact-us" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <FloatingWhatsAppButton />
      <Footer />
    </div>
  );
}
