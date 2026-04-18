const productLayout = document.querySelector("#product-layout");
const slug = document.body.dataset.productSlug;
const product = window.KPStore.findProductBySlug(slug);

if (productLayout && product) {
  productLayout.innerHTML = `
    <div class="product-media">
      <img src="${product.image}" alt="${product.name}" onerror="this.src='${window.KPStore.sitePath("images/logo.png")}'">
      <div class="product-tags">
        <span>${product.size}</span>
        <span>INR ${product.price}</span>
        <span>${product.stock} in stock</span>
      </div>
    </div>
    <div class="product-copy">
      <p class="eyebrow">Single product page</p>
      <h1>${product.name}</h1>
      <p>${product.description}</p>
      <div class="product-tags">
        ${product.ingredients.map((ingredient) => `<span>${ingredient}</span>`).join("")}
      </div>
      <p>${product.deliveryNote}</p>
      <form class="stack-form" id="product-form">
        <label>Quantity
          <select name="quantity">
            <option value="1">1 jar</option>
            <option value="2">2 jars</option>
            <option value="3">3 jars</option>
            <option value="4">4 jars</option>
          </select>
        </label>
        <div class="product-actions">
          <button class="button button-primary" type="submit">Add to cart</button>
          <button class="button button-secondary" type="button" id="wishlist-toggle">
            ${window.KPStore.isWishlisted(product.slug) ? "Remove wishlist" : "Save wishlist"}
          </button>
        </div>
        <p class="form-status" id="product-status"></p>
      </form>
    </div>
  `;

  const form = document.querySelector("#product-form");
  const status = document.querySelector("#product-status");
  const wishlistToggle = document.querySelector("#wishlist-toggle");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const quantity = Number(new FormData(form).get("quantity"));
    window.KPStore.addToCart(product.slug, quantity);
    status.textContent = "Added to cart.";
  });

  wishlistToggle?.addEventListener("click", () => {
    window.KPStore.toggleWishlist(product.slug);
    wishlistToggle.textContent = window.KPStore.isWishlisted(product.slug) ? "Remove wishlist" : "Save wishlist";
  });
}
