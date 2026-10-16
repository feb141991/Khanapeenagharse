/**
 * Khana Peena Ghar Se — Static Route Prerender Pipeline
 * Generates static HTML for all public routes with per-route canonical URLs,
 * Open Graph meta tags, Schema.org JSON-LD, and semantic HTML for AI crawlers & SEO bots.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { products, faqs } from "../src/data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.resolve(rootDir, "dist");
const templatePath = path.resolve(distDir, "index.html");

if (!fs.existsSync(templatePath)) {
  console.error("❌ dist/index.html not found! Run 'vite build' first.");
  process.exit(1);
}

const template = fs.readFileSync(templatePath, "utf-8");

const routes = [
  {
    path: "/",
    title: "Khana Peena Ghar Se | Authentic Artisanal Homemade Achars & Pickles",
    description: "Handcrafted, batch-made homemade Indian achars made with 100% pure cold-pressed mustard oil and sun-cured spices. Zero palm oil, no chemical preservatives.",
    canonical: "https://khanapeenagharse.in/",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Khana Peena Ghar Se - Authentic Artisanal Homemade Achars & Pickles</h1>
        <p>Handcrafted small-batch traditional Indian pickles made with 100% pure cold-pressed mustard oil, sun-cured spices, and zero chemical preservatives from Bahadurgarh, Haryana.</p>
      </header>
      <section>
        <h2>Our Pure Mustard Oil Handcrafted Pickles</h2>
        <ul>
          ${products.map(p => `<li><a href="/product/${p.slug}"><strong>${p.name}</strong> (${p.size}) - ₹${p.price}</a>: ${p.tagline}</li>`).join("")}
        </ul>
      </section>
      <section>
        <h2>Kitchen Heritage & Purity Pledge</h2>
        <p>Zero palm oil, zero synthetic vinegar, 100% cold-pressed mustard oil, 12-month natural shelf life, pan-India doorstep delivery.</p>
      </section>
    `
  },
  {
    path: "/achar",
    title: "All Handcrafted Achars & Pickles | Khana Peena Ghar Se",
    description: "Explore our collection of authentic homemade achars: Aam Ka Achar, Hing Ka Achar, Mirch Ka Achar, Mix Veg Achar, and The Ghar Ka Achar 4-in-1 Box.",
    canonical: "https://khanapeenagharse.in/achar",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>All Handcrafted Achars & Pickles - Khana Peena Ghar Se</h1>
        <p>Explore our complete catalog of small-batch, sun-cured traditional Indian pickles made with pure cold-pressed mustard oil in Bahadurgarh, Haryana.</p>
      </header>
      <main>
        <ul>
          ${products.map(p => `
            <li>
              <h2><a href="/product/${p.slug}">${p.name} (${p.size})</a></h2>
              <p>Price: ₹${p.price} | Spice: ${p.spice}</p>
              <p>${p.description}</p>
              <p>Ingredients: ${p.ingredients.join(", ")}</p>
            </li>
          `).join("")}
        </ul>
      </main>
    `
  },
  {
    path: "/about",
    title: "Our Heritage & Story | Khana Peena Ghar Se",
    description: "Learn about Khana Peena Ghar Se, founded by Rachna Gattani in Bahadurgarh, Haryana to bring pure homemade pickles back to Indian dining tables.",
    canonical: "https://khanapeenagharse.in/about",
    ogImage: "https://khanapeenagharse.in/images/brand/about-owner.jpg",
    content: `
      <header>
        <h1>The Story of Khana Peena Ghar Se - Rachna Gattani's Kitchen</h1>
        <p>Reviving authentic, slow-crafted regional Indian recipes with pure cold-pressed mustard oil, whole hand-roasted spices, and zero chemical preservatives.</p>
      </header>
      <main>
        <p>Headquartered in Bahadurgarh, Jhajjar district, Haryana (PIN: 124507), Khana Peena Ghar Se prepares homestyle achars just like our grandmothers made—naturally sun-cured, free of refined and palm oils, and hermetically sealed for safe pan-India transit.</p>
      </main>
    `
  },
  {
    path: "/faq",
    title: "Frequently Asked Questions (FAQs) | Khana Peena Ghar Se",
    description: "Get answers to common questions about Khana Peena Ghar Se pickles, mustard oil purity, shelf life, delivery times, and transit damage guarantees.",
    canonical: "https://khanapeenagharse.in/faq",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Frequently Asked Questions (FAQs) - Khana Peena Ghar Se</h1>
        <p>Everything you need to know about our authentic mustard oil achars, ingredients, shelf life, and pan-India shipping.</p>
      </header>
      <main>
        ${faqs.map(f => `
          <article>
            <h2>${f.q}</h2>
            <p>${f.a}</p>
          </article>
        `).join("")}
      </main>
    `
  },
  {
    path: "/faqs",
    title: "Frequently Asked Questions (FAQs) | Khana Peena Ghar Se",
    description: "Get answers to common questions about Khana Peena Ghar Se pickles, mustard oil purity, shelf life, delivery times, and transit damage guarantees.",
    canonical: "https://khanapeenagharse.in/faq",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Frequently Asked Questions (FAQs) - Khana Peena Ghar Se</h1>
      </header>
      <main>
        ${faqs.map(f => `
          <article>
            <h2>${f.q}</h2>
            <p>${f.a}</p>
          </article>
        `).join("")}
      </main>
    `
  },
  {
    path: "/contact",
    title: "Contact Us & Kitchen Location | Khana Peena Ghar Se",
    description: "Contact Khana Peena Ghar Se. Kitchen location in Bahadurgarh, Haryana. WhatsApp support: +91 98123 89881. Email: khanapeena.ghar@gmail.com.",
    canonical: "https://khanapeenagharse.in/contact",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Contact Khana Peena Ghar Se</h1>
        <p>Kitchen Origin: D-Block, Line Par, Bahadurgarh, Jhajjar district, Haryana 124507, India</p>
        <p>Phone & WhatsApp Support: +91 98123 89881 | Email: khanapeena.ghar@gmail.com</p>
      </header>
    `
  },
  {
    path: "/track-order",
    title: "Track Your Order Live | Khana Peena Ghar Se",
    description: "Track your Khana Peena Ghar Se pickle order live. Enter your order number or phone number for real-time dispatch and delivery updates.",
    canonical: "https://khanapeenagharse.in/track-order",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Track Your Live Order - Khana Peena Ghar Se</h1>
        <p>Real-time delivery status for authentic handcrafted achar shipments across India.</p>
      </header>
    `
  },
  {
    path: "/sitemap",
    title: "Site Directory & Sitemap | Khana Peena Ghar Se",
    description: "Complete site directory and sitemap for Khana Peena Ghar Se artisanal pickles and kitchen preserves.",
    canonical: "https://khanapeenagharse.in/sitemap",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Khana Peena Ghar Se Sitemap & Directory</h1>
      </header>
      <main>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/achar">All Achars</a></li>
          <li><a href="/about">About Us</a></li>
          <li><a href="/faq">FAQs</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/track-order">Track Order</a></li>
          ${products.map(p => `<li><a href="/product/${p.slug}">${p.name}</a></li>`).join("")}
        </ul>
      </main>
    `
  },
  {
    path: "/whatsapp",
    title: "Connecting to WhatsApp | Khana Peena Ghar Se",
    description: "Opening direct WhatsApp chat with Rachna's kitchen in Bahadurgarh. Handcrafted homemade achars made with 100% pure mustard oil.",
    canonical: "https://khanapeenagharse.in/whatsapp",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <div class="page-shell" style="min-height: 65vh; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="text-align: center; padding: 40px 20px; max-width: 480px; margin: 0 auto;">
          <div style="font-size: 3.5rem; margin-bottom: 16px;">💬</div>
          <h1 style="font-size: 1.9rem; color: #0B2218; margin: 0 0 10px; font-weight: 700;">
            Connecting to WhatsApp...
          </h1>
          <p style="color: #4A5568; font-size: 1rem; line-height: 1.5; margin: 0 0 24px;">
            Opening direct WhatsApp chat with Rachna's kitchen in Bahadurgarh.
          </p>
          <a
            id="wa-direct-btn"
            href="https://wa.me/919812389881?text=Namaste%20Khana%20Peena%20Ghar%20Se!%20I%20would%20like%20to%20order%20fresh%20homemade%20achar%20from%20Bahadurgarh."
            style="background: #25D366; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 9999px; font-weight: 700; font-size: 1.05rem; display: inline-block; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.4);"
          >
            Open WhatsApp Now ↗
          </a>
          <script>
            (function() {
              try {
                var params = new URLSearchParams(window.location.search);
                var customMsg = params.get("msg") || params.get("text");
                var orderId = params.get("order");
                var productSlug = params.get("product") || params.get("item");
                var isCombo = params.get("combo");
                var isBulk = params.get("bulk");
                var msg = "Namaste Khana Peena Ghar Se! I would like to order fresh homemade achar from Bahadurgarh.";
                if (customMsg) {
                  msg = customMsg;
                } else if (orderId) {
                  msg = "Namaste Khana Peena Ghar Se! I would like to check the status of my Order #" + orderId + ".";
                } else if (productSlug) {
                  msg = "Namaste Khana Peena Ghar Se! I would like to order " + productSlug + ". Please share details.";
                } else if (isCombo) {
                  msg = "Namaste Khana Peena Ghar Se! I want to order The Ghar Ka Achar 4-in-1 Signature Combo Box (₹999).";
                } else if (isBulk) {
                  msg = "Namaste Khana Peena Ghar Se! I am interested in bulk orders / festive gifting hampers for homemade achars.";
                }
                var target = "https://wa.me/919812389881?text=" + encodeURIComponent(msg);
                var btn = document.getElementById("wa-direct-btn");
                if (btn) btn.href = target;
                setTimeout(function() {
                  window.location.replace(target);
                }, 350);
              } catch(e) {}
            })();
          </script>
        </div>
      </div>
    `
  },
  {
    path: "/wa",
    title: "Connecting to WhatsApp | Khana Peena Ghar Se",
    description: "Opening direct WhatsApp chat with Rachna's kitchen in Bahadurgarh. Handcrafted homemade achars made with 100% pure mustard oil.",
    canonical: "https://khanapeenagharse.in/whatsapp",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <div class="page-shell" style="min-height: 65vh; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="text-align: center; padding: 40px 20px; max-width: 480px; margin: 0 auto;">
          <div style="font-size: 3.5rem; margin-bottom: 16px;">💬</div>
          <h1 style="font-size: 1.9rem; color: #0B2218; margin: 0 0 10px; font-weight: 700;">
            Connecting to WhatsApp...
          </h1>
          <p style="color: #4A5568; font-size: 1rem; line-height: 1.5; margin: 0 0 24px;">
            Opening direct WhatsApp chat with Rachna's kitchen in Bahadurgarh.
          </p>
          <a
            id="wa-direct-btn-2"
            href="https://wa.me/919812389881?text=Namaste%20Khana%20Peena%20Ghar%20Se!%20I%20would%20like%20to%20order%20fresh%20homemade%20achar%20from%20Bahadurgarh."
            style="background: #25D366; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 9999px; font-weight: 700; font-size: 1.05rem; display: inline-block; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.4);"
          >
            Open WhatsApp Now ↗
          </a>
          <script>
            (function() {
              try {
                var params = new URLSearchParams(window.location.search);
                var customMsg = params.get("msg") || params.get("text");
                var orderId = params.get("order");
                var productSlug = params.get("product") || params.get("item");
                var isCombo = params.get("combo");
                var isBulk = params.get("bulk");
                var msg = "Namaste Khana Peena Ghar Se! I would like to order fresh homemade achar from Bahadurgarh.";
                if (customMsg) {
                  msg = customMsg;
                } else if (orderId) {
                  msg = "Namaste Khana Peena Ghar Se! I would like to check the status of my Order #" + orderId + ".";
                } else if (productSlug) {
                  msg = "Namaste Khana Peena Ghar Se! I would like to order " + productSlug + ". Please share details.";
                } else if (isCombo) {
                  msg = "Namaste Khana Peena Ghar Se! I want to order The Ghar Ka Achar 4-in-1 Signature Combo Box (₹999).";
                } else if (isBulk) {
                  msg = "Namaste Khana Peena Ghar Se! I am interested in bulk orders / festive gifting hampers for homemade achars.";
                }
                var target = "https://wa.me/919812389881?text=" + encodeURIComponent(msg);
                var btn = document.getElementById("wa-direct-btn-2");
                if (btn) btn.href = target;
                setTimeout(function() {
                  window.location.replace(target);
                }, 350);
              } catch(e) {}
            })();
          </script>
        </div>
      </div>
    `
  },
  {
    path: "/how-its-made",
    title: "How It's Made: Traditional Sun-Cured Achars | Khana Peena Ghar Se",
    description: "Discover our authentic, slow-cured achar making process in Bahadurgarh. 100% cold-pressed mustard oil, whole hand-roasted spices, zero chemical preservatives.",
    canonical: "https://khanapeenagharse.in/how-its-made",
    ogImage: "https://khanapeenagharse.in/images/brand/about-owner.jpg",
    content: `
      <header>
        <h1>How Our Authentic Achars Are Handcrafted</h1>
        <p>From sourcing farm-fresh raw mangoes and gajar-gobhi-shalgam to sun-curing on Bahadurgarh rooftops with 100% pure cold-pressed mustard oil.</p>
      </header>
    `
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | Khana Peena Ghar Se",
    description: "Khana Peena Ghar Se privacy policy: how we safeguard your personal details and order information.",
    canonical: "https://khanapeenagharse.in/privacy-policy",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Privacy Policy - Khana Peena Ghar Se</h1>
        <p>We respect your privacy and never sell or share your contact information.</p>
      </header>
    `
  },
  {
    path: "/terms",
    title: "Terms and Conditions | Khana Peena Ghar Se",
    description: "Terms and conditions of ordering artisanal homemade pickles from Khana Peena Ghar Se.",
    canonical: "https://khanapeenagharse.in/terms",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Terms and Conditions - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/terms-and-conditions",
    title: "Terms and Conditions | Khana Peena Ghar Se",
    description: "Terms and conditions of ordering artisanal homemade pickles from Khana Peena Ghar Se.",
    canonical: "https://khanapeenagharse.in/terms",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Terms and Conditions - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/shipping-policy",
    title: "Shipping & Transit Damage Policy | Khana Peena Ghar Se",
    description: "Pan-India delivery with shockproof packaging. 100% free immediate replacement jar if damaged in transit.",
    canonical: "https://khanapeenagharse.in/shipping-policy",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Shipping & Transit Guarantee - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/refund-policy",
    title: "Refund & Replacement Policy | Khana Peena Ghar Se",
    description: "100% customer satisfaction guarantee: free replacements or prompt refunds with zero hassle.",
    canonical: "https://khanapeenagharse.in/refund-policy",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Refund & Replacement Policy - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/returns",
    title: "Refund & Replacement Policy | Khana Peena Ghar Se",
    description: "100% customer satisfaction guarantee: free replacements or prompt refunds with zero hassle.",
    canonical: "https://khanapeenagharse.in/refund-policy",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Refund & Replacement Policy - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/contact-us",
    title: "Contact Us & Kitchen Location | Khana Peena Ghar Se",
    description: "Contact Khana Peena Ghar Se. Kitchen location in Bahadurgarh, Haryana. WhatsApp support: +91 98123 89881. Email: khanapeena.ghar@gmail.com.",
    canonical: "https://khanapeenagharse.in/contact",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Contact Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/shop",
    title: "All Handcrafted Achars & Pickles | Khana Peena Ghar Se",
    description: "Explore our collection of authentic homemade achars made with 100% pure cold-pressed mustard oil in Bahadurgarh.",
    canonical: "https://khanapeenagharse.in/achar",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>All Handcrafted Achars - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/cart",
    title: "Your Shopping Cart | Khana Peena Ghar Se",
    description: "Review your selected homemade achars and proceed to secure checkout.",
    canonical: "https://khanapeenagharse.in/cart",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Your Shopping Cart - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/checkout",
    title: "Secure Checkout | Khana Peena Ghar Se",
    description: "Complete your order for handcrafted artisanal pickles with doorstep pan-India delivery.",
    canonical: "https://khanapeenagharse.in/checkout",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Secure Checkout - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/account",
    title: "My Account & Member Portal | Khana Peena Ghar Se",
    description: "Sign in to manage your orders, delivery addresses, and account details.",
    canonical: "https://khanapeenagharse.in/account",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>My Account - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/login",
    title: "Member Sign In | Khana Peena Ghar Se",
    description: "Sign in to your Khana Peena Ghar Se account.",
    canonical: "https://khanapeenagharse.in/account",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Member Sign In - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/review",
    title: "Share Your Experience | Khana Peena Ghar Se",
    description: "Submit your honest review for Khana Peena Ghar Se handcrafted achars.",
    canonical: "https://khanapeenagharse.in/review",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Submit A Review - Khana Peena Ghar Se</h1>
      </header>
    `
  },
  {
    path: "/oauth/consent",
    title: "Authorize Application | Khana Peena Ghar Se",
    description: "OAuth Authorization Consent - Khana Peena Ghar Se",
    canonical: "https://khanapeenagharse.in/oauth/consent",
    ogImage: "https://khanapeenagharse.in/images/brand/home-hero.jpg",
    content: `
      <header>
        <h1>Authorize Application - Khana Peena Ghar Se</h1>
      </header>
    `
  }
];

// Product detail pages
products.forEach((p) => {
  const productImg = p.images?.[0] || p.image || "/images/brand/home-hero.jpg";
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.name,
    "image": `https://khanapeenagharse.in${productImg}`,
    "description": p.shortDescription || p.description,
    "sku": p.slug,
    "brand": {
      "@type": "Brand",
      "name": "Khana Peena Ghar Se"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://khanapeenagharse.in/product/${p.slug}`,
      "priceCurrency": "INR",
      "price": p.price,
      "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition"
    }
  };

  const productHtml = `
    <article>
      <header>
        <h1>${p.name} (${p.size})</h1>
        <p><strong>Price:</strong> ₹${p.price} (Free shipping on orders ₹499+)</p>
        <p><strong>Tagline:</strong> ${p.tagline}</p>
      </header>
      <section>
        <h2>About this Achar</h2>
        <p>${p.description}</p>
      </section>
      <section>
        <h2>Ingredients & Masalas</h2>
        <p>${p.ingredients.join(", ")}</p>
        <p><strong>Oil used:</strong> 100% Pure Cold-Pressed Kacchi Ghani Mustard Oil (Zero Palm Oil)</p>
      </section>
      <section>
        <h2>Serving Pairings & Suggestions</h2>
        <p>${p.pairings.join(", ")}</p>
      </section>
      <section>
        <h2>Storage & Shelf Life</h2>
        <p>${p.shelfLife}</p>
        <p>Store at room temperature in a dry pantry. Use a dry spoon. Never refrigerate.</p>
      </section>
      <section>
        <h2>Kitchen Location & Dispatch</h2>
        <p>Handcrafted by Rachna Gattani & family in Bahadurgarh, Jhajjar district, Haryana 124507. 100% transit damage replacement guarantee.</p>
      </section>
    </article>
  `;

  // Canonical /product/:slug route
  routes.push({
    path: `/product/${p.slug}`,
    title: `${p.name} (${p.size}) | Homemade Achar | Khana Peena Ghar Se`,
    description: p.shortDescription || p.description,
    canonical: `https://khanapeenagharse.in/product/${p.slug}`,
    ogImage: `https://khanapeenagharse.in${productImg}`,
    schema: productSchema,
    content: productHtml
  });

  // /achar/:slug alias route
  routes.push({
    path: `/achar/${p.slug}`,
    title: `${p.name} (${p.size}) | Homemade Achar | Khana Peena Ghar Se`,
    description: p.shortDescription || p.description,
    canonical: `https://khanapeenagharse.in/product/${p.slug}`,
    ogImage: `https://khanapeenagharse.in${productImg}`,
    schema: productSchema,
    content: productHtml
  });

  // Handle combo box slug alias
  if (p.slug === "ghar-ka-achar-box") {
    routes.push({
      path: `/product/the-ghar-ka-achar-box`,
      title: `${p.name} (${p.size}) | Homemade Achar | Khana Peena Ghar Se`,
      description: p.shortDescription || p.description,
      canonical: `https://khanapeenagharse.in/product/ghar-ka-achar-box`,
      ogImage: `https://khanapeenagharse.in${productImg}`,
      schema: productSchema,
      content: productHtml
    });
    routes.push({
      path: `/achar/the-ghar-ka-achar-box`,
      title: `${p.name} (${p.size}) | Homemade Achar | Khana Peena Ghar Se`,
      description: p.shortDescription || p.description,
      canonical: `https://khanapeenagharse.in/product/ghar-ka-achar-box`,
      ogImage: `https://khanapeenagharse.in${productImg}`,
      schema: productSchema,
      content: productHtml
    });
  }
});

function renderPage(baseHtml, route) {
  let html = baseHtml;

  // Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${route.title}</title>`);

  // Meta Description
  html = html.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${route.description.replace(/"/g, '&quot;')}" />`
  );

  // Canonical Link
  html = html.replace(
    /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
    `<link rel="canonical" href="${route.canonical}" />`
  );

  // Open Graph URL
  html = html.replace(
    /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:url" content="${route.canonical}" />`
  );

  // Open Graph Title
  html = html.replace(
    /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:title" content="${route.title.replace(/"/g, '&quot;')}" />`
  );

  // Open Graph Description
  html = html.replace(
    /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:description" content="${route.description.replace(/"/g, '&quot;')}" />`
  );

  // Open Graph Image
  if (route.ogImage) {
    html = html.replace(
      /<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:image" content="${route.ogImage}" />`
    );
  }

  // Twitter URL
  html = html.replace(
    /<meta\s+name=["']twitter:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="twitter:url" content="${route.canonical}" />`
  );

  // Twitter Title
  html = html.replace(
    /<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="twitter:title" content="${route.title.replace(/"/g, '&quot;')}" />`
  );

  // Twitter Description
  html = html.replace(
    /<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="twitter:description" content="${route.description.replace(/"/g, '&quot;')}" />`
  );

  // Twitter Image
  if (route.ogImage) {
    html = html.replace(
      /<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="twitter:image" content="${route.ogImage}" />`
    );
  }

  // Route-specific Schema.org injection
  if (route.schema) {
    const schemaTag = `\n    <script type="application/ld+json" id="prerendered-schema">\n${JSON.stringify(route.schema, null, 2)}\n    </script>\n`;
    html = html.replace("</head>", `${schemaTag}</head>`);
  }

  // Semantic Pre-rendered Content inside <div id="root">
  if (route.content) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${route.content}</div>`
    );
  }

  return html;
}

let generatedCount = 0;

for (const route of routes) {
  const rendered = renderPage(template, route);

  if (route.path === "/") {
    fs.writeFileSync(path.resolve(distDir, "index.html"), rendered, "utf-8");
  } else {
    const relativeCleanPath = route.path.replace(/^\/+/, "");
    
    // 1. Write as folder/index.html
    const targetFolder = path.resolve(distDir, relativeCleanPath);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    fs.writeFileSync(path.resolve(targetFolder, "index.html"), rendered, "utf-8");

    // 2. Write as folder.html (for cleanUrls resolution)
    const flatFile = path.resolve(distDir, `${relativeCleanPath}.html`);
    const flatParent = path.dirname(flatFile);
    if (!fs.existsSync(flatParent)) {
      fs.mkdirSync(flatParent, { recursive: true });
    }
    fs.writeFileSync(flatFile, rendered, "utf-8");
  }

  generatedCount++;
}

console.log(`✅ Prerender Pipeline complete: generated ${generatedCount} static route HTML files in dist/`);
