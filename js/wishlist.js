const wishlistGrid = document.querySelector("#wishlist-grid");
const wishlistProducts = window.KPStore.getWishlist()
  .map((slug) => window.KPStore.findProductBySlug(slug))
  .filter(Boolean);

if (wishlistGrid) {
  if (!wishlistProducts.length) {
    wishlistGrid.innerHTML = `<div class="catalog-card"><h2>No saved flavours yet.</h2><p>Save products from the achar menu or any product page.</p></div>`;
  } else {
    wishlistGrid.innerHTML = wishlistProducts.map((product) => `
      <article class="catalog-card">
        <img src="${product.image}" alt="${product.name}" onerror="this.src='${window.KPStore.sitePath("images/logo.png")}'">
        <span class="card-kicker">${product.size}</span>
        <h2>${product.name}</h2>
        <p>${product.description}</p>
        <div class="product-actions">
          <a class="button button-primary" href="${window.KPStore.sitePath(`products/${product.slug}.html`)}">Open product</a>
          <button class="button button-ghost" type="button" data-remove="${product.slug}">Remove</button>
        </div>
      </article>
    `).join("");

    wishlistGrid.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove]");
      if (!removeButton) return;
      window.KPStore.toggleWishlist(removeButton.dataset.remove);
      window.location.reload();
    });
  }
}
