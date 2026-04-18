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
import { products } from "./data";
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

function Header({ cartCount, wishlistCount, isLoggedIn, onSignOut }) {
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
    { to: "/about", label: "About" },
    { to: "/achar", label: "Achar" },
    { to: "/wishlist", label: `Wishlist${wishlistCount ? ` (${wishlistCount})` : ""}` },
    { to: "/login", label: isLoggedIn ? "Account" : "Login" },
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
              <Link className="nav-admin" to="/login">
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
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 90, damping: 20 });
  const springY = useSpring(pointerY, { stiffness: 90, damping: 20 });
  const rotateX = useTransform(springY, [-160, 160], [7, -7]);
  const rotateY = useTransform(springX, [-160, 160], [-9, 9]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.4]);
  const progressScale = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX - (rect.left + rect.width / 2));
    pointerY.set(event.clientY - (rect.top + rect.height / 2));
  };

  const onLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div className="landing-shell">
      <motion.div className="page-progress" style={{ scaleX: progressScale }} />

      <motion.section
        ref={heroRef}
        className="react-hero"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ y: heroY, opacity: heroOpacity }}
      >
        <HeroCanvas />
        <div className="hero-grid-pattern" />
        <div className="hero-radial hero-radial-a" />
        <div className="hero-radial hero-radial-b" />

        <div className="hero-copy-block">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.04 }}
          >
            Homemade food, shaped by a woman who has been serving with passion for years.
          </motion.h1>
          <motion.p
            className="hero-copy-text"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
          >
            Khana Peena Ghar Se was born from the hands of a woman who spent her life bringing people together through food. A woman with years of wisdom, resilience, and tradition behind her, she turned everyday meals into moments of comfort, celebration, and connection. For her, cooking was never just about feeding people—it was about caring for them.
          </motion.p>
          <motion.div
            className="hero-cta-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
          >
            <Link className="button button-primary" to="/achar">
              Explore the achar menu
            </Link>
            <a className="button button-secondary" href={ZOMATO_URL} target="_blank" rel="noreferrer">
              Order on Zomato
            </a>
          </motion.div>
          <div className="hero-metric-row">
            {FEATURE_METRICS.map((metric) => (
              <motion.div
                key={metric.label}
                className="hero-metric-card"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
              >
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          className="hero-image-panel"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.18 }}
        >
          <div className="hero-image-frame">
            <img
              src={HOME_HERO_IMAGE}
              alt="Khana Peena Ghar Se signature table spread"
              onError={(event) => {
                event.currentTarget.closest(".hero-image-frame")?.classList.add("is-empty");
                event.currentTarget.remove();
              }}
            />
          </div>
        </motion.div>

      </motion.section>

      <section className="home-chapters">
        {PRODUCT_CHAPTERS.map((chapter, index) => (
          <motion.article
            key={chapter.id}
            className="home-chapter-band"
            initial={{ opacity: 0, y: 44 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ duration: 0.65, delay: index * 0.04 }}
          >
            <div className="chapter-band-copy">
              <span className="chapter-band-index">{chapter.index}</span>
              <p className="eyebrow">{chapter.label}</p>
              <h2>{chapter.title}</h2>
              <p>{chapter.copy}</p>
            </div>
            <div className="chapter-band-panels">
              {productCatalog
                .filter((product) => product.categoryKey === chapter.id)
                .map((product) => (
                  <Link key={product.slug} to={`/product/${product.slug}`} className="chapter-mini-panel">
                    <div className="chapter-mini-media">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = "/images/logo.png";
                        }}
                      />
                    </div>
                    <div className="chapter-mini-copy">
                      <strong>{product.name}</strong>
                      <span>{product.tagline}</span>
                    </div>
                  </Link>
                ))}
            </div>
          </motion.article>
        ))}
      </section>

      <footer className="site-footer-react">
        <div className="footer-brand-block">
          <Link className="brand" to="/">
            <img src="/images/logo.png" alt="" />
            <span className="brand-copy">
              <strong>Khana Peena Ghar Se</strong>
              <span>Homemade achar and Indian food</span>
            </span>
          </Link>
          <p>
            Homemade food prepared with care, curated masalas, and the warmth of a kitchen that still believes food should feel personal.
          </p>
        </div>
        <div className="footer-links-grid">
          <div>
            <h3>About</h3>
            <Link to="/about">Our story</Link>
            <span>Women-led</span>
            <span>Curated masalas</span>
          </div>
          <div>
            <h3>Shop</h3>
            <Link to="/achar">Achar menu</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/wishlist">Wishlist</Link>
          </div>
          <div>
            <h3>Account</h3>
            <Link to="/login">Login</Link>
            <Link to="/track-order">Track order</Link>
          </div>
          <div>
            <h3>Order</h3>
            <a href={ZOMATO_URL} target="_blank" rel="noreferrer">Zomato</a>
            <span>Bahadurgarh</span>
            <span>Batch-made, homemade</span>
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
            Khana Peena Ghar Se was born from the hands of a woman who spent her life bringing people
            together through food. A woman with years of wisdom, resilience, and tradition behind her,
            she turned everyday meals into moments of comfort, celebration, and connection. For her,
            cooking was never just about feeding people—it was about caring for them.
          </p>
          <p>
            After decades of perfecting recipes, blending spices by instinct, and knowing that the best
            food comes from patience and love, she chose to share that legacy beyond her own kitchen.
            What began as family favourites and trusted homemade masalas became a brand rooted in heritage and heart.
          </p>
          <p>
            Proudly women-led, Khana Peena Ghar Se carries forward her strength, warmth, and belief that
            real food should feel like home. Every jar is prepared in small batches, with carefully selected
            ingredients and time-honoured methods, so that each spoonful brings the taste of tradition to modern homes.
          </p>
          <p>
            This is more than a food brand—it is the story of a strong woman who proved that experience
            is power, tradition is timeless, and the kitchen can build a legacy.
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

