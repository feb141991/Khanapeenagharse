import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform
} from "motion/react";
import { faqs, products, testimonials } from "./data";
import { hasSupabaseClientEnv, supabase } from "./supabaseClient";
import { getCart, getWishlist, setCart, setWishlist } from "./store";

const ZOMATO_URL =
  "https://www.zomato.com/bahadurgarh/khana-peena-ghar-se-bahadurgarh-locality/order";
const HOME_HERO_IMAGE = "/images/brand/home-hero.jpg";
const ABOUT_OWNER_IMAGE = "/images/brand/about-owner.jpg";

const PRODUCT_CHAPTERS = [
  {
    id: "signature",
    index: "01",
    label: "Signature Range",
    title: "Homemade achars with a premium table presence.",
    copy:
      "This range carries the heart of the brand: homemade achar prepared in batches with curated masalas and presented with a more premium, luxury feel.",
    accent: "blue"
  },
  {
    id: "daily",
    index: "02",
    label: "Everyday Table",
    title: "Made for the meals people actually eat every day.",
    copy:
      "These are flavours designed to sit naturally beside paratha and everyday Indian food, with the comfort and familiarity of food made at home.",
    accent: "violet"
  },
  {
    id: "bold",
    index: "03",
    label: "Heat Forward",
    title: "For the plate that wants more spice and more presence.",
    copy:
      "Stronger profiles, fuller spice, and the same batch-made, homemade character for people who like their achar to show up properly on the table.",
    accent: "amber"
  },
  {
    id: "family",
    index: "04",
    label: "Shared Table",
    title: "Built for the shared table and family-style serving.",
    copy:
      "These jars are made to complement Indian meals served together, where one achar should feel familiar, generous, and easy to return to.",
    accent: "teal"
  }
];

const FEATURE_METRICS = [
  { value: "Bahadurgarh", label: "Homemade food with local roots" },
  { value: "Woman-led", label: "Run with care by your mother-in-law" },
  { value: "Batch-made", label: "Homemade food with curated masalas" }
];

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

function Header({ cartCount, isLoggedIn, onSignOut }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = () => setMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [menuOpen]);

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/achar", label: "Achar" },
    ...(isLoggedIn ? [{ to: "/orders", label: "Orders" }] : []),
    ...(isLoggedIn ? [{ to: "/account", label: "My account" }] : []),
    { to: "/cart", label: `Cart${cartCount ? ` (${cartCount})` : ""}` }
  ];

  const showTrack = isLoggedIn;

  return (
    <motion.header
      className={`app-header ${menuOpen ? "menu-open" : ""}`}
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link className="brand" to="/" aria-label="Khana Peena Ghar Se home">
        <img src="/images/logo.png" alt="" />
        <span className="brand-copy">
          <strong>Khana Peena Ghar Se</strong>
          <span>Homemade achar and Indian food</span>
        </span>
      </Link>

      <button
        type="button"
        className={`menu-toggle ${menuOpen ? "active" : ""}`}
        aria-expanded={menuOpen}
        aria-label="Toggle menu"
        onClick={() => setMenuOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      <AnimatePresence initial={false}>
        <motion.nav
          className={`app-nav ${menuOpen ? "open" : ""}`}
          aria-label="Primary"
          initial={false}
          animate={
            menuOpen
              ? { height: "auto", opacity: 1 }
              : { height: "auto", opacity: 1 }
          }
        >
          <div className="nav-links">
            {navItems.map((item) => (
              <MotionNavLink key={item.to} to={item.to} currentPath={location.pathname}>
                {item.label}
              </MotionNavLink>
            ))}
            {showTrack ? (
              <MotionNavLink to="/track-order" currentPath={location.pathname}>
                Track order
              </MotionNavLink>
            ) : null}
          </div>
          <div className="nav-actions">
            <a className="nav-ext" href={ZOMATO_URL} target="_blank" rel="noreferrer">
              Order on Zomato
            </a>
            {isLoggedIn ? (
              <button className="nav-admin nav-admin-button" type="button" onClick={onSignOut}>
                Sign out
              </button>
            ) : (
              <Link className="nav-admin" to="/account">
                Login
              </Link>
            )}
          </div>
        </motion.nav>
      </AnimatePresence>
    </motion.header>
  );
}

function MotionNavLink({ to, currentPath, children }) {
  const active = currentPath === to;
  return (
    <Link to={to} className={`nav-pill ${active ? "active" : ""}`}>
      <motion.span whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="nav-pill-label">
        {children}
      </motion.span>
      {active ? (
        <motion.span
          layoutId="active-nav-pill"
          className="nav-pill-glow"
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
        />
      ) : null}
    </Link>
  );
}

