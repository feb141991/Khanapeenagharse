/* Cart & checkout (standalone HTML). Talks to Netlify Functions. */

const cartItemsNode = document.querySelector("#cart-items");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutStatus = document.querySelector("#checkout-status");
const checkoutSubmit = document.querySelector("#checkout-submit");

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function renderCart() {
  if (!cartItemsNode) return;

  const cart = window.KPStore.getCart();
  if (!cart.length) {
    cartItemsNode.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty.</p>
        <a class="button button-primary" href="${window.KPStore.sitePath("achar.html")}">Browse achar menu</a>
      </div>
    `;
    return;
  }

  const items = cart
    .map((entry) => ({ ...entry, product: window.KPStore.findProductBySlug(entry.slug) }))
    .filter((entry) => entry.product);

  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shipping = subtotal >= 799 ? 0 : 60;
  const total = subtotal + shipping;

  cartItemsNode.innerHTML = `
    <ul class="cart-lines" role="list">
      ${items.map((item) => `
        <li class="cart-line">
          <img class="cart-line-media" src="${item.product.image}" alt="${item.product.name}" onerror="this.onerror=null;this.src='${window.KPStore.sitePath("images/logo.png")}'">
          <div class="cart-line-copy">
            <strong>${item.product.name}</strong>
            <span class="muted">${item.product.size}</span>
            <button class="link-button" type="button" data-remove="${item.product.slug}">Remove</button>
          </div>
          <div class="qty-control" role="group" aria-label="Quantity for ${item.product.name}">
            <button type="button" data-qty="${item.product.slug}" data-change="-1" aria-label="Decrease">−</button>
            <span aria-live="polite">${item.quantity}</span>
            <button type="button" data-qty="${item.product.slug}" data-change="1" aria-label="Increase">+</button>
          </div>
          <strong class="cart-line-total">${formatCurrency(item.product.price * item.quantity)}</strong>
        </li>
      `).join("")}
    </ul>
    <div class="summary-block">
      <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "Free" : formatCurrency(shipping)}</span></div>
      <div class="summary-row summary-total"><strong>Total</strong><strong>${formatCurrency(total)}</strong></div>
      ${shipping > 0 ? `<p class="muted small">Free shipping on orders over ₹799.</p>` : ""}
    </div>
  `;
}

cartItemsNode?.addEventListener("click", (event) => {
  const qtyBtn = event.target.closest("[data-qty]");
  const removeBtn = event.target.closest("[data-remove]");

  if (qtyBtn) {
    const slug = qtyBtn.dataset.qty;
    const change = Number(qtyBtn.dataset.change);
    const current = window.KPStore.getCart().find((item) => item.slug === slug);
    if (!current) return;
    window.KPStore.updateCartQuantity(slug, current.quantity + change);
    renderCart();
  }

  if (removeBtn) {
    window.KPStore.removeFromCart(removeBtn.dataset.remove);
    renderCart();
  }
});

checkoutForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const cart = window.KPStore.getCart();
  if (!cart.length) {
    checkoutStatus.textContent = "Add at least one achar to the cart.";
    return;
  }

  if (!checkoutForm.reportValidity()) return;

  const formData = Object.fromEntries(new FormData(checkoutForm).entries());
  const items = cart.map((entry) => {
    const product = window.KPStore.findProductBySlug(entry.slug);
    return {
      slug: entry.slug,
      name: product.name,
      size: product.size,
      unitPrice: product.price,
      quantity: entry.quantity
    };
  });

  checkoutSubmit.disabled = true;
  checkoutSubmit.textContent = "Placing order…";
  checkoutStatus.textContent = "Sending order to the kitchen…";

  try {
    const response = await fetch("/.netlify/functions/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer: formData, items })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Order could not be placed.");

    window.KPStore.clearCart();
    checkoutStatus.innerHTML = `Order placed. Order number: <strong>${result.order.order_number}</strong>. We'll be in touch on ${formData.phone}.`;
    checkoutForm.reset();
    renderCart();
  } catch (error) {
    checkoutStatus.textContent = error.message;
  } finally {
    checkoutSubmit.disabled = false;
    checkoutSubmit.textContent = "Place order request";
  }
});

renderCart();