function WishlistPage({ wishlist }) {
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
              <Link className="button button-primary" to={`/product/${product.slug}`}>
                Open product
              </Link>
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
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
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
      <div className="checkout-column">
        <div className="product-system-head">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Delivery details, order data, payment placeholder.</h1>
          </div>
        </div>
        <div className="checkout-summary">
          {items.length ? (
            items.map((item) => (
              <div key={item.product.slug} className="cart-line-react">
                <div>
                  <strong>{item.product.name}</strong>
                  <span>{item.product.size}</span>
                  <span>{item.product.stock > 0 ? `${item.product.stock} available now` : "Out of stock"}</span>
                </div>
                <div className="qty-buttons">
                  <button onClick={() => updateCartQuantity(item.product.slug, item.quantity - 1, item.product.stock)}>-</button>
                  <span>{item.quantity}</span>
                  <button
                    disabled={item.quantity >= item.product.stock}
                    onClick={() => updateCartQuantity(item.product.slug, item.quantity + 1, item.product.stock)}
                  >
                    +
                  </button>
                </div>
                <strong>INR {item.product.price * item.quantity}</strong>
              </div>
            ))
          ) : (
            <p>Your cart is empty.</p>
          )}
          <div className="summary-total">
            <strong>Total</strong>
            <strong>INR {total}</strong>
          </div>
        </div>
      </div>

      <form className="checkout-form-react" onSubmit={placeOrder}>
        <label>Full name<input type="text" name="customerName" required /></label>
        <label>Phone<input type="tel" name="phone" required /></label>
        <label>Email<input type="email" name="email" /></label>
        <label>Address line 1<input type="text" name="addressLine1" required /></label>
        <label>Address line 2<input type="text" name="addressLine2" /></label>
        <label>City<input type="text" name="city" required /></label>
        <label>State<input type="text" name="state" required /></label>
        <label>Pincode<input type="text" name="pincode" required /></label>
        <label>Delivery notes<textarea name="notes" rows="4" /></label>
        <div className="payment-placeholder-react">
          <strong>Razorpay placeholder</strong>
          <p>The final payment action will plug in here.</p>
        </div>
        <button className="button button-primary button-full" type="submit">
          Place order request
        </button>
        <p className="inline-status">{status}</p>
      </form>
    </section>
  );
}