function HeroCanvas() {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return undefined;

    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const particles = Array.from({ length: 72 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 2 + 0.8,
      dx: (Math.random() - 0.5) * 0.0012,
      dy: (Math.random() - 0.5) * 0.0012,
      alpha: Math.random() * 0.35 + 0.08
    }));

    let pointer = { x: 0.65, y: 0.28 };
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        particle.x += particle.dx + (pointer.x - 0.5) * 0.0001;
        particle.y += particle.dy + (pointer.y - 0.5) * 0.0001;

        if (particle.x < 0 || particle.x > 1) particle.dx *= -1;
        if (particle.y < 0 || particle.y > 1) particle.dy *= -1;

        const px = particle.x * width;
        const py = particle.y * height;

        ctx.beginPath();
        ctx.fillStyle = `rgba(60, 88, 255, ${particle.alpha})`;
        ctx.arc(px, py, particle.r, 0, Math.PI * 2);
        ctx.fill();

        for (let offset = index + 1; offset < particles.length; offset += 1) {
          const neighbour = particles[offset];
          const nx = neighbour.x * width;
          const ny = neighbour.y * height;
          const distance = Math.hypot(px - nx, py - ny);

          if (distance < 160) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(60, 88, 255, ${0.12 * (1 - distance / 160)})`;
            ctx.lineWidth = 1;
            ctx.moveTo(px, py);
            ctx.lineTo(nx, ny);
            ctx.stroke();
          }
        }
      });

      const glow = ctx.createRadialGradient(
        pointer.x * width,
        pointer.y * height,
        0,
        pointer.x * width,
        pointer.y * height,
        220
      );
      glow.addColorStop(0, "rgba(111, 154, 255, 0.24)");
      glow.addColorStop(1, "rgba(111, 154, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pointer.x * width, pointer.y * height, 220, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    const onMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height
      };
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, [reduceMotion]);

  return <canvas ref={ref} className="hero-canvas-react" aria-hidden="true" />;
}

function HomePage() {
  const productCatalog = useCatalogProducts();
  const heroProduct = productCatalog.find((product) => product.slug === "aam-ka-achar") || productCatalog[0];
  const heroImage = heroProduct?.images?.[0] || heroProduct?.image || "/images/logo.png";

  return (
    <div className="landing-page-cld">
      <section className="cld-hero">
        <div className="cld-hero-grid" />
        <div className="cld-hero-radial cld-hero-radial-a" />
        <div className="cld-hero-radial cld-hero-radial-b" />
        <div className="cld-hero-copy">
          <div className="cld-eyebrow"><span className="cld-dot" />Live now · Shipping pan-India</div>
          <h1>Homemade achar, <em>shaped by a woman</em> who has been serving with passion for years.</h1>
          <p>
            Khana Peena Ghar Se began in a kitchen where spices were measured by instinct and every jar was filled by hand. Small batches. Curated masalas. The kind of achar that belongs beside paratha, dal-chawal, and the meals people actually eat every day.
          </p>
          <div className="cld-hero-actions">
            <Link className="button button-primary" to="/achar">Explore the achar menu</Link>
            <Link className="button button-secondary" to="/about">Read the story</Link>
          </div>
          <div className="cld-hero-metrics">
            {FEATURE_METRICS.map((metric) => (
              <article key={metric.label} className="cld-metric-card">
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>
        </div>
        <div className="cld-hero-visual">
          <div className="cld-jar-stage">
            <div className="cld-jar-ticket">
              <div className="tiny">01 · Signature</div>
              <strong>{heroProduct?.name || "Aam Ka Achar"}</strong>
              <span>{heroProduct?.ingredients?.[0] || "Raw mango"} · {heroProduct?.spice || "Medium"} heat · {heroProduct?.size || "500 g"}</span>
            </div>
            <Link className="cld-hero-product-frame" to={heroProduct ? `/product/${heroProduct.slug}` : "/achar"}>
              <img
                src={heroImage}
                alt={heroProduct?.name || "Aam Ka Achar"}
                onError={(event) => {
                  event.currentTarget.src = "/images/logo.png";
                }}
              />
            </Link>
            <div className="cld-jar-batch"><span className="b-dot" />Live now</div>
          </div>
        </div>
      </section>

      <div className="cld-marquee" aria-hidden="true">
        <div className="cld-marquee-track">
          {[0, 1].map((group) => (
            <div key={group} className="cld-marquee-group">
              {["Small batch", "Curated masalas", "Women-led kitchen", "Sealed hot", "Pan-India shipping", "Zomato listed"].map((label, index) => (
                <span key={`${group}-${label}-${index}`}>{label}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section id="ranges" className="cld-section"> 
        <div className="cld-section-head">
          <div>
            <div className="cld-eyebrow"><span className="cld-dot" />The menu</div>
            <h2>Four ranges, one <em>table</em>.</h2>
          </div>
          <p>Each jar is built for a specific kind of meal — the premium table, the everyday plate, the spicier bite, the shared thali. Pick the one that fits how you actually eat.</p>
        </div>
        <div className="cld-atlas">
          {PRODUCT_CHAPTERS.map((chapter) => {
            const product = productCatalog.find((item) => item.categoryKey === chapter.id);
            const productImage = product?.images?.[0] || product?.image || "/images/logo.png";
            return (
              <Link key={chapter.id} to={product ? `/product/${product.slug}` : "/achar"} className={`cld-atlas-card ${chapter.id}`}>
                <div className="glow" />
                <div className="cld-atlas-media">
                  <img
                    src={productImage}
                    alt={product?.name || chapter.label}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = "/images/logo.png";
                    }}
                  />
                </div>
                <div className="idx">{chapter.index} · {chapter.label}</div>
                <h3>{product?.name || chapter.label}</h3>
                <p>{product?.tagline || chapter.copy}</p>
                <div className="meta"><span>{product?.size || "Jar"} · {product?.spice || "Classic"}</span><strong>INR {product?.price || 0}</strong></div>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="story" className="cld-story">
        <article className="cld-story-copy">
          <div className="cld-eyebrow"><span className="cld-dot" />About</div>
          <h2>A story of food, care, and the strength of a woman who built a <em>legacy</em> through her kitchen.</h2>
          <p>I've spent my life in the kitchen, not because I had to, but because it's where I learned to care. Where I fed my family. Where I turned everyday meals into moments that mattered.</p>
          <div className="cld-pull">Khana Peena Ghar Se is my kitchen, now in yours.</div>
          <p>Small batches. Real ingredients. The same instinct and patience I've always believed in.</p>
          <div className="cld-story-actions">
            <Link className="button button-secondary" to="/about">Read more</Link>
          </div>
        </article>
        <aside className="cld-story-aside">
          <div className="cld-portrait">
            <img
              src={ABOUT_OWNER_IMAGE}
              alt="Founder portrait"
              onError={(event) => {
                event.currentTarget.closest(".cld-portrait")?.classList.add("is-empty");
                event.currentTarget.remove();
              }}
            />
          </div>
          <div className="cld-values">
            <div className="v-card"><strong>Women-led</strong><span>Built on resilience, instinct, and years of lived experience in the kitchen.</span></div>
            <div className="v-card"><strong>Batch-made</strong><span>Small batches so every jar keeps its personal, homemade character.</span></div>
            <div className="v-card"><strong>Curated masalas</strong><span>Time-honoured flavour built around carefully selected ingredients.</span></div>
          </div>
        </aside>
      </section>

      <section className="cld-section">
        <div className="cld-section-head">
          <div>
            <div className="cld-eyebrow"><span className="cld-dot" />From the table</div>
            <h2>What <em>customers</em> say.</h2>
          </div>
          <p>Small kitchen, honest jars. Here is what the people who keep coming back have said, in their own words.</p>
        </div>
        <div className="cld-quotes">
          {testimonials.map((item) => (
            <article key={item.name} className="cld-quote">
              <div className="mark">"</div>
              <p>{item.quote}</p>
              <div className="who"><strong>{item.name}</strong><span>{item.meta}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="cld-faq">
        <div className="head">
          <div className="cld-eyebrow"><span className="cld-dot" />Answered</div>
          <h2>Things people <em>ask</em>.</h2>
          <p>Shipping, shelf life, returns. If something else is unclear, the contact section is the fastest way to reach the kitchen.</p>
        </div>
        <div className="list">
          {faqs.map((item, index) => (
            <details key={item.q} open={index === 0}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="cld-cta-banner">
        <div>
          <div className="cld-eyebrow"><span className="cld-dot" />Live now</div>
          <h2>Four jars. One <em>shared table</em>.</h2>
          <p>Pick a range, or take the full set. The live menu is ready to order from the Bahadurgarh kitchen and shipping this week.</p>
          <div className="cld-hero-actions">
            <Link className="button button-primary" to="/achar">Shop the achar menu</Link>
            <a className="button button-secondary" href={ZOMATO_URL} target="_blank" rel="noreferrer">Order on Zomato</a>
          </div>
        </div>
      </section>

      <footer className="cld-footer">
        <div className="cld-footer-brand">
          <Link className="brand" to="/">
            <img src="/images/logo.png" alt="" />
            <span className="brand-copy">
              <strong>Khana Peena Ghar Se</strong>
              <span>Homemade achar  </span>
            </span>
          </Link>
          <p>Homemade food prepared with care, curated masalas, and the warmth of a kitchen that still believes food should feel personal.</p>
        </div>
        <div className="cld-footer-links">
          <div>
            <h4>Shop</h4>
            <Link to="/achar">Achar menu</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/account">Account</Link>
          </div>
          <div>
            <h4>About</h4>
            <Link to="/about">Our story</Link>
            <a href="#faq">FAQ</a>
            <Link to="/about">Read more</Link>
          </div>
          <div>
            <h4>Order</h4>
            <a href={ZOMATO_URL} target="_blank" rel="noreferrer">Zomato</a>
            <Link to="/track-order">Track order</Link>
            <Link to="/orders">My orders</Link>
          </div>
          <div>
            <h4>Care</h4>
            <span>Shipping</span>
            <span>Returns</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AboutPage() {
  return (
    <section className="page-shell about-page-shell">
      <div className="product-system-head">
        <div>
          <p className="eyebrow">About</p>
          <h1>A story of food, care, and the strength of a woman who built a legacy through her kitchen.</h1>
        </div>
      </div>

      <div className="about-story-grid">
        <article className="about-story-panel">
          <p>
            I've spent my life in the kitchen, not because I had to, but because it's where I learned
            to care. Where I fed my family. Where I turned everyday meals into moments that mattered.
          </p>
          <p>
            For decades, I've made achar the only way I know how: by hand, with spices I trust, taking
            the time it deserves. My family always said, "You should share this." So I am.
          </p>
          <p>
            Khana Peena Ghar Se is my kitchen, now in yours. Small batches. Real ingredients. The same
            instinct and patience I've always believed in.
          </p>
          <p>
            Because good food isn't complicated. It's just made with intention. And that's all I've ever done.
          </p>
        </article>

        <aside className="about-values-panel">
          <div className="about-owner-card">
            <img
              src={ABOUT_OWNER_IMAGE}
              alt="Founder portrait"
              onError={(event) => {
                event.currentTarget.closest(".about-owner-card")?.classList.add("is-empty");
                event.currentTarget.remove();
              }}
            />
          </div>
          <div className="about-value-card">
            <strong>Women-led</strong>
            <span>Built on resilience, instinct, and years of lived experience in the kitchen.</span>
          </div>
          <div className="about-value-card">
            <strong>Batch-made</strong>
            <span>Prepared in small batches so every jar keeps its personal, homemade character.</span>
          </div>
          <div className="about-value-card">
            <strong>Curated masalas</strong>
            <span>Time-honoured flavour built around carefully selected ingredients and trusted methods.</span>
          </div>
        </aside>
      </div>
    </section>
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

        if (nextQuantity <= 0) {
          return current.filter((item) => item.slug !== slug);
        }

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

function ProductSystemSection({ wishlist, toggleWishlist, addToCart }) {
  const productCatalog = useCatalogProducts();
  const [activeChapter, setActiveChapter] = useState(PRODUCT_CHAPTERS[0].id);
  const chapterRefs = useRef({});

  useEffect(() => {
    const elements = Object.values(chapterRefs.current).filter(Boolean);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target?.id) setActiveChapter(visible.target.id);
      },
      { threshold: [0.35, 0.55, 0.7] }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="product-system">
      <div className="product-system-head">
        <div>
          <p className="eyebrow">Products menu</p>
          <h1>Homemade achars, presented with the polish they deserve.</h1>
        </div>
        <p>
          The menu is designed to keep the focus on the product itself: batch-made achar, curated masalas, home-style taste, and a premium buying experience built around real food.
        </p>
      </div>

      <div className="product-system-layout">
        <aside className="chapter-rail" aria-label="Category progress">
          {PRODUCT_CHAPTERS.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              className={`chapter-dot ${activeChapter === chapter.id ? "active" : ""}`}
              onClick={() =>
                chapterRefs.current[chapter.id]?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              <span>{chapter.index}</span>
              <strong>{chapter.label}</strong>
            </button>
          ))}
        </aside>

        <div className="chapter-stack">
          {PRODUCT_CHAPTERS.map((chapter, index) => {
            const chapterProducts = productCatalog.filter((product) => product.categoryKey === chapter.id);
            return (
              <motion.section
                key={chapter.id}
                id={chapter.id}
                ref={(element) => {
                  chapterRefs.current[chapter.id] = element;
                }}
                className={`chapter-band accent-${chapter.accent}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.18 }}
                transition={{ duration: 0.6, delay: index * 0.03 }}
              >
                <div className="chapter-intro">
                  <span className="chapter-index">{chapter.index}</span>
                  <div>
                    <p className="eyebrow">{chapter.label}</p>
                    <h2>{chapter.title}</h2>
                    <p>{chapter.copy}</p>
                  </div>
                </div>

                <div className="chapter-products">
                  {chapterProducts.map((product, productIndex) => (
                    <motion.article
                      key={product.slug}
                      className="product-tile"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ duration: 0.45, delay: productIndex * 0.05 }}
                      whileHover={{ y: -10 }}
                    >
                      {product.stock <= 0 ? <span className="product-stock-flag">Out of stock</span> : null}
                      <div className="product-tile-top">
                        <span className="product-chip">{product.spice}</span>
                        <span className="product-chip alt">{product.size}</span>
                      </div>
                      <div className="product-tile-visual">
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = "/images/logo.png";
                          }}
                        />
                        <div className="product-tile-grid" aria-hidden="true" />
                      </div>
                      <div className="product-tile-copy">
                        <h3>{product.name}</h3>
                        <p className="product-tagline">{product.tagline}</p>
                        <p>{product.shortDescription}</p>
                      </div>
                      <div className="product-meta-row">
                        <strong>INR {product.price}</strong>
                        <span>{product.stock > 0 ? `${product.stock} in stock` : "Currently unavailable"}</span>
                      </div>
                      <div className="product-tile-actions">
                        <Link className="button button-primary" to={`/product/${product.slug}`}>
                          View product
                        </Link>
                        <button
                          className="button button-ghost"
                          disabled={product.stock <= 0}
                          onClick={() => addToCart(product.slug, 1, product.stock)}
                        >
                          {product.stock > 0 ? "Add cart" : "Out of stock"}
                        </button>
                      </div>
                      <button className="wishlist-link" onClick={() => toggleWishlist(product.slug)}>
                        {wishlist.includes(product.slug) ? "Saved in wishlist" : "Save to wishlist"}
                      </button>
                    </motion.article>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CatalogPage({ wishlist, toggleWishlist, addToCart }) {
  return <ProductSystemSection wishlist={wishlist} toggleWishlist={toggleWishlist} addToCart={addToCart} />;
}

