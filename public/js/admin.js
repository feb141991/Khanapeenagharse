const loginSection = document.querySelector("#admin-login");
const dashboardSection = document.querySelector("#admin-dashboard");
const loginForm = document.querySelector("#login-form");
const loginStatus = document.querySelector("#login-status");
const ordersStatus = document.querySelector("#orders-status");
const ordersTableBody = document.querySelector("#orders-table-body");
const inventoryTableBody = document.querySelector("#inventory-table-body");
const orderCount = document.querySelector("#order-count");
const refreshButton = document.querySelector("#refresh-orders");
const logoutButton = document.querySelector("#logout-admin");
const mediaGrid = document.querySelector("#media-grid");
const saveMediaButton = document.querySelector("#save-media");
const createProductForm = document.querySelector("#create-product-form");

const ADMIN_KEY_STORAGE = "kp_admin_key_v2";
let currentInventory = [];

function getAdminKey() {
  return window.sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

function setAdminKey(value) {
  window.sessionStorage.setItem(ADMIN_KEY_STORAGE, value);
}

function clearAdminKey() {
  window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
}

function renderMediaManager(items = currentInventory) {
  if (!mediaGrid) return;
  currentInventory = items;

  mediaGrid.innerHTML = items.map((product) => {
    const images = Array.isArray(product.gallery_images) && product.gallery_images.length
      ? product.gallery_images
      : (product.image_url ? [product.image_url] : []);

    return `
      <article class="media-card">
        <div class="media-card-top">
          <div>
            <h4>${product.name}</h4>
            <p>${product.slug}</p>
          </div>
          <span class="media-folder">${product.slug}/</span>
        </div>
        <label>
          Bucket object paths
          <textarea rows="6" data-media-id="${product.id}" data-media-slug="${product.slug}" placeholder="${product.slug}/cover.jpg&#10;${product.slug}/detail-1.jpg">${images.join("\n")}</textarea>
        </label>
      </article>
    `;
  }).join("");
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function showDashboard() {
  loginSection?.classList.add("hidden");
  dashboardSection?.classList.remove("hidden");
}

function showLogin() {
  dashboardSection?.classList.add("hidden");
  loginSection?.classList.remove("hidden");
}

function renderOrders(orders) {
  orderCount.textContent = `${orders.length} orders`;
  ordersTableBody.innerHTML = orders.length ? orders.map((order) => `
    <tr>
      <td>${order.order_number}<br><span>${new Date(order.created_at).toLocaleString("en-IN")}</span></td>
      <td>${order.customer_name}<br>${order.phone}</td>
      <td>${order.items_summary || ""}</td>
      <td>INR ${order.total_amount}</td>
      <td>
        <select data-order-id="${order.id}">
          ${["pending", "confirmed", "packing", "dispatched", "delivered", "cancelled"].map((status) => `
            <option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>
          `).join("")}
        </select>
      </td>
      <td><button class="button button-secondary" type="button" data-save-order="${order.id}">Save</button></td>
    </tr>
  `).join("") : `<tr><td colspan="6">No orders yet.</td></tr>`;
}

function renderInventory(items) {
  inventoryTableBody.innerHTML = items.length ? items.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.size_label}</td>
      <td><input type="number" min="0" value="${item.stock_quantity ?? 0}" data-stock-id="${item.id}"></td>
      <td><input type="number" min="0" value="${item.price ?? 0}" data-price-id="${item.id}"></td>
      <td><button class="button button-secondary" type="button" data-save-product="${item.id}">Save</button></td>
    </tr>
  `).join("") : `<tr><td colspan="5">No inventory rows yet.</td></tr>`;
}

async function fetchDashboard() {
  const adminKey = getAdminKey();
  if (!adminKey) return;

  ordersStatus.textContent = "Loading dashboard...";

  try {
    const response = await fetch("/.netlify/functions/admin-dashboard", {
      headers: { "x-admin-key": adminKey }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load admin data.");
    renderOrders(result.orders || []);
    renderInventory(result.inventory || []);
    renderMediaManager(result.inventory || []);
    ordersStatus.textContent = "";
  } catch (error) {
    ordersStatus.textContent = error.message;
    if (error.message.toLowerCase().includes("unauthorized")) {
      clearAdminKey();
      showLogin();
    }
  }
}

async function patchAdmin(payload) {
  const adminKey = getAdminKey();
  const response = await fetch("/.netlify/functions/admin-dashboard", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to update.");
  return result;
}

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = document.querySelector("#admin-password").value.trim();
  if (!password) {
    loginStatus.textContent = "Enter admin password.";
    return;
  }
  setAdminKey(password);
  loginStatus.textContent = "";
  showDashboard();
  fetchDashboard();
});

createProductForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.querySelector("#new-product-name").value.trim();
  const slugInput = document.querySelector("#new-product-slug");
  const slug = slugify(slugInput.value || name);
  const sizeLabel = document.querySelector("#new-product-size").value.trim();
  const price = Number(document.querySelector("#new-product-price").value);
  const stockQuantity = Number(document.querySelector("#new-product-stock").value);
  const description = document.querySelector("#new-product-description").value.trim();

  if (!name || !slug || !sizeLabel) {
    ordersStatus.textContent = "Enter product name, slug, and size label.";
    return;
  }

  try {
    ordersStatus.textContent = `Creating ${name}...`;
    await patchAdmin({ type: "create-product", name, slug, sizeLabel, price, stockQuantity, description });
    createProductForm.reset();
    slugInput.value = "";
    await fetchDashboard();
    ordersStatus.textContent = `Created ${name}. Upload images to the ${slug}/ folder in the Supabase bucket.`;
  } catch (error) {
    ordersStatus.textContent = error.message || "Unable to create product.";
  }
});

refreshButton?.addEventListener("click", fetchDashboard);
logoutButton?.addEventListener("click", () => {
  clearAdminKey();
  showLogin();
  ordersStatus.textContent = "";
});

saveMediaButton?.addEventListener("click", () => {
  try {
    const payloads = Array.from(document.querySelectorAll("[data-media-id]")).map((field) => {
      const paths = field.value
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean);

      return {
        id: field.dataset.mediaId,
        slug: field.dataset.mediaSlug,
        galleryImages: paths,
        imageUrl: paths[0] || null
      };
    });

    ordersStatus.textContent = "Saving product galleries...";
    Promise.all(payloads.map((payload) => patchAdmin({
      type: "media",
      id: payload.id,
      galleryImages: payload.galleryImages,
      imageUrl: payload.imageUrl
    }))).then(async () => {
      await fetchDashboard();
      ordersStatus.textContent = "Product galleries saved to the database.";
    }).catch((error) => {
      ordersStatus.textContent = error.message || "Unable to save product galleries.";
    });
  } catch (error) {
    ordersStatus.textContent = error.message || "Unable to save product galleries.";
  }
});

document.addEventListener("click", async (event) => {
  const orderButton = event.target.closest("[data-save-order]");
  const productButton = event.target.closest("[data-save-product]");

  try {
    if (orderButton) {
      const id = orderButton.dataset.saveOrder;
      const status = document.querySelector(`[data-order-id="${id}"]`).value;
      ordersStatus.textContent = `Updating order ${id}...`;
      await patchAdmin({ type: "order", id, status });
      await fetchDashboard();
      ordersStatus.textContent = `Order ${id} updated.`;
    }

    if (productButton) {
      const id = productButton.dataset.saveProduct;
      const stock = Number(document.querySelector(`[data-stock-id="${id}"]`).value);
      const price = Number(document.querySelector(`[data-price-id="${id}"]`).value);
      ordersStatus.textContent = `Updating product ${id}...`;
      await patchAdmin({ type: "inventory", id, stockQuantity: stock, price });
      await fetchDashboard();
      ordersStatus.textContent = `Product ${id} updated.`;
    }
  } catch (error) {
    ordersStatus.textContent = error.message;
  }
});

if (getAdminKey()) {
  showDashboard();
  fetchDashboard();
}
