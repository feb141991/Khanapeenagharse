/* Achar menu (standalone HTML) — renders the catalog grid and wishlist toggles. */

const catalogGrid = document.querySelector("#catalog-grid");

function spiceClass(value) {
  if (!value) return "";
  return `chip chip-${value.toLowerCase()}`;
}

function renderCard(product) {
  const wishlistActive = window.KPStore.isWishlisted(product.slug);
  const imgFallback = window.KPStore.sitePath("images/logo.png");
  return `
    <article class="catalog-card" data-slug="${product.slug}">
      <a class="catalog-card-media" href="${window.KPStore.sitePath(`products/${product.slug}.html`)}" aria-label="Open ${product.name}">
        <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='${imgFallback}'">
        <span class="catalog-card-size">${product.size}</span>
      </a>
      <div class="catalog-card-body">
        <div class="catalog-card-head">
          <h2>${product.name}</h2>
          <span class="price">₹${product.price}</span>
        </div>
        <p class="catalog-card-tagline">${product.tagline || product.shortDescription || ""}</p>
        <div class="chip-row">
          ${product.spice ? `<span class="${spiceClass(product.spice)}">${product.spice}</span>` : ""}
          <span class="chip chip-muted">${product.stock} in stock</span>
        </div>
        <div class="product-actions">
          <a class="button button-primary" href="${window.KPStore.sitePath(`products/${product.slug}.html`)}">Open product</a>
          <button class="button button-ghost" type="button" data-wishlist="${product.slug}" aria-pressed="${wishlistActive}">
            ${wishlistActive ? "Saved ✓" : "Save for later"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderGrid() {
  if (!catalogGrid) return;
  catalogGrid.innerHTML = window.KPStore.getProducts().map(renderCard).join("");
}

renderGrid();

catalogGrid?.addEventListener("click", (event) => {
  const target = event.target.closest("[data-wishlist]");
  if (!target) return;
  const slug = target.dataset.wishlist;
  window.KPStore.toggleWishlist(slug);
  const active = window.KPStore.isWishlisted(slug);
  target.setAttribute("aria-pressed", String(active));
  target.textContent = active ? "Saved ✓" : "Save for later";
});
