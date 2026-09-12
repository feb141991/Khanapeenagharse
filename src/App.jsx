import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { faqs, products, testimonials } from "./data";
import { hasSupabaseClientEnv, supabase } from "./supabaseClient";
import { getCart, getWishlist, setCart, setWishlist } from "./store";

const ZOMATO_URL =
  "https://www.zomato.com/bahadurgarh/khana-peena-ghar-se-bahadurgarh-locality/order";
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

function Header({ cartCount, isLoggedIn, onSignOut }) {
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
    { to: "/account", label: isLoggedIn ? "My Account" : "Login" },
    { to: "/cart", label: `Cart${cartCount ? ` (${cartCount})` : ""}` }
  ];

  return (
    <header className="app-header">
      <Link className="brand" to="/" aria-label="Khana Peena Ghar Se home">
        <img src="/images/logo.png" alt="Khana Peena Ghar Se logo" />
        <span className="brand-copy">
          <strong>KHANA PEENA GHAR SE</strong>
          <span>THE PICKLE CHAPTER</span>
        </span>
      </Link>

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

      <nav className={`app-nav ${menuOpen ? "open" : ""}`} aria-label="Main Navigation">
        <div className="nav-links">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} className={`nav-pill ${active ? "active" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="nav-actions">
          <Link to="/achar" className="nav-cta-btn">
            Shop Achar
          </Link>
          {isLoggedIn ? (
            <button className="nav-admin" type="button" onClick={onSignOut}>
              Sign Out
            </button>
          ) : null}
        </div>
      </nav>
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

function HeroSection() {
  return (
    <section className="heritage-hero">
      <div className="content-container">
        <div className="hero-grid">
          <motion.div
            className="hero-copy-wrap"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="hero-eyebrow">Artisanal Indian Pickles</span>
            <h1 className="hero-headline">
              Recipes passed down.<br />Pickles made today.
            </h1>
            <p className="hero-subhead">
              Taste the achar. Remember the home.
            </p>
            <p className="hero-body">
              Traditional homemade pickles prepared in small batches from our family kitchen in Bahadurgarh. Same recipes. Pure cold-pressed mustard oil. Real ingredients. A taste of home, always.
            </p>
            <div className="hero-buttons">
              <Link to="/achar" className="button button-primary">
                Shop Achar →
              </Link>
              <Link to="/about" className="button button-secondary">
                Our Story
              </Link>
            </div>
            <div className="hero-local-pill">
              <span>📍 In Bahadurgarh today?</span>
              <a href={ZOMATO_URL} target="_blank" rel="noreferrer">
                Order local delivery on Zomato ↗
              </a>
            </div>
          </motion.div>

          <motion.div
            className="hero-media-wrap"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="hero-image-card"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            >
              <img
                src={HOME_HERO_IMAGE}
                alt="Traditional homemade Indian achar jars on dining table"
                onError={(e) => {
                  e.currentTarget.src = "/images/logo.png";
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
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
            <motion.article
              key={product.slug}
              className="product-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.06 }}
            >
              <div className="product-card-visual">
                <span className="product-card-tag">{product.category}</span>
                <button
                  type="button"
                  className={`product-wishlist-btn ${wishlist.includes(product.slug) ? "is-active" : ""}`}
                  aria-label={`Save ${product.name} to wishlist`}
                  onClick={() => toggleWishlist(product.slug)}
                >
                  ♥
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
                  className="button button-primary button-sm"
                  disabled={product.stock <= 0}
                  onClick={() => addToCart(product.slug, 1, product.stock)}
                >
                  {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                </button>
                <Link to={`/product/${product.slug}`} className="button button-cream-secondary button-sm">
                  View
                </Link>
              </div>
            </motion.article>
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
    caption: "Crispy layered parathas & slow-cured mango achar"
  },
  {
    src: "/images/brand/lifestyle-2.jpg",
    title: "Handcrafted Tradition",
    caption: "Pure kacchi ghani mustard oil & roasted whole masalas"
  },
  {
    src: "/images/brand/lifestyle-3.jpg",
    title: "Family Feasts",
    caption: "Sunday poori-aloo with homestyle pickle"
  },
  {
    src: "/images/brand/lifestyle-4.jpg",
    title: "Authentic Punch",
    caption: "Spiced green chillies & roasted fenugreek masalas"
  }
];

function LifestyleBanner() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % LIFESTYLE_SLIDES.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [isPaused]);

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
            <p className="hero-eyebrow">A Taste of Tradition</p>
            <h2>Not just a pickle.<br />A piece of home.</h2>
            <p>
              Some meals need a little achar. Some memories do too. Handcrafted with patience, cold-pressed mustard oil, and authentic masalas.
            </p>
            <Link to="/achar" className="button button-primary">
              Shop The Pickle Chapter →
            </Link>
          </motion.div>

          <div className="lifestyle-vertical-showcase">
            <div className="lifestyle-carousel-stage">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdx}
                  className="lifestyle-slide-main"
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <img
                    src={LIFESTYLE_SLIDES[activeIdx].src}
                    alt={LIFESTYLE_SLIDES[activeIdx].title}
                  />
                  <div className="lifestyle-slide-caption">
                    <strong>{LIFESTYLE_SLIDES[activeIdx].title}</strong>
                    <span>{LIFESTYLE_SLIDES[activeIdx].caption}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Vertical Thumbnail Indicator Rail */}
            <div className="lifestyle-vertical-nav" aria-label="Lifestyle slides navigation">
              {LIFESTYLE_SLIDES.map((slide, idx) => (
                <button
                  key={slide.title}
                  type="button"
                  className={`lifestyle-thumb-btn ${activeIdx === idx ? "is-active" : ""}`}
                  onClick={() => setActiveIdx(idx)}
                  aria-label={`View ${slide.title}`}
                >
                  <img src={slide.src} alt={slide.title} />
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
        <div className="section-head-center">
          <p className="section-eyebrow">Common Questions</p>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">Everything you need to know about our ingredients, 12-month shelf life, and safe pan-India shipping.</p>
        </div>

        <div className="faq-accordion">
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
                {isOpen ? (
                  <p className="faq-answer">{faq.a}</p>
                ) : null}
              </div>
            );
          })}
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
            <div className="fssai-pill">
              <span>✓ FSSAI Standards Compliant</span>
            </div>
          </div>

          <div className="footer-col">
            <h3>Shop</h3>
            <ul className="footer-links">
              <li><Link to="/achar">All Achars</Link></li>
              <li><Link to="/product/aam-ka-achar">Aam Ka Achar</Link></li>
              <li><Link to="/product/hing-ka-achar">Heeng Ka Achar</Link></li>
              <li><Link to="/product/mirch-ka-achar">Mirch Ka Achar</Link></li>
              <li><Link to="/product/mix-veg-achar">Mix Veg Achar</Link></li>
              <li><Link to="/product/the-ghar-ka-achar-box">The Ghar Ka Achar Box</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>Our Story</h3>
            <ul className="footer-links">
              <li><Link to="/about">About Rachna Gattani</Link></li>
              <li><Link to="/about">Our Family Kitchen</Link></li>
              <li><Link to="/how-its-made">How It's Made</Link></li>
              <li><a href={ZOMATO_URL} target="_blank" rel="noreferrer">Order on Zomato</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>Account &amp; Help</h3>
            <ul className="footer-links">
              <li><Link to="/account">My Account</Link></li>
              <li><Link to="/track-order">Track Order</Link></li>
              <li><Link to="/cart">Shopping Cart</Link></li>
              <li><Link to="/about">Contact Kitchen</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Khana Peena Ghar Se. All rights reserved.</span>
          <span>Made with love in Bahadurgarh, Haryana</span>
        </div>
      </div>
    </footer>
  );
}

function getPincodeEstimate(pin) {
  const prefix2 = pin.slice(0, 2);
  const prefix1 = pin.slice(0, 1);

  if (["11", "12", "13", "20"].includes(prefix2)) {
    return {
      valid: true,
      eta: "⚡ Estimated Delivery: 1–2 Business Days",
      zone: "Delhi NCR & Haryana Express Corridor"
    };
  }
  if (["40", "41", "56", "50", "60", "70", "30", "22", "38", "16", "14"].includes(prefix2)) {
    return {
      valid: true,
      eta: "🚚 Estimated Delivery: 2–3 Business Days",
      zone: "Major Metro Express Route"
    };
  }
  if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(prefix1)) {
    return {
      valid: true,
      eta: "📦 Estimated Delivery: 3–5 Business Days",
      zone: "Standard Pan-India Tracked Courier"
    };
  }
  return {
    valid: false,
    message: "PIN code not recognized for standard delivery routes."
  };
}

function PincodeChecker() {
  const [pincode, setPincode] = useState(() => localStorage.getItem("kp_pincode") || "");
  const [result, setResult] = useState(() => {
    const saved = localStorage.getItem("kp_pincode");
    if (saved && /^\d{6}$/.test(saved)) {
      return getPincodeEstimate(saved);
    }
    return null;
  });

  const check = (e) => {
    e?.preventDefault();
    const clean = pincode.trim();
    if (!/^\d{6}$/.test(clean)) {
      setResult({ valid: false, message: "Please enter a valid 6-digit Indian PIN code." });
      return;
    }
    localStorage.setItem("kp_pincode", clean);
    setResult(getPincodeEstimate(clean));
  };

  return (
    <div className="pincode-checker-box">
      <strong>📍 Check Delivery to your PIN Code</strong>
      <form className="pincode-form" onSubmit={check}>
        <input
          type="text"
          maxLength={6}
          placeholder="Enter 6-digit PIN"
          value={pincode}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            setPincode(val);
            if (val.length === 6) {
              localStorage.setItem("kp_pincode", val);
              setResult(getPincodeEstimate(val));
            }
          }}
        />
        <button type="submit" className="button button-cream-primary button-sm">Check</button>
      </form>
      {result && (
        <div className={`pincode-result ${result.valid ? "is-success" : "is-error"}`}>
          {result.valid ? (
            <div>
              <strong>{result.eta}</strong>
              <div style={{ fontSize: "0.8rem", marginTop: "2px" }}>{result.zone} • Free delivery on orders ₹499+</div>
            </div>
          ) : (
            <p style={{ margin: 0 }}>{result.message}</p>
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
      <HeroSection />
      <TrustStrip />
      <SignatureProductsSection
        catalog={catalog}
        wishlist={wishlist}
        toggleWishlist={toggleWishlist}
        addToCart={addToCart}
      />
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
          <p className="hero-eyebrow">Our Complete Collection</p>
          <h1 className="hero-headline" style={{ fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)" }}>The Pickle Chapter</h1>
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
              <motion.article
                key={product.slug}
                className="product-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
              >
                <div className="product-card-visual">
                  <span className="product-card-tag">{product.category}</span>
                  <button
                    type="button"
                    className={`product-wishlist-btn ${wishlist.includes(product.slug) ? "is-active" : ""}`}
                    aria-label={`Save ${product.name} to wishlist`}
                    onClick={() => toggleWishlist(product.slug)}
                  >
                    ♥
                  </button>
                  <Link to={`/product/${product.slug}`} style={{ width: "100%", height: "100%" }}>
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = "/images/logo.png"; }}
                    />
                  </Link>
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
                    className="button button-primary button-sm"
                    disabled={product.stock <= 0}
                    onClick={() => addToCart(product.slug, 1, product.stock)}
                  >
                    {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                  </button>
                  <Link to={`/product/${product.slug}`} className="button button-cream-secondary button-sm">
                    View
                  </Link>
                </div>
              </motion.article>
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
  const [selectedImage, setSelectedImage] = useState("");
  const [activeTab, setActiveTab] = useState("ingredients");
  const maxSelectableQuantity = Math.max(1, Math.min(product?.stock || 0, 4));

  useDocumentMeta({
    title: product ? `${product.name} (${product.size}) | Homemade Achar | Khana Peena Ghar Se` : "Product Details | Khana Peena Ghar Se",
    description: product?.shortDescription || product?.description || "Authentic homemade achar handcrafted in small batches."
  });

  useEffect(() => {
    setSelectedImage(product?.images?.[0] || product?.image || "");
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
                className="button button-primary"
                disabled={product.stock <= 0}
                onClick={() => {
                  addToCart(product.slug, quantity, product.stock);
                  setMessage("Added to cart!");
                }}
              >
                {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
              </button>
              <button
                type="button"
                className="button button-cream-secondary"
                onClick={() => toggleWishlist(product.slug)}
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
              {relatedProducts.map((rel) => (
                <article key={rel.slug} className="product-card">
                  <div className="product-card-visual">
                    <span className="product-card-tag">{rel.category}</span>
                    <Link to={`/product/${rel.slug}`} style={{ width: "100%", height: "100%" }}>
                      <img src={rel.image} alt={rel.name} loading="lazy" onError={(e) => { e.currentTarget.src = "/images/logo.png"; }} />
                    </Link>
                  </div>
                  <div className="product-card-info">
                    <h3>{rel.name}</h3>
                    <p className="product-card-tagline">{rel.tagline}</p>
                    <div className="product-card-price-row">
                      <span className="product-card-price">₹{rel.price}</span>
                      <span className="product-card-size">{rel.size}</span>
                    </div>
                  </div>
                  <div className="product-card-actions">
                    <button
                      type="button"
                      className="button button-primary button-sm"
                      onClick={() => addToCart(rel.slug, 1, rel.stock)}
                    >
                      Add to Cart
                    </button>
                    <Link to={`/product/${rel.slug}`} className="button button-cream-secondary button-sm">
                      View
                    </Link>
                  </div>
                </article>
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
    description: "The story of Rachna Gattani's kitchen, authentic homemade spices, and decades of traditional Indian culinary care in Bahadurgarh."
  });

  return (
    <div>
      <div className="story-page-hero">
        <div className="content-container">
          <p className="hero-eyebrow">Family Kitchen Legacy</p>
          <h1 className="hero-headline" style={{ fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)" }}>
            Some recipes are written.<br />Some are remembered.
          </h1>
          <p className="hero-subhead" style={{ color: "var(--mustard-gold-light)" }}>
            Khana Peena Ghar Se began in our family kitchen, with recipes passed down through generations.
          </p>
        </div>
      </div>

      <div className="page-shell">
        <div className="content-container">
          <div className="story-split" style={{ margin: "24px 0" }}>
            <div className="story-image-panel">
              <div className="story-portrait-frame">
                <img
                  src={ABOUT_OWNER_IMAGE}
                  alt="Rachna Gattani in her kitchen"
                  onError={(e) => { e.currentTarget.src = HOME_HERO_IMAGE; }}
                />
              </div>
              <div className="story-badge-quote">
                “Same Recipes. New Homes.”
              </div>
            </div>

            <div className="story-copy-panel">
              <p className="section-eyebrow">The Founder's Journey</p>
              <h2>From our kitchen to your family dining table.</h2>
              <p>
                Khana Peena Ghar Se began in Rachna Gattani’s kitchen in Bahadurgarh. For decades, spices were never measured by industrial standards, but by years of intuition, family care, and lived culinary wisdom.
              </p>
              <p>
                What started as a daughter's effort to preserve her mother's recipes has grown into a brand that brings authentic, homemade Indian pickles to tables across the country.
              </p>
              <p>
                We make small-batch pickles using traditional methods and honest ingredients, so that every jar carries a bit of home to your table.
              </p>
              <div className="story-signature">
                — Rachna Gattani
              </div>
            </div>
          </div>

          <div className="story-pillars-grid">
            <div className="pillar-card">
              <span className="pillar-icon">🌿</span>
              <h3>Authentic Recipes</h3>
              <p>Time-tested homestyle proportions, roasted whole masalas, and pure cold-pressed mustard oil.</p>
            </div>
            <div className="pillar-card">
              <span className="pillar-icon">🏡</span>
              <h3>Family Values</h3>
              <p>Prepared with the same care and patience we give to our own family dining table every day.</p>
            </div>
            <div className="pillar-card">
              <span className="pillar-icon">🌟</span>
              <h3>A Tastier Tomorrow</h3>
              <p>Preserving regional Indian culinary wisdom without shortcuts, artificial colours, or chemicals.</p>
            </div>
          </div>

          <TrustStrip />
        </div>
      </div>
    </div>
  );
}

function HowItsMadePage() {
  useDocumentMeta({
    title: "How It's Made | 5-Step Artisanal Process | Khana Peena Ghar Se",
    description: "Discover the 5-step traditional slow-curing process behind our small-batch homemade achars."
  });

  const steps = [
    {
      num: "1",
      title: "Select Ingredients",
      desc: "We handpick the freshest seasonal raw mangoes, chillies, and whole spices directly from trusted growers.",
      img: "/images/achars/aam-ka-achar/Aam Ka Achar.png"
    },
    {
      num: "2",
      title: "Prepare",
      desc: "Ingredients are cleaned, sun-dried, sliced, and whole spices are dry-roasted the traditional way.",
      img: "/images/achars/hing-ka-achar/Hing Aachar.png"
    },
    {
      num: "3",
      title: "Mix",
      desc: "We blend everything with pure cold-pressed kacchi ghani mustard oil and hand-ground spice blends.",
      img: "/images/achars/mirch-ka-achar/Mirch Achar.png"
    },
    {
      num: "4",
      title: "Rest",
      desc: "The pickle is left to mature slowly in traditional ceramic barnis under the natural warmth of the sun.",
      img: "/images/achars/mix-veg-achar/Mix Veg.png"
    },
    {
      num: "5",
      title: "Pack",
      desc: "Finally, it is hand-packed and sealed in clean, food-safe glass jars with love for safe delivery.",
      img: HOME_HERO_IMAGE
    }
  ];

  return (
    <div>
      <div className="how-hero">
        <div className="content-container">
          <p className="hero-eyebrow">Artisanal Craftsmanship</p>
          <h1 className="hero-headline" style={{ fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)" }}>From Our Kitchen to Your Table</h1>
          <p className="hero-subhead" style={{ color: "var(--mustard-gold-light)" }}>The same traditional process. The same care. In every jar.</p>
        </div>
      </div>

      <div className="page-shell">
        <div className="content-container">
          <div className="steps-roadmap">
            {steps.map((step, idx) => (
              <motion.div
                key={step.num}
                className="step-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
              >
                <div className="step-number">{step.num}</div>
                <h3 className="step-title">{step.title}</h3>
                <div className="step-media">
                  <img src={step.img} alt={step.title} onError={(e) => { e.currentTarget.src = "/images/logo.png"; }} />
                </div>
                <p className="step-body">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="patience-banner">
            <div>
              <h2>Patience makes better pickles.</h2>
              <p>Some good things take time. Handcrafted slow-cured achars made the way they always were.</p>
            </div>
            <Link to="/achar" className="button button-primary">
              Shop Our Achar →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartPage({ cart, updateCartQuantity }) {
  useDocumentMeta({
    title: "Shopping Cart & Checkout | Khana Peena Ghar Se",
    description: "Review your selected artisanal achar jars and proceed to secure checkout."
  });

  const navigate = useNavigate();
  const productCatalog = useCatalogProducts();
  const items = cart
    .map((entry) => ({ ...entry, product: productCatalog.find((item) => item.slug === entry.slug) }))
    .filter((entry) => entry.product)
    .map((entry) => ({
      ...entry,
      quantity: Math.min(entry.quantity, Math.max(entry.product.stock, 0)),
      unavailable: entry.product.stock <= 0
    }))
    .filter((entry) => entry.quantity > 0);

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const [status, setStatus] = useState("");

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!items.length) {
      setStatus("Add at least one achar to the cart.");
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

    setStatus("Placing order request...");
    try {
      const response = await fetch("/.netlify/functions/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: formData, items: payloadItems })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order could not be placed.");
      localStorage.removeItem("kp_cart_v3");
      setStatus(`Order placed successfully! Order ID: ${result.order.order_number}`);
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <div className="page-shell">
      <div className="content-container">
        <div className="checkout-shell">
          <div>
            <h1 className="section-title">Your Cart</h1>
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
                <p>Your cart is empty. <Link to="/achar" style={{ color: "var(--mustard-gold-dark)", fontWeight: "600" }}>Explore our achars →</Link></p>
              )}
              {items.length ? (
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "20px", fontSize: "1.2rem", fontWeight: "700" }}>
                  <span>Total</span>
                  <span style={{ color: "var(--heritage-green)" }}>₹{total}</span>
                </div>
              ) : null}
            </div>
          </div>

          <form className="checkout-form-react" onSubmit={placeOrder}>
            <h2 style={{ fontFamily: "var(--font-serif)", margin: "0 0 8px" }}>Delivery Details</h2>
            <label>Full Name<input type="text" name="customerName" required /></label>
            <label>Phone Number<input type="tel" name="phone" required /></label>
            <label>Email Address<input type="email" name="email" /></label>
            <label>Address<input type="text" name="addressLine1" placeholder="Flat / House / Street" required /></label>
            <label>City<input type="text" name="city" required /></label>
            <label>State<input type="text" name="state" required /></label>
            <label>Pincode<input type="text" name="pincode" required /></label>
            <label>Delivery Notes<textarea name="notes" rows="3" placeholder="Special instructions (optional)" /></label>
            <button className="button button-primary button-full" type="submit" disabled={!items.length}>
              Place Order Request
            </button>
            {status ? <p style={{ color: "var(--heritage-green)", fontWeight: "600", margin: 0 }}>{status}</p> : null}
          </form>
        </div>
      </div>
    </div>
  );
}

function AccountPage({ session, refreshSession }) {
  useDocumentMeta({
    title: "My Account | Khana Peena Ghar Se",
    description: "Manage your account and view order history."
  });

  const [loginState, setLoginState] = useState({ email: "", password: "" });
  const [signupState, setSignupState] = useState({ fullName: "", email: "", password: "" });
  const [status, setStatus] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!hasSupabaseClientEnv || !supabase) return setStatus("Supabase configuration missing.");
    setStatus("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({
      email: loginState.email,
      password: loginState.password
    });
    if (error) return setStatus(error.message);
    await refreshSession();
    setStatus("Signed in successfully.");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!hasSupabaseClientEnv || !supabase) return setStatus("Supabase configuration missing.");
    setStatus("Creating account...");
    const { error } = await supabase.auth.signUp({
      email: signupState.email,
      password: signupState.password,
      options: { data: { full_name: signupState.fullName } }
    });
    if (error) return setStatus(error.message);
    await refreshSession();
    setStatus("Account created.");
  };

  return (
    <div className="page-shell">
      <div className="content-container">
        <div className="auth-shell">
          <div>
            <h1 className="section-title">{session ? "Your Account" : "Sign In"}</h1>
            {session ? (
              <div>
                <p>Signed in as: <strong>{session.user.email}</strong></p>
                <Link to="/track-order" className="button button-primary">Track Orders</Link>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleLogin} style={{ marginTop: "20px" }}>
                <label>Email<input type="email" value={loginState.email} onChange={(e) => setLoginState((c) => ({ ...c, email: e.target.value }))} required /></label>
                <label>Password<input type="password" value={loginState.password} onChange={(e) => setLoginState((c) => ({ ...c, password: e.target.value }))} required /></label>
                <button type="submit" className="button button-primary">Sign In</button>
              </form>
            )}
          </div>

          {!session ? (
            <div>
              <h2 className="section-title" style={{ fontSize: "1.8rem" }}>Create Account</h2>
              <form className="auth-form" onSubmit={handleSignup} style={{ marginTop: "20px" }}>
                <label>Full Name<input type="text" value={signupState.fullName} onChange={(e) => setSignupState((c) => ({ ...c, fullName: e.target.value }))} required /></label>
                <label>Email<input type="email" value={signupState.email} onChange={(e) => setSignupState((c) => ({ ...c, email: e.target.value }))} required /></label>
                <label>Password<input type="password" value={signupState.password} onChange={(e) => setSignupState((c) => ({ ...c, password: e.target.value }))} required /></label>
                <button type="submit" className="button button-cream-secondary">Register</button>
              </form>
            </div>
          ) : null}
        </div>
        {status ? <p style={{ textAlign: "center", color: "var(--heritage-green)", fontWeight: "600", marginTop: "16px" }}>{status}</p> : null}
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

  const submit = async (e) => {
    e.preventDefault();
    const params = new URLSearchParams(new FormData(e.currentTarget));
    setStatus("Searching order...");
    try {
      const res = await fetch(`/.netlify/functions/track-order?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Order not found.");
      setResult(payload.order);
      setStatus("");
    } catch (err) {
      setResult(null);
      setStatus(err.message);
    }
  };

  return (
    <div className="page-shell">
      <div className="content-container">
        <div className="auth-shell">
          <div>
            <h1 className="section-title">Track Order</h1>
            <form className="auth-form" onSubmit={submit} style={{ marginTop: "20px" }}>
              <label>Order Number<input type="text" name="orderNumber" placeholder="e.g. KP-1001" required /></label>
              <label>Phone Number<input type="tel" name="phone" placeholder="Registered 10-digit mobile" required /></label>
              <button type="submit" className="button button-primary">Check Status</button>
            </form>
            {status ? <p style={{ color: "var(--heritage-green)", marginTop: "12px", fontWeight: "600" }}>{status}</p> : null}
          </div>

          <div>
            <h2 className="section-title" style={{ fontSize: "1.8rem" }}>Order Details</h2>
            {result ? (
              <div style={{ background: "var(--warm-cream-pure)", padding: "20px", borderRadius: "10px", border: "1px solid var(--line)" }}>
                <p><strong>Order ID:</strong> {result.order_number}</p>
                <p><strong>Status:</strong> {result.status}</p>
                <p><strong>Customer:</strong> {result.customer_name}</p>
                <p><strong>Total Amount:</strong> ₹{result.total_amount}</p>
              </div>
            ) : (
              <p style={{ color: "var(--text-soft)" }}>Enter your order ID and phone number to see live dispatch updates from our Bahadurgarh kitchen.</p>
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

  useEffect(() => setCart(cart), [cart]);
  useEffect(() => setWishlist(wishlist), [wishlist]);

  return {
    cart,
    wishlist,
    toggleWishlist(slug) {
      setWishlistState((current) =>
        current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
      );
    },
    addToCart(slug, quantity = 1, maxStock = Number.POSITIVE_INFINITY) {
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
    },
    updateCartQuantity(slug, quantity, maxStock = Number.POSITIVE_INFINITY) {
      setCartState((current) =>
        current
          .map((item) => (
            item.slug === slug
              ? { ...item, quantity: Math.min(Math.max(quantity, 0), maxStock) }
              : item
          ))
          .filter((item) => item.quantity > 0)
      );
    }
  };
}

export default function App() {
  const shop = useShopState();
  const location = useLocation();
  const [session, setSession] = useState(null);

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
      <TopAnnouncement />
      <Header
        cartCount={shop.cart.length}
        isLoggedIn={!!session}
        onSignOut={handleSignOut}
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
                path="/cart"
                element={<CartPage cart={shop.cart} updateCartQuantity={shop.updateCartQuantity} />}
              />
              <Route path="/account" element={<AccountPage session={session} refreshSession={refreshSession} />} />
              <Route path="/login" element={<AccountPage session={session} refreshSession={refreshSession} />} />
              <Route path="/track-order" element={<TrackPage session={session} />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