function LoginPage({ session, refreshSession }) {
  const [loginState, setLoginState] = useState({ email: "", password: "" });
  const [signupState, setSignupState] = useState({ fullName: "", email: "", password: "" });
  const [status, setStatus] = useState("");

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
    await refreshSession();
    setStatus("Signed in.");
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    if (!hasSupabaseClientEnv || !supabase) {
      setStatus("Missing Supabase client configuration.");
      return;
    }
    setStatus("Creating account...");
    const { data, error } = await supabase.auth.signUp({
      email: signupState.email,
      password: signupState.password,
      options: {
        data: {
          full_name: signupState.fullName
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

  return (
    <section className="auth-shell">
      <div className="auth-panel primary">
        <p className="eyebrow">Customer login</p>
        <h1>{session ? "Your account is active." : "Sign in to continue."}</h1>
        <p>{session ? `Signed in as ${session.user.email}.` : "Use your account to keep your saved jars, manage repeat orders, and track purchases from one place."}</p>
        <form className="auth-form" onSubmit={handleLogin}>
          <label>Email<input type="email" placeholder="you@example.com" value={loginState.email} onChange={(event) => setLoginState((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>Password<input type="password" placeholder="Password" value={loginState.password} onChange={(event) => setLoginState((current) => ({ ...current, password: event.target.value }))} /></label>
          <button className="button button-primary" type="submit" disabled={!!session}>Sign in</button>
        </form>
      </div>
      <div className="auth-panel">
        <p className="eyebrow">New customer</p>
        <h2>Create your account</h2>
        <p>Create an account for a smoother checkout, easier reordering, and a more personal buying experience.</p>
        <form className="auth-form" onSubmit={handleSignup}>
          <label>Full name<input type="text" placeholder="Your name" value={signupState.fullName} onChange={(event) => setSignupState((current) => ({ ...current, fullName: event.target.value }))} /></label>
          <label>Email<input type="email" placeholder="you@example.com" value={signupState.email} onChange={(event) => setSignupState((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>Password<input type="password" placeholder="Create password" value={signupState.password} onChange={(event) => setSignupState((current) => ({ ...current, password: event.target.value }))} /></label>
          <button className="button button-secondary" type="submit">Create account</button>
        </form>
        <p className="inline-status">{status}</p>
      </div>
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
          <p>Order tracking is available for signed-in customers so order details stay private.</p>
          <Link className="button button-secondary" to="/login">Go to login</Link>
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
        <h1>Check delivery status</h1>
        <label>Order number<input type="text" name="orderNumber" required /></label>
        <label>Phone<input type="tel" name="phone" required /></label>
        <button className="button button-primary" type="submit">Track order</button>
        <p className="inline-status">{status}</p>
      </form>
      <div className="auth-panel">
        {result ? (
          <>
            <p className="eyebrow">Order status</p>
            <h2>{result.order_number}</h2>
            <p>Status: {result.status}</p>
            <p>Customer: {result.customer_name}</p>
            <p>Total: INR {result.total_amount}</p>
          </>
        ) : (
          <>
            <p className="eyebrow">Tracking</p>
            <h2>Enter order details</h2>
            <p>Tracking is available once you have your order number.</p>
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
        wishlistCount={shop.wishlist.length}
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
            <Route path="/wishlist" element={<WishlistPage wishlist={shop.wishlist} />} />
            <Route
              path="/cart"
              element={<CartPage cart={shop.cart} updateCartQuantity={shop.updateCartQuantity} />}
            />
            <Route path="/login" element={<LoginPage session={session} refreshSession={refreshSession} />} />
            <Route path="/track-order" element={<TrackPage session={session} />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