function ProductPage({ addToCart, wishlist, toggleWishlist }) {
  const { slug } = useParams();
  const productCatalog = useCatalogProducts();
  const product = useMemo(() => productCatalog.find((item) => item.slug === slug), [productCatalog, slug]);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const maxSelectableQuantity = Math.max(1, Math.min(product?.stock || 0, 4));

  useEffect(() => {
    setSelectedImage(product?.images?.[0] || product?.image || "");
  }, [product]);

  useEffect(() => {
    if (!product) return;
    setQuantity((current) => Math.min(current, Math.max(1, Math.min(product.stock, 4))));
  }, [product]);

  if (!product) {
    return (
      <section className="page-shell">
        <div className="page-header">
          <h1>Product not found.</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="product-page-shell">
      <div className="product-page-media">
        <img
          src={selectedImage || product.image}
          alt={product.name}
          onError={(event) => {
            event.currentTarget.src = "/images/logo.png";
          }}
        />
        {product.images?.length > 1 ? (
          <div className="product-gallery-strip">
            {product.images.map((imagePath) => (
              <button
                key={imagePath}
                type="button"
                className={`gallery-thumb ${selectedImage === imagePath ? "active" : ""}`}
                onClick={() => setSelectedImage(imagePath)}
              >
                <img
                  src={imagePath}
                  alt={`${product.name} view`}
                  onError={(event) => {
                    event.currentTarget.src = "/images/logo.png";
                  }}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="product-page-copy">
        <p className="eyebrow">{product.category}</p>
        <h1>{product.name}</h1>
        <p className="product-page-tagline">{product.tagline}</p>
        <p>{product.description}</p>

        <div className="product-page-specs">
          <span>{product.size}</span>
          <span>{product.spice}</span>
          <span>INR {product.price}</span>
          <span>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</span>
        </div>

        <div className="product-page-list">
          <strong>Ingredients</strong>
          <div className="product-badges">
            {product.ingredients.map((ingredient) => (
              <span key={ingredient}>{ingredient}</span>
            ))}
          </div>
        </div>

        <div className="product-page-list">
          <strong>Best with</strong>
          <div className="product-badges">
            {product.pairings.map((pairing) => (
              <span key={pairing}>{pairing}</span>
            ))}
          </div>
        </div>

        <p className="product-note">{product.note}</p>
        <p className="product-note">{product.shelfLife}</p>

        <div className="qty-row">
          <label>
            Quantity
            <select
              value={quantity}
              disabled={product.stock <= 0}
              onChange={(event) => setQuantity(Number(event.target.value))}
            >
              {Array.from({ length: maxSelectableQuantity }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value} jar{value > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="product-page-actions">
          <button
            className="button button-primary"
            disabled={product.stock <= 0}
            onClick={() => {
              if (product.stock <= 0) {
                setMessage("This product is currently out of stock.");
                return;
              }
              addToCart(product.slug, quantity, product.stock);
              setMessage("Added to cart.");
            }}
          >
            {product.stock > 0 ? "Add to cart" : "Out of stock"}
          </button>
          <button className="button button-secondary" onClick={() => toggleWishlist(product.slug)}>
            {wishlist.includes(product.slug) ? "Remove wishlist" : "Save wishlist"}
          </button>
        </div>
        <p className="inline-status">{message}</p>
      </div>
    </section>
  );
}

function WishlistPage({ wishlist, addToCart }) {
  const productCatalog = useCatalogProducts();
  const items = productCatalog.filter((product) => wishlist.includes(product.slug));

  return (
    <section className="page-shell">
      <div className="product-system-head">
        <div>
          <p className="eyebrow">Wishlist</p>
          <h1>Saved jars, kept ready for the next order.</h1>
        </div>
      </div>
      <div className="chapter-products compact-grid">
        {items.length ? (
          items.map((product) => (
            <article key={product.slug} className="product-tile">
              <div className="product-tile-visual">
                <img
                  src={product.image}
                  alt={product.name}
                  onError={(event) => {
                    event.currentTarget.src = "/images/logo.png";
                  }}
                />
              </div>
              <div className="product-tile-copy">
                <h3>{product.name}</h3>
                <p>{product.shortDescription}</p>
              </div>
              <div className="account-card-actions">
                <Link className="button button-primary" to={`/product/${product.slug}`}>
                  Open product
                </Link>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={() => addToCart(product.slug, 1, product.stock)}
                >
                  {product.stock > 0 ? "Add to cart" : "Out of stock"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-panel">
            <h2>No saved flavours yet.</h2>
            <p>Save products from the achar chapters or any product page.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CartPage({ cart, updateCartQuantity }) {
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
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = items.length ? (subtotal >= 799 ? 0 : 79) : 0;
  const total = subtotal + shipping;
  const [status, setStatus] = useState("");

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!items.length) {
      setStatus("Add at least one achar to the cart.");
      return;
    }
    if (items.some((item) => item.unavailable || item.quantity > item.product.stock)) {
      setStatus("One or more items in your cart are no longer available in the selected quantity.");
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

    setStatus("Placing order...");
    try {
      const response = await fetch("/.netlify/functions/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: formData, items: payloadItems })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order could not be placed.");
      localStorage.removeItem("kp_cart_v3");
      setStatus(`Order placed. Order number: ${result.order.order_number}`);
      setTimeout(() => navigate("/"), 1200);
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <section className="checkout-shell">
      <div className="checkout-main">
        <div className="product-system-head">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Review your jars and delivery details.</h1>
          </div>
        </div>
        <div className="checkout-summary checkout-list-card">
          <div className="checkout-section-title">
            <strong>Shopping cart</strong>
            <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
          </div>
          {items.length ? (
            items.map((item) => (
              <article key={item.product.slug} className="cart-line-react cart-product-card">
                <img
                  className="cart-product-image"
                  src={item.product.image}
                  alt={item.product.name}
                  onError={(event) => {
                    event.currentTarget.src = "/images/logo.png";
                  }}
                />
                <div className="cart-product-copy">
                  <strong>{item.product.name}</strong>
                  <span>{item.product.size}</span>
                  <span>{item.product.stock > 0 ? `${item.product.stock} available now` : "Out of stock"}</span>
                  <span>{item.product.note}</span>
                </div>
                <div className="cart-product-actions">
                  <div className="qty-buttons">
                  <button type="button" onClick={() => updateCartQuantity(item.product.slug, item.quantity - 1, item.product.stock)}>-</button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    disabled={item.quantity >= item.product.stock}
                    onClick={() => updateCartQuantity(item.product.slug, item.quantity + 1, item.product.stock)}
                  >
                    +
                  </button>
                </div>
                  <strong className="cart-line-price">INR {item.product.price * item.quantity}</strong>
                </div>
              </article>
            ))
          ) : (
            <p>Your cart is empty.</p>
          )}
        </div>

        <form id="checkout-form" className="checkout-form-react checkout-address-card" onSubmit={placeOrder}>
          <div className="checkout-section-title">
            <strong>Delivery address</strong>
            <span>Use a complete address for faster confirmation</span>
          </div>
          <div className="checkout-form-grid">
            <label>Full name<input type="text" name="customerName" required /></label>
            <label>Phone<input type="tel" name="phone" required /></label>
            <label>Email<input type="email" name="email" /></label>
            <label>Pincode<input type="text" name="pincode" required /></label>
            <label className="checkout-span-2">Address line 1<input type="text" name="addressLine1" required /></label>
            <label className="checkout-span-2">Address line 2<input type="text" name="addressLine2" /></label>
            <label>City<input type="text" name="city" required /></label>
            <label>State<input type="text" name="state" required /></label>
            <label className="checkout-span-2">Delivery notes<textarea name="notes" rows="4" /></label>
          </div>
          <div className="payment-placeholder-react">
            <strong>Online payment coming soon</strong>
            <p>Razorpay will be connected here for secure online payments. For now, this checkout records the order request and delivery details so the team can confirm the order directly.</p>
          </div>
          <p className="inline-status">{status}</p>
        </form>
      </div>

      <aside className="checkout-sidebar">
        <div className="checkout-summary checkout-sticky-summary">
          <div className="checkout-section-title">
            <strong>Order summary</strong>
            <span>{items.length ? "Ready to place order" : "Cart is empty"}</span>
          </div>
          <div className="checkout-summary-lines">
            <div><span>Subtotal</span><strong>INR {subtotal}</strong></div>
            <div><span>Shipping</span><strong>{shipping ? `INR ${shipping}` : "Free"}</strong></div>
            <div><span>Payment</span><strong>Pay on confirmation</strong></div>
          </div>
          <div className="summary-total">
            <strong>Order total</strong>
            <strong>INR {total}</strong>
          </div>
          <button className="button button-primary button-full" type="submit" form="checkout-form">
            Place order request
          </button>
          <div className="checkout-trust-notes">
            <span>Small-batch dispatch</span>
            <span>Sealed jars</span>
            <span>Manual tracking updates for now</span>
          </div>
        </div>
      </aside>
    </section>
  );
}

function useAuthorizedJson(session, path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`
    }
  }).then(async (response) => {
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Request failed.");
    return payload;
  });
}

const MEMBER_TIERS = [
  { id: "seed", label: "Seed", minOrders: 0, accent: "seed", rewards: ["Member pricing previews", "Order history access"] },
  { id: "spice", label: "Spice", minOrders: 3, accent: "spice", rewards: ["Free sample jar", "Priority support"] },
  { id: "flame", label: "Flame", minOrders: 6, accent: "flame", rewards: ["Priority shipping", "Early access flavours"] },
  { id: "legend", label: "Legend", minOrders: 10, accent: "legend", rewards: ["VIP-only bundles", "Founders club offers"] }
];

const ACCOUNT_SECTIONS = [
  ["dashboard", "Dashboard"],
  ["orders", "Orders"],
  ["tracking", "Track Order"],
  ["addresses", "Addresses"],
  ["profile", "Profile"],
  ["rewards", "Rewards Club"],
  ["referrals", "Referrals"],
  ["support", "Support"],
  ["security", "Security"]
];

function getTier(totalOrders = 0) {
  return MEMBER_TIERS.reduce((current, tier) => (totalOrders >= tier.minOrders ? tier : current), MEMBER_TIERS[0]);
}

function getNextTier(totalOrders = 0) {
  return MEMBER_TIERS.find((tier) => tier.minOrders > totalOrders) || null;
}

function formatDate(value) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getOrderTimelineIndex(status) {
  return ["placed", "packed", "shipped", "out_for_delivery", "delivered"].indexOf(status);
}

function AccountPage({ session, refreshSession, wishlist, addToCart }) {
  const location = useLocation();
  const [loginState, setLoginState] = useState({ email: "", password: "" });
  const [signupState, setSignupState] = useState({ fullName: "", email: "", password: "", referralCode: "", website: "" });
  const [resetRequestEmail, setResetRequestEmail] = useState("");
  const [resetState, setResetState] = useState({ password: "", confirmPassword: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [authMode, setAuthMode] = useState(() => (location.search.includes("recovery") ? "reset" : "login"));
  const [activeSection, setActiveSection] = useState("dashboard");
  const [status, setStatus] = useState("");
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState({ addresses: [], orders: [], rewards: [], referrals: [], notifications: [], insights: null });
  const [addressForm, setAddressForm] = useState({
    id: null,
    label: "Home",
    recipientName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: true
  });
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    avatarUrl: "",
    marketingOptIn: true,
    orderUpdatesOptIn: true,
    supportOptIn: true
  });
  const productCatalog = useCatalogProducts();
  const fullName = profile?.full_name || session?.user?.user_metadata?.full_name || "Customer";
  const firstName = fullName.split(" ")[0] || "Customer";
  const totalOrders = dashboard.orders.length || Number(profile?.total_orders || 0);
  const currentTier = getTier(totalOrders);
  const nextTier = getNextTier(totalOrders);
  const ordersUntilNextTier = nextTier ? Math.max(0, nextTier.minOrders - totalOrders) : 0;
  const lastOrder = dashboard.orders[0] || null;
  const recentItems = (lastOrder?.items || []).slice(0, 3);
  const flavorsTried = new Set(dashboard.orders.flatMap((order) => (order.items || []).map((item) => item.product_slug))).size;
  const lifetimeJars = dashboard.orders.reduce((sum, order) => sum + (order.items || []).reduce((inner, item) => inner + Number(item.quantity || 0), 0), 0);
  const rotatingMessages = [
    "Your usual jar is ready for a quick reorder.",
    nextTier ? `${ordersUntilNextTier} order${ordersUntilNextTier === 1 ? "" : "s"} until ${nextTier.label} tier.` : "You have unlocked our highest member tier.",
    "Members get early access to weekly flavour drops.",
    "Claim your next reward from the Rewards Club section.",
    "New flavour stories and limited batches land here first."
  ];
  const rotatingMessage = rotatingMessages[totalOrders % rotatingMessages.length];
  const recommendedProducts = productCatalog
    .filter((product) => !dashboard.orders.some((order) => (order.items || []).some((item) => item.product_slug === product.slug)))
    .slice(0, 3);
  const referralCode = profile?.referral_code || dashboard.referrals[0]?.referral_code || "";
  const showSection = (...keys) => keys.includes(activeSection);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!session?.access_token) {
        setProfile(null);
        setDashboard({ addresses: [], orders: [], rewards: [], referrals: [], notifications: [], insights: null });
        return;
      }

      try {
        const [result, dashboardData] = await Promise.all([
          useAuthorizedJson(session, "/.netlify/functions/customer-profile"),
          useAuthorizedJson(session, "/.netlify/functions/customer-dashboard")
        ]);
        if (!cancelled) {
          const nextProfile = {
            ...(result.customer || { email: result.user?.email || session.user.email || "" }),
            ...(dashboardData.customer || {})
          };
          setProfile(nextProfile);
          setProfileForm({
            fullName: nextProfile.full_name || session.user.user_metadata?.full_name || "",
            phone: nextProfile.phone || "",
            addressLine1: nextProfile.address_line_1 || "",
            addressLine2: nextProfile.address_line_2 || "",
            city: nextProfile.city || "",
            state: nextProfile.state || "",
            pincode: nextProfile.pincode || "",
            avatarUrl: dashboardData.customer?.avatar_url || "",
            marketingOptIn: dashboardData.customer?.marketing_opt_in ?? true,
            orderUpdatesOptIn: dashboardData.customer?.order_updates_opt_in ?? true,
            supportOptIn: dashboardData.customer?.support_opt_in ?? true
          });
          setDashboard({
            addresses: dashboardData.addresses || [],
            orders: dashboardData.orders || [],
            rewards: dashboardData.rewards || [],
            referrals: dashboardData.referrals || [],
            notifications: dashboardData.notifications || [],
            insights: dashboardData.insights || null
          });
          const defaultAddress = (dashboardData.addresses || []).find((item) => item.is_default) || dashboardData.addresses?.[0];
          if (defaultAddress) {
            setAddressForm({
              id: defaultAddress.id,
              label: defaultAddress.label || "Home",
              recipientName: defaultAddress.recipient_name || "",
              phone: defaultAddress.phone || "",
              addressLine1: defaultAddress.address_line_1 || "",
              addressLine2: defaultAddress.address_line_2 || "",
              city: defaultAddress.city || "",
              state: defaultAddress.state || "",
              pincode: defaultAddress.pincode || "",
              isDefault: Boolean(defaultAddress.is_default)
            });
          }
        }
      } catch {
        if (!cancelled) {
          setProfile({ email: session.user?.email || "" });
          setProfileForm({
            fullName: session.user?.user_metadata?.full_name || "",
            phone: "",
            addressLine1: "",
            addressLine2: "",
            city: "",
            state: "",
            pincode: "",
            avatarUrl: "",
            marketingOptIn: true,
            orderUpdatesOptIn: true,
            supportOptIn: true
          });
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!hasSupabaseClientEnv || !supabase) {
      setStatus("Missing Supabase client configuration.");
      return;
    }
    setStatus("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({
      email: loginState.email,
      password: loginState.password
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    if (!rememberMe) {
      window.sessionStorage.setItem("kp_session_mode", "session-only");
    } else {
      window.sessionStorage.removeItem("kp_session_mode");
    }
    await refreshSession();
    setStatus("Signed in.");
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    if (!hasSupabaseClientEnv || !supabase) {
      setStatus("Missing Supabase client configuration.");
      return;
    }
    if (signupState.website) {
      setStatus("Unable to create account.");
      return;
    }
    setStatus("Creating account...");
    const { data, error } = await supabase.auth.signUp({
      email: signupState.email,
      password: signupState.password,
      options: {
        data: {
          full_name: signupState.fullName,
          referral_code: signupState.referralCode || null
        }
      }
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    const accessToken = data.session?.access_token;
    if (accessToken) {
      await fetch("/.netlify/functions/customer-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ fullName: signupState.fullName, email: signupState.email })
      });
    }
    await refreshSession();
    setStatus(data.session ? "Account created." : "Account created. Check your email to confirm sign in.");
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    if (!supabase || !resetRequestEmail) {
      setStatus("Enter your email to reset the password.");
      return;
    }
    setStatus("Sending reset link...");
    const { error } = await supabase.auth.resetPasswordForEmail(resetRequestEmail, {
      redirectTo: `${window.location.origin}/login?recovery=1`
    });
    setStatus(error ? error.message : "Reset link sent. Check your email.");
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    if (resetState.password.length < 8) {
      setStatus("Use at least 8 characters for the new password.");
      return;
    }
    if (resetState.password !== resetState.confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }
    setStatus("Updating password...");
    const { error } = await supabase.auth.updateUser({ password: resetState.password });
    if (error) {
      setStatus(error.message);
      return;
    }
    setAuthMode("login");
    setStatus("Password updated. Sign in with your new password.");
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    if (!session?.access_token) return;

    setStatus("Saving account details...");
    try {
      const result = await useAuthorizedJson(session, "/.netlify/functions/customer-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });
      await useAuthorizedJson(session, "/.netlify/functions/customer-dashboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });
      setProfile(result.customer || null);
      setStatus("Account details updated.");
    } catch (error) {
      setStatus(error.message || "Unable to save account.");
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    if (!session?.access_token) return;
    setStatus(addressForm.id ? "Updating address..." : "Adding address...");
    try {
      await useAuthorizedJson(session, "/.netlify/functions/customer-addresses", {
        method: addressForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm)
      });
      const refreshed = await useAuthorizedJson(session, "/.netlify/functions/customer-addresses");
      setDashboard((current) => ({ ...current, addresses: refreshed.addresses || [] }));
      setStatus("Address saved.");
    } catch (error) {
      setStatus(error.message || "Unable to save address.");
    }
  };

  const editAddress = (address) => {
    setAddressForm({
      id: address.id,
      label: address.label || "Home",
      recipientName: address.recipient_name || "",
      phone: address.phone || "",
      addressLine1: address.address_line_1 || "",
      addressLine2: address.address_line_2 || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      isDefault: Boolean(address.is_default)
    });
  };

  const deleteAddress = async (id) => {
    if (!session?.access_token) return;
    setStatus("Removing address...");
    try {
      await useAuthorizedJson(session, `/.netlify/functions/customer-addresses?id=${id}`, { method: "DELETE" });
      const refreshed = await useAuthorizedJson(session, "/.netlify/functions/customer-addresses");
      setDashboard((current) => ({ ...current, addresses: refreshed.addresses || [] }));
      setStatus("Address removed.");
    } catch (error) {
      setStatus(error.message || "Unable to remove address.");
    }
  };

  const handleDeleteRequest = async () => {
    setStatus("Before you leave: use code STAY10 on your next order for 10% off. Account deletion can be handled through support for now.");
  };

  if (session) {
    const wishlistItems = productCatalog.filter((product) => wishlist.includes(product.slug));
    const addressSummary = [profile?.address_line_1, profile?.address_line_2, profile?.city, profile?.state, profile?.pincode]
      .filter(Boolean)
      .join(", ");
    const stats = {
      activeOrders: dashboard.orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length,
      deliveredOrders: dashboard.orders.filter((order) => order.status === "delivered").length,
      refundRequests: dashboard.orders.filter((order) => order.status === "refund_requested").length,
      lifetimeOrders: totalOrders
    };
    const tierProgress = nextTier
      ? ((totalOrders - currentTier.minOrders) / Math.max(nextTier.minOrders - currentTier.minOrders, 1)) * 100
      : 100;

    return (
      <section className="account-shell account-premium-shell">
        <div className={`account-overview-card tier-${currentTier.accent}`}>
          <div className="account-hero-copy">
            <p className="eyebrow">Welcome back</p>
            <div className="account-identity">
              <div className="account-avatar">
                {profileForm.avatarUrl ? <img src={profileForm.avatarUrl} alt={fullName} /> : <span>{firstName.slice(0, 1)}</span>}
              </div>
              <div>
                <h1>{firstName}, your flavour club is active.</h1>
                <p>{profile?.email || session.user.email}</p>
              </div>
            </div>
            <div className="account-message-band">
              <span className="account-tier-badge">{currentTier.label}</span>
              <strong>{rotatingMessage}</strong>
              <span>{lastOrder ? `Last order ${lastOrder.order_number} is ${lastOrder.status.replaceAll("_", " ")}.` : "Your first order unlocks personalised recommendations."}</span>
            </div>
            <div className="account-hero-actions">
              <Link className="button button-primary" to="/orders">Quick reorder</Link>
              <button className="button button-secondary" type="button" onClick={() => setActiveSection("rewards")}>
                Rewards Club
              </button>
            </div>
          </div>
          <div className="account-overview-metrics account-hero-metrics">
            <div>
              <span>Points balance</span>
              <strong>{profile?.reward_points || 0}</strong>
            </div>
            <div>
              <span>Orders to next reward</span>
              <strong>{nextTier ? ordersUntilNextTier : 0}</strong>
            </div>
            <div>
              <span>Last delivery</span>
              <strong>{lastOrder ? lastOrder.status.replaceAll("_", " ") : "No orders yet"}</strong>
            </div>
          </div>
        </div>

        <div className="account-layout">
          <aside className="account-sidebar">
            <div className="account-sidebar-top">
              <strong>My account</strong>
              <span>{currentTier.label} member</span>
            </div>
            <nav className="account-sidebar-nav">
              {ACCOUNT_SECTIONS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`account-sidebar-link ${activeSection === key ? "active" : ""}`}
                  onClick={() => setActiveSection(key)}
                >
                  {label}
                </button>
              ))}
              <button type="button" className="account-sidebar-link" onClick={() => supabase?.auth.signOut()}>
                Logout
              </button>
            </nav>
          </aside>

          <div className="account-main">
          {showSection("dashboard") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Quick reorder</p>
                <h2>Recent jars, ready again</h2>
              </div>
              <p>Reduce purchase friction by bringing the last favourites back to the front.</p>
            </div>
            <div className="account-reorder-grid">
              {recentItems.length ? recentItems.map((item) => {
                const product = productCatalog.find((entry) => entry.slug === item.product_slug);
                return (
                  <article key={item.id} className="account-reorder-card">
                    <img src={product?.image || "/images/logo.png"} alt={item.product_name} />
                    <div>
                      <strong>{item.product_name}</strong>
                      <span>Last ordered {formatDate(lastOrder?.created_at)}</span>
                    </div>
                    <div className="account-card-actions">
                      <button className="button button-primary" type="button" onClick={() => addToCart(item.product_slug, item.quantity || 1, product?.stock || 50)}>Buy again</button>
                      <button className="button button-secondary" type="button" onClick={() => addToCart(item.product_slug, 1, product?.stock || 50)}>Add to basket</button>
                    </div>
                  </article>
                );
              }) : (
                <div className="empty-panel">
                  <h2>Your first reorder will appear here.</h2>
                  <p>Once a customer completes an order, this area becomes the fastest route back to checkout.</p>
                </div>
              )}
            </div>
          </section> : null}

          {showSection("dashboard", "orders") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Orders snapshot</p>
                <h2>Momentum at a glance</h2>
              </div>
              <Link className="button button-secondary" to="/orders">View all orders</Link>
            </div>
            <div className="account-stats-grid">
              {Object.entries(stats).map(([key, value]) => (
                <article key={key} className="account-stat-card">
                  <span>{key.replace(/([A-Z])/g, " $1")}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
          </section> : null}

          {showSection("rewards") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Rewards Club</p>
                <h2>{currentTier.label} tier with a clear next milestone</h2>
              </div>
              <p>{nextTier ? `${ordersUntilNextTier} order${ordersUntilNextTier === 1 ? "" : "s"} until ${nextTier.label}.` : "Top tier unlocked."}</p>
            </div>
            <div className="tier-progress-card">
              <div className="tier-progress-head">
                <strong>{currentTier.label}</strong>
                <span>{nextTier ? `Next: ${nextTier.label}` : "Legend reached"}</span>
              </div>
              <div className="tier-progress-bar"><span style={{ width: `${tierProgress}%` }} /></div>
              <div className="tier-progress-meta">
                <span>{Math.round(tierProgress)}% complete</span>
                <span>{nextTier ? `${ordersUntilNextTier} orders needed` : "All rewards unlocked"}</span>
              </div>
            </div>
            <div className="account-benefits-grid">
              {currentTier.rewards.map((reward) => (
                <article key={reward} className="account-benefit-card">
                  <strong>{reward}</strong>
                  <span>Unlocked in your current tier.</span>
                </article>
              ))}
              {nextTier ? (
                <article className="account-benefit-card next-tier-card">
                  <strong>{nextTier.rewards[0]}</strong>
                  <span>Next milestone reward in {ordersUntilNextTier} orders.</span>
                </article>
              ) : null}
            </div>
            {nextTier && ordersUntilNextTier === 1 ? <div className="celebration-banner">One more order unlocks your next tier.</div> : null}
          </section> : null}

          {showSection("dashboard") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Recommended for you</p>
                <h2>Based on your taste so far</h2>
              </div>
            </div>
            <div className="account-recommendation-grid">
              {recommendedProducts.map((product) => (
                <article key={product.slug} className="account-recommendation-card">
                  <img src={product.image} alt={product.name} />
                  <strong>{product.name}</strong>
                  <span>{product.tagline}</span>
                  <button className="button button-secondary" type="button" onClick={() => addToCart(product.slug, 1, product.stock)}>Add to basket</button>
                </article>
              ))}
            </div>
          </section> : null}

          {showSection("dashboard") ? <section className="account-section-card seasonal-drop-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Member drop</p>
                <h2>Limited weekly flavour release</h2>
              </div>
            </div>
            <div className="seasonal-drop-grid">
              <div>
                <strong>Winter Garlic Reserve</strong>
                <p>Friday member-exclusive batch with early access for logged-in customers.</p>
              </div>
              <div>
                <strong>02 : 18 : 44</strong>
                <span>Countdown placeholder until live drops are connected.</span>
              </div>
            </div>
          </section> : null}

          {showSection("dashboard") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Milestones</p>
                <h2>Emotional retention and progress</h2>
              </div>
            </div>
            <div className="account-stats-grid">
              <article className="account-stat-card">
                <span>Lifetime jars purchased</span>
                <strong>{lifetimeJars}</strong>
              </article>
              <article className="account-stat-card">
                <span>Flavours tried</span>
                <strong>{flavorsTried} / {productCatalog.length}</strong>
              </article>
              <article className="account-stat-card">
                <span>Lifetime savings</span>
                <strong>INR {(profile?.reward_points || 0) * 2}</strong>
              </article>
              <article className="account-stat-card">
                <span>Achievement badge</span>
                <strong>{totalOrders > 4 ? "Table Favourite" : "First Pour"}</strong>
              </article>
            </div>
          </section> : null}

          {showSection("profile") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Profile</p>
                <h2>Contact and delivery details</h2>
              </div>
              <p>Keep your address and phone ready for faster checkout and repeat orders.</p>
            </div>
            <form className="account-form-grid" onSubmit={handleProfileUpdate}>
              <label>Full name<input type="text" value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
              <label>Phone<input type="tel" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label className="account-form-span">Address line 1<input type="text" value={profileForm.addressLine1} onChange={(event) => setProfileForm((current) => ({ ...current, addressLine1: event.target.value }))} /></label>
              <label className="account-form-span">Address line 2<input type="text" value={profileForm.addressLine2} onChange={(event) => setProfileForm((current) => ({ ...current, addressLine2: event.target.value }))} /></label>
              <label>City<input type="text" value={profileForm.city} onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))} /></label>
              <label>State<input type="text" value={profileForm.state} onChange={(event) => setProfileForm((current) => ({ ...current, state: event.target.value }))} /></label>
              <label>Pincode<input type="text" value={profileForm.pincode} onChange={(event) => setProfileForm((current) => ({ ...current, pincode: event.target.value }))} /></label>
              <label className="account-form-span">Avatar image URL<input type="url" value={profileForm.avatarUrl} onChange={(event) => setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }))} placeholder="https://..." /></label>
              <label><input type="checkbox" checked={profileForm.marketingOptIn} onChange={(event) => setProfileForm((current) => ({ ...current, marketingOptIn: event.target.checked }))} /> Email offers</label>
              <label><input type="checkbox" checked={profileForm.orderUpdatesOptIn} onChange={(event) => setProfileForm((current) => ({ ...current, orderUpdatesOptIn: event.target.checked }))} /> Order notifications</label>
              <label><input type="checkbox" checked={profileForm.supportOptIn} onChange={(event) => setProfileForm((current) => ({ ...current, supportOptIn: event.target.checked }))} /> Support updates</label>
              <div className="account-card-actions account-form-span">
                <button className="button button-primary" type="submit">Save account details</button>
                <Link className="button button-secondary" to="/track-order">Track orders</Link>
                <Link className="button button-secondary" to="/orders">My orders</Link>
              </div>
            </form>
          </section> : null}

          {showSection("security") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Security</p>
                <h2>Login safety and future payment vault</h2>
              </div>
              <p>Protected account state now. Payment methods and secure saved cards can be connected later without redesigning this area.</p>
            </div>
            <div className="account-payment-stack">
              <article className="account-payment-card">
                <span className="account-chip">Coming soon</span>
                <strong>Secure online payment</strong>
                <p>Once Razorpay is connected, you will be able to pay online during checkout and review saved payment references from this page.</p>
              </article>
              <article className="account-payment-card subtle">
                <span className="account-chip">Current flow</span>
                <strong>Order request and confirmation</strong>
                <p>Your account, delivery profile, wishlist, and order history can be managed now. Payment confirmation will be added in the next release.</p>
              </article>
            </div>
          </section> : null}
        

          {showSection("addresses") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Addresses</p>
                <h2>Saved addresses</h2>
              </div>
              <p>Keep delivery details ready to reduce checkout friction and help repeat purchases convert faster.</p>
            </div>
            <form className="account-form-grid" onSubmit={saveAddress}>
              <label>Label<input type="text" value={addressForm.label} onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))} /></label>
              <label>Recipient<input type="text" value={addressForm.recipientName} onChange={(event) => setAddressForm((current) => ({ ...current, recipientName: event.target.value }))} /></label>
              <label>Phone<input type="tel" value={addressForm.phone} onChange={(event) => setAddressForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label className="account-form-span">Address line 1<input type="text" value={addressForm.addressLine1} onChange={(event) => setAddressForm((current) => ({ ...current, addressLine1: event.target.value }))} /></label>
              <label className="account-form-span">Address line 2<input type="text" value={addressForm.addressLine2} onChange={(event) => setAddressForm((current) => ({ ...current, addressLine2: event.target.value }))} /></label>
              <label>City<input type="text" value={addressForm.city} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} /></label>
              <label>State<input type="text" value={addressForm.state} onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))} /></label>
              <label>Pincode<input type="text" value={addressForm.pincode} onChange={(event) => setAddressForm((current) => ({ ...current, pincode: event.target.value }))} /></label>
              <label><input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm((current) => ({ ...current, isDefault: event.target.checked }))} /> Set as default</label>
              <div className="account-card-actions account-form-span">
                <button className="button button-primary" type="submit">{addressForm.id ? "Update address" : "Add address"}</button>
                <button className="button button-secondary" type="button" onClick={() => setAddressForm({ id: null, label: "Home", recipientName: "", phone: profileForm.phone, addressLine1: "", addressLine2: "", city: "", state: "", pincode: "", isDefault: true })}>New address</button>
              </div>
            </form>
            <div className="account-address-list">
              {dashboard.addresses.map((address) => (
                <article key={address.id} className="account-address-card">
                  <strong>{address.label}{address.is_default ? " • Default" : ""}</strong>
                  <span>{address.recipient_name}</span>
                  <span>{[address.address_line_1, address.address_line_2, address.city, address.state, address.pincode].filter(Boolean).join(", ")}</span>
                  <div className="account-card-actions">
                    <button className="button button-secondary" type="button" onClick={() => editAddress(address)}>Edit</button>
                    <button className="button button-ghost" type="button" onClick={() => deleteAddress(address.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </section> : null}

          {showSection("referrals") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Referrals</p>
                <h2>Give a reward, earn a reward</h2>
              </div>
              <p>Build organic growth with a premium referral offer and visible customer rewards.</p>
            </div>
            <div className="account-reward-stack">
              <article className="account-payment-card">
                <span className="account-chip">Referral code</span>
                <strong>{referralCode || "Will appear after your account is fully synced."}</strong>
                <p>Give £5, get £5 style offer placeholder. Rewards are already modelled in Supabase and can later plug into checkout discounts.</p>
              </article>
              <article className="account-payment-card subtle">
                <span className="account-chip">Successful referrals</span>
                <strong>{dashboard.referrals.filter((item) => item.status === "completed").length}</strong>
                <p>{dashboard.referrals.length ? "Referral activity is being tracked in your account." : "Your first referral will appear here."}</p>
              </article>
              <article className="account-payment-card subtle">
                <span className="account-chip">Share link</span>
                <strong>{referralCode ? `${window.location.origin}/account?ref=${referralCode}` : "Share link will appear with your referral code."}</strong>
                <p>Ready for WhatsApp, Instagram bio, or direct sharing.</p>
              </article>
            </div>
          </section> : null}

          {showSection("dashboard") ? <section className="account-section-card">
          <div className="account-section-head">
            <div>
              <p className="eyebrow">Wishlist</p>
              <h2>Saved jars</h2>
            </div>
            <div className="account-section-head-actions">
              <p>Move favourites into the cart directly from here.</p>
              <Link className="button button-secondary" to="/wishlist">Open full wishlist</Link>
            </div>
          </div>
          {wishlistItems.length ? (
            <div className="account-wishlist-grid">
              {wishlistItems.map((product) => (
                <article key={product.slug} className="account-wishlist-card">
                  <img
                    src={product.image}
                    alt={product.name}
                    onError={(event) => {
                      event.currentTarget.src = "/images/logo.png";
                    }}
                  />
                  <div className="account-wishlist-copy">
                    <strong>{product.name}</strong>
                    <span>{product.shortDescription}</span>
                    <small>{product.stock > 0 ? `${product.stock} available` : "Out of stock"}</small>
                  </div>
                  <div className="account-card-actions">
                    <Link className="button button-secondary" to={`/product/${product.slug}`}>
                      View product
                    </Link>
                    <button
                      className="button button-primary"
                      type="button"
                      disabled={product.stock <= 0}
                      onClick={() => addToCart(product.slug, 1, product.stock)}
                    >
                      {product.stock > 0 ? "Add to cart" : "Out of stock"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <h2>No saved flavours yet.</h2>
              <p>Save products from the achar menu to keep them ready here for your next order.</p>
            </div>
          )}
          </section> : null}

        {dashboard.notifications.length && showSection("dashboard") ? (
          <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Notifications</p>
                <h2>Recent updates</h2>
              </div>
            </div>
            <div className="account-notification-list">
              {dashboard.notifications.map((note) => (
                <article key={note.id} className="account-notification-card">
                  <strong>{note.title}</strong>
                  <p>{note.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

          {showSection("support") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Support</p>
                <h2>Order help and issue reporting</h2>
              </div>
            </div>
            <div className="account-support-grid">
              <article className="account-notification-card">
                <strong>Contact support</strong>
                <p>For delivery, refund, or flavour queries, use the My Orders page or email support directly.</p>
                <Link className="button button-secondary" to="/orders">Open order help</Link>
              </article>
              <article className="account-notification-card">
                <strong>Live chat</strong>
                <p>Live chat placeholder for a future support widget or WhatsApp handoff.</p>
                <button className="button button-ghost" type="button">Coming soon</button>
              </article>
            </div>
          </section> : null}

          {showSection("security") ? <section className="account-section-card">
            <div className="account-section-head">
              <div>
                <p className="eyebrow">Account exit</p>
                <h2>Close account access</h2>
              </div>
            </div>
            <article className="account-delete-card">
              <strong>Thinking of leaving?</strong>
              <p>If you want to close your account, send the request here and we will handle it through support.</p>
              <button className="button button-ghost" type="button" onClick={handleDeleteRequest}>Request deletion</button>
            </article>
          </section> : null}

          </div>
        </div>
        <p className="inline-status">{status}</p>
      </section>
    );
  }

  return (
    <section className="auth-shell">
      <div className="auth-panel primary">
        <p className="eyebrow">Secure account</p>
        <h1>{authMode === "reset" ? "Set your new password." : "Sign in to your account."}</h1>
        <p>Keep your saved addresses, order history, favourites, and faster checkout details in one secure place.</p>
        <div className="auth-trust-row">
          <div className="auth-trust-card"><strong>Secure login</strong><span>Protected access for orders, addresses, and account details.</span></div>
          <div className="auth-trust-card"><strong>Faster reorders</strong><span>Saved preferences and favourites make the next order simpler.</span></div>
        </div>
        <div className="auth-mode-row">
          <button className={`button ${authMode === "login" ? "button-primary" : "button-secondary"}`} type="button" onClick={() => setAuthMode("login")}>Sign in</button>
          <button className={`button ${authMode === "signup" ? "button-primary" : "button-secondary"}`} type="button" onClick={() => setAuthMode("signup")}>Create account</button>
          <button className={`button ${authMode === "forgot" ? "button-primary" : "button-secondary"}`} type="button" onClick={() => setAuthMode("forgot")}>Forgot password</button>
        </div>
      </div>
      <div className="auth-panel auth-form-panel">
        {authMode === "login" ? (
          <>
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in</h2>
            <p>Use your email and password to access orders, wishlist, addresses, and account settings.</p>
            <form className="auth-form" onSubmit={handleLogin}>
              <label>Email<input type="email" placeholder="you@example.com" value={loginState.email} onChange={(event) => setLoginState((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>Password<input type="password" placeholder="Password" value={loginState.password} onChange={(event) => setLoginState((current) => ({ ...current, password: event.target.value }))} /></label>
              <label className="auth-checkbox"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> <span>Remember me on this device</span></label>
              <button className="button button-primary" type="submit" disabled={!!session}>Sign in</button>
            </form>
          </>
        ) : null}
        {authMode === "signup" ? (
          <>
            <p className="eyebrow">New customer</p>
            <h2>Create your account</h2>
            <p>Minimal signup now, richer account details later. Faster path to the first order.</p>
            <form className="auth-form" onSubmit={handleSignup}>
              <label>Full name<input type="text" placeholder="Your name" value={signupState.fullName} onChange={(event) => setSignupState((current) => ({ ...current, fullName: event.target.value }))} /></label>
              <label>Email<input type="email" placeholder="you@example.com" value={signupState.email} onChange={(event) => setSignupState((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>Password<input type="password" placeholder="Create password" value={signupState.password} onChange={(event) => setSignupState((current) => ({ ...current, password: event.target.value }))} /></label>
              <label>Referral code<input type="text" placeholder="Optional referral code" value={signupState.referralCode} onChange={(event) => setSignupState((current) => ({ ...current, referralCode: event.target.value }))} /></label>
              <input type="text" tabIndex="-1" autoComplete="off" className="spam-trap" value={signupState.website} onChange={(event) => setSignupState((current) => ({ ...current, website: event.target.value }))} />
              <button className="button button-primary" type="submit">Create account</button>
            </form>
          </>
        ) : null}
        {authMode === "forgot" ? (
          <>
            <p className="eyebrow">Password help</p>
            <h2>Forgot password</h2>
            <form className="auth-form" onSubmit={handleForgotPassword}>
              <label>Email<input type="email" placeholder="you@example.com" value={resetRequestEmail} onChange={(event) => setResetRequestEmail(event.target.value)} /></label>
              <button className="button button-primary" type="submit">Send reset link</button>
            </form>
          </>
        ) : null}
        {authMode === "reset" ? (
          <>
            <p className="eyebrow">Password recovery</p>
            <h2>Reset password</h2>
            <form className="auth-form" onSubmit={handleResetPassword}>
              <label>New password<input type="password" value={resetState.password} onChange={(event) => setResetState((current) => ({ ...current, password: event.target.value }))} /></label>
              <label>Confirm password<input type="password" value={resetState.confirmPassword} onChange={(event) => setResetState((current) => ({ ...current, confirmPassword: event.target.value }))} /></label>
              <button className="button button-primary" type="submit">Update password</button>
            </form>
          </>
        ) : null}
        <p className="inline-status">{status}</p>
      </div>
    </section>
  );
}

function OrdersPage({ session, addToCart }) {
  const [status, setStatus] = useState("");
  const [ordersData, setOrdersData] = useState({ orders: [], loyalty: null });
  const [query, setQuery] = useState("");
  const productCatalog = useCatalogProducts();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session?.access_token) return;
      try {
        const payload = await useAuthorizedJson(session, `/.netlify/functions/customer-orders${query ? `?q=${encodeURIComponent(query)}` : ""}`);
        if (!cancelled) setOrdersData(payload);
      } catch (error) {
        if (!cancelled) setStatus(error.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session, query]);

  if (!session) {
    return (
      <section className="auth-shell single">
        <div className="auth-panel primary auth-form-panel">
          <p className="eyebrow">My orders</p>
          <h1>Sign in to manage orders.</h1>
          <p>View delivery progress, reorder favourites, and raise support requests from one place.</p>
          <Link className="button button-secondary" to="/account">Go to account</Link>
        </div>
      </section>
    );
  }

  const handleAction = async (payload, successMessage) => {
    setStatus("Updating order...");
    try {
      await useAuthorizedJson(session, "/.netlify/functions/customer-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const refreshed = await useAuthorizedJson(session, "/.netlify/functions/customer-orders");
      setOrdersData(refreshed);
      setStatus(successMessage);
    } catch (error) {
      setStatus(error.message || "Unable to update order.");
    }
  };

  return (
    <section className="page-shell">
      <div className="product-system-head">
        <div>
          <p className="eyebrow">Orders</p>
          <h1>Every order, ready to repeat or support.</h1>
        </div>
        <div className="account-card-actions">
          <input className="order-search" type="search" placeholder="Search order number or status" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="hero-metric-card">
            <strong>{ordersData.loyalty?.rewardPoints || 0} points</strong>
            <span>Loyalty balance</span>
          </div>
        </div>
      </div>
      <div className="order-list">
        {(ordersData.orders || []).map((order) => (
          <article key={order.id} className="order-card">
            <div className="order-card-head">
              <div>
                <p className="eyebrow">{order.order_number}</p>
                <h2>{order.items_summary}</h2>
              </div>
              <div className="order-card-meta">
                <strong>{order.status}</strong>
                <span>INR {order.total_amount}</span>
                <span>{order.delivery_eta ? `ETA ${order.delivery_eta}` : "ETA will be updated"}</span>
              </div>
            </div>
            <div className="order-item-grid">
              {(order.items || []).map((item) => {
                const product = productCatalog.find((entry) => entry.slug === item.product_slug);
                return (
                  <div key={item.id} className="order-item-card">
                    <img src={product?.image || "/images/logo.png"} alt={item.product_name} />
                    <div>
                      <strong>{item.product_name}</strong>
                      <span>{item.size_label || product?.size}</span>
                      <span>{item.quantity} x INR {item.unit_price}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="timeline-row">
              {["placed", "packed", "shipped", "out_for_delivery", "delivered"].map((step) => {
                const active = (order.timeline || []).some((item) => item.status === step);
                return <span key={step} className={`timeline-pill ${active ? "active" : ""}`}>{step.replaceAll("_", " ")}</span>;
              })}
            </div>
            <div className="account-card-actions">
              {(order.items || []).map((item) => (
                <button key={`reorder-${item.id}`} className="button button-primary" type="button" onClick={() => addToCart(item.product_slug, item.quantity || 1, 99)}>
                  Buy {item.product_name} again
                </button>
              )).slice(0, 1)}
              {order.cancelEligible ? (
                <button className="button button-secondary" type="button" onClick={() => handleAction({ type: "cancel-order", orderId: order.id }, "Order cancelled.")}>Cancel order</button>
              ) : null}
              <button className="button button-secondary" type="button" onClick={() => handleAction({ type: "support-request", orderId: order.id, subject: `Help for ${order.order_number}` }, "Support request created.")}>Need help</button>
              <button className="button button-ghost" type="button" onClick={() => handleAction({ type: "refund-request", orderId: order.id, amount: order.total_amount, reason: "Customer requested review from My Orders." }, "Refund request submitted.")}>Request refund</button>
            </div>
          </article>
        ))}
      </div>
      <p className="inline-status">{status}</p>
    </section>
  );
}

function TrackPage({ session }) {
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);

  if (!session) {
    return (
      <section className="auth-shell single">
        <div className="auth-panel primary auth-form-panel">
          <p className="eyebrow">Order tracking</p>
          <h1>Sign in to track your order.</h1>
          <p>Shiprocket-based tracking will be connected here later. Until then, signed-in customers will be able to check manual order updates from this page.</p>
          <Link className="button button-secondary" to="/account">Go to account</Link>
        </div>
      </section>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    const params = new URLSearchParams(new FormData(event.currentTarget));
    setStatus("Checking order...");
    try {
      const response = await fetch(`/.netlify/functions/track-order?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to find the order.");
      setResult(payload.order);
      setStatus("");
    } catch (error) {
      setResult(null);
      setStatus(error.message);
    }
  };

  return (
    <section className="auth-shell single">
      <form className="auth-panel primary auth-form-panel" onSubmit={submit}>
        <p className="eyebrow">Order tracking</p>
        <h1>Delivery tracking coming soon</h1>
        <label>Order number<input type="text" name="orderNumber" required /></label>
        <label>Phone<input type="tel" name="phone" required /></label>
        <button className="button button-primary" type="submit">Check current status</button>
        <p className="inline-status">{status}</p>
      </form>
      <div className="auth-panel">
        {result ? (
          <>
            <p className="eyebrow">Order status</p>
            <h2>{result.order_number}</h2>
            <div className="timeline-row">
              {["placed", "packed", "shipped", "out_for_delivery", "delivered"].map((step) => (
                <span key={step} className={`timeline-pill ${result.status === step ? "active" : ""}`}>{step.replaceAll("_", " ")}</span>
              ))}
            </div>
            <p>Status: {result.status}</p>
            <p>Customer: {result.customer_name}</p>
            <p>Total: INR {result.total_amount}</p>
            <p>{result.delivery_eta ? `Estimated arrival: ${result.delivery_eta}` : "Estimated arrival will appear when dispatch begins."}</p>
            <p>{result.tracking_number ? `Tracking number: ${result.tracking_number}` : "Tracking number will be added when shipping is enabled."}</p>
          </>
        ) : (
          <>
            <p className="eyebrow">Tracking</p>
            <h2>Manual dispatch updates for now</h2>
            <p>Shiprocket will be integrated later. Until then, this page shows the latest order status updated by the team after confirmation, packing, and dispatch.</p>
          </>
        )}
      </div>
    </section>
  );
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

  useEffect(() => {
    if (!session || !supabase) return undefined;
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (window.sessionStorage.getItem("kp_session_mode") === "session-only") {
          supabase.auth.signOut();
          setSession(null);
        }
      }, 1000 * 60 * 30);
    };

    ["mousemove", "keydown", "scroll", "click"].forEach((eventName) => window.addEventListener(eventName, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timeoutId);
      ["mousemove", "keydown", "scroll", "click"].forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [session]);

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
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -14, filter: "blur(10px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
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
            <Route path="/orders" element={<OrdersPage session={session} addToCart={shop.addToCart} />} />
            <Route path="/wishlist" element={<WishlistPage wishlist={shop.wishlist} addToCart={shop.addToCart} />} />
            <Route path="/account" element={<AccountPage session={session} refreshSession={refreshSession} wishlist={shop.wishlist} addToCart={shop.addToCart} />} />
            <Route path="/login" element={<AccountPage session={session} refreshSession={refreshSession} wishlist={shop.wishlist} addToCart={shop.addToCart} />} />
            <Route path="/track-order" element={<TrackPage session={session} />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
