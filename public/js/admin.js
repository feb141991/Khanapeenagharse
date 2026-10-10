const loginSection = document.querySelector("#admin-login");
const dashboardSection = document.querySelector("#admin-dashboard");
const loginForm = document.querySelector("#login-form");
const loginStatus = document.querySelector("#login-status");
const ordersStatus = document.querySelector("#orders-status");
const dashboardSummary = document.querySelector("#dashboard-summary");

const ordersTableBody = document.querySelector("#orders-table-body");
const crmTableBody = document.querySelector("#crm-table-body");
const reviewsContainer = document.querySelector("#reviews-queue-container");
const inventoryTableBody = document.querySelector("#inventory-table-body");
const mediaGrid = document.querySelector("#media-grid");

const refreshButton = document.querySelector("#refresh-all");
const logoutButton = document.querySelector("#logout-admin");
const saveMediaButton = document.querySelector("#save-media");
const createProductForm = document.querySelector("#create-product-form");
const crmSearchInput = document.querySelector("#crm-search-input");

const badgeOrdersCount = document.querySelector("#badge-orders-count");
const badgeCrmCount = document.querySelector("#badge-crm-count");
const badgeReviewsPending = document.querySelector("#badge-reviews-pending");

const ADMIN_KEY_STORAGE = "kp_admin_key_v2";
let currentInventory = [];
let cachedCustomers = [];
let cachedReviews = [];
let activeReviewFilter = "all";

function getAdminKey() {
  return window.sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

function setAdminKey(value) {
  window.sessionStorage.setItem(ADMIN_KEY_STORAGE, value);
}

function clearAdminKey() {
  window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
}

function showDashboard() {
  loginSection?.classList.add("hidden");
  dashboardSection?.classList.remove("hidden");
}

function showLogin() {
  dashboardSection?.classList.add("hidden");
  loginSection?.classList.remove("hidden");
}

// Tab Switching
document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".admin-tab-panel").forEach((p) => p.classList.add("hidden"));

    btn.classList.add("active");
    const tabName = btn.dataset.tab;
    const targetPanel = document.querySelector(`#panel-${tabName}`);
    if (targetPanel) targetPanel.classList.remove("hidden");
  });
});

// Render Orders
function renderOrders(orders) {
  if (badgeOrdersCount) badgeOrdersCount.textContent = orders.length;
  ordersTableBody.innerHTML = orders.length ? orders.map((order) => {
    const isDelivered = order.status === "delivered";
    const cleanPhone = String(order.phone || "").replace(/\D/g, "").slice(-10);
    const firstName = order.customer_name?.split(" ")[0] || "Customer";
    
    // WhatsApp review invite button
    let feedbackAction = `<span style="font-size:11px; color:var(--muted);">Set status to 'delivered'</span>`;
    if (order.review_request?.token) {
      const reviewUrl = `${window.location.origin}/review?token=${order.review_request.token}`;
      const msg = `Namaste ${firstName} ji! 🙏 Rachna and our kitchen team hope you loved your fresh achar batch. Could you share a quick rating? Rate your jar here: ${reviewUrl}`;
      const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
      feedbackAction = `
        <a href="${waUrl}" target="_blank" rel="noreferrer" class="button-whatsapp" title="Send WhatsApp review request">
          📲 WhatsApp Link
        </a>
      `;
    } else if (isDelivered) {
      feedbackAction = `
        <button class="button button-sm button-secondary" type="button" data-generate-invite="${order.id}" data-cust-id="${order.customer_id}">
          Generate Link
        </button>
      `;
    }

    return `
      <tr>
        <td><strong>${order.order_number}</strong><br><span style="font-size:11px; color:var(--muted);">${new Date(order.created_at).toLocaleString("en-IN")}</span></td>
        <td><strong>${order.customer_name}</strong><br><a href="tel:${order.phone}" style="font-size:12px; color:var(--heritage-green);">${order.phone}</a></td>
        <td style="max-width:220px; font-size:12px;">${order.items_summary || "Standard Batch"}</td>
        <td><strong>₹${order.total_amount}</strong></td>
        <td>
          <select data-order-id="${order.id}" style="font-weight:600;">
            ${["pending", "confirmed", "packing", "dispatched", "delivered", "cancelled"].map((status) => `
              <option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>
            `).join("")}
          </select>
        </td>
        <td><button class="button button-secondary button-sm" type="button" data-save-order="${order.id}">Save</button></td>
        <td>${feedbackAction}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="7">No orders placed yet.</td></tr>`;
}

// Render CRM Customers
function renderCrm(customers = cachedCustomers) {
  if (badgeCrmCount) badgeCrmCount.textContent = customers.length;
  
  crmTableBody.innerHTML = customers.length ? customers.map((c) => {
    let tierClass = "badge-new";
    if (c.tier === "VIP Heirloom Patron") tierClass = "badge-vip";
    else if (c.tier === "Repeat Customer") tierClass = "badge-repeat";

    const notesHtml = (c.notes || []).map((n) => `
      <div class="crm-note-item">
        <strong>${n.staff_name}:</strong> ${n.note} <span style="font-size:10px; color:var(--muted);">(${new Date(n.created_at).toLocaleDateString("en-IN")})</span>
      </div>
    `).join("");

    const cleanPhone = String(c.phone || "").replace(/\D/g, "").slice(-10);
    const waChatUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Namaste ${c.full_name.split(" ")[0]} ji! From Khana Peena Ghar Se family kitchen:`)}`;

    return `
      <tr>
        <td><strong>${c.full_name}</strong></td>
        <td><a href="tel:${c.phone}" style="font-size:12px;">${c.phone}</a><br><span style="font-size:11px; color:var(--muted);">${c.email || ""}</span></td>
        <td>${c.city || "—"}</td>
        <td><strong>${c.total_orders}</strong></td>
        <td><strong>₹${c.lifetime_value}</strong></td>
        <td><span class="badge-tier ${tierClass}">${c.tier}</span></td>
        <td style="max-width:260px;">
          <div class="crm-notes-box">
            ${notesHtml || "<span style='color:var(--muted);'>No kitchen notes yet.</span>"}
          </div>
          <div style="display:flex; gap:4px; margin-top:6px;">
            <input type="text" placeholder="Add kitchen note..." data-note-input="${c.id}" style="min-height:28px; font-size:11px; padding:4px 8px; flex:1;">
            <button class="button button-secondary button-sm" type="button" data-save-note="${c.id}">Save</button>
          </div>
        </td>
        <td>
          <a href="${waChatUrl}" target="_blank" rel="noreferrer" class="button-whatsapp" title="Direct WhatsApp Chat">
            💬 WhatsApp
          </a>
        </td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="8">No customers found.</td></tr>`;
}

// Render Review Screening Queue
function renderReviews(reviews = cachedReviews) {
  let filtered = reviews;
  if (activeReviewFilter !== "all") {
    filtered = reviews.filter((r) => r.status === activeReviewFilter);
  }

  const pendingCount = reviews.filter((r) => r.status === "pending_screening").length;
  if (badgeReviewsPending) badgeReviewsPending.textContent = pendingCount;

  reviewsContainer.innerHTML = filtered.length ? filtered.map((r) => {
    const stars = "★".repeat(Number(r.rating || 5)) + "☆".repeat(5 - Number(r.rating || 5));
    const statusLabel = r.status.replace("_", " ").toUpperCase();

    return `
      <article class="review-mod-card ${r.status}">
        <div class="review-mod-head">
          <div>
            <div class="review-mod-stars">${stars}</div>
            <h4 style="margin:4px 0 2px; font-size:1.05rem;">${r.title || "Customer Experience"}</h4>
            <div class="review-mod-meta">
              By <strong>${r.customer_display_name}</strong> (${r.customer_city || "India"}) 
              • Product: <strong>${r.product_slug}</strong> 
              • Submitted: ${new Date(r.created_at).toLocaleString("en-IN")}
              ${r.is_verified_buyer ? ' • <span style="color:#1F4A3A; font-weight:700;">✓ Verified Buyer</span>' : ''}
            </div>
          </div>
          <div>
            <span class="badge-tier ${r.status === 'approved' ? 'badge-repeat' : r.status === 'featured' ? 'badge-vip' : r.status === 'rejected' ? 'badge-new' : ''}">${statusLabel}</span>
          </div>
        </div>

        <div class="review-mod-body">
          "${r.comment}"
        </div>

        ${r.screening_notes ? `<div style="font-size:12px; color:#DC2626;"><strong>Moderator Note:</strong> ${r.screening_notes}</div>` : ''}

        <div class="review-mod-actions">
          ${r.status !== 'approved' ? `
            <button class="button button-sm button-approve" type="button" data-review-action="approve" data-review-id="${r.id}">
              ✓ Approve &amp; Publish
            </button>
          ` : ''}
          ${r.status !== 'featured' ? `
            <button class="button button-sm button-feature" type="button" data-review-action="feature" data-review-id="${r.id}">
              ★ Feature on Storefront
            </button>
          ` : ''}
          ${r.status !== 'rejected' ? `
            <button class="button button-sm button-reject" type="button" data-review-action="reject" data-review-id="${r.id}">
              ✕ Reject
            </button>
          ` : ''}
          <button class="button button-sm button-secondary" type="button" data-review-sanitize="${r.id}" data-current-name="${r.customer_display_name}" data-current-city="${r.customer_city || ''}">
            ✏️ Mask PII / Edit Name
          </button>
        </div>
      </article>
    `;
  }).join("") : `<div style="padding:30px; text-align:center; color:var(--muted); background:var(--cream); border-radius:8px;">No reviews in this category.</div>`;
}

// Render Inventory
function renderInventory(items) {
  inventoryTableBody.innerHTML = items.length ? items.map((item) => `
    <tr>
      <td><strong>${item.name}</strong><br><span style="font-size:11px; color:var(--muted);">${item.slug}</span></td>
      <td>${item.size_label}</td>
      <td><input type="number" min="0" value="${item.stock_quantity ?? 0}" data-stock-id="${item.id}" style="width:80px;"></td>
      <td><input type="number" min="0" value="${item.price ?? 0}" data-price-id="${item.id}" style="width:90px;"></td>
      <td><button class="button button-secondary button-sm" type="button" data-save-product="${item.id}">Save</button></td>
    </tr>
  `).join("") : `<tr><td colspan="5">No products found.</td></tr>`;
}

// Render Media Manager
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
          <span class="media-folder">/images/achars/${product.slug}/</span>
        </div>
        <label>
          Image paths (one per line)
          <textarea rows="5" data-media-id="${product.id}" data-media-slug="${product.slug}">${images.join("\n")}</textarea>
        </label>
      </article>
    `;
  }).join("");
}

// Fetch Full Dashboard Data
async function fetchAllData() {
  const adminKey = getAdminKey();
  if (!adminKey) return;

  ordersStatus.textContent = "Loading kitchen console data...";

  try {
    const [dashRes, crmRes, revRes] = await Promise.all([
      fetch("/api/admin-dashboard", { headers: { "x-admin-key": adminKey } }),
      fetch("/api/crm", { headers: { "x-admin-key": adminKey } }),
      fetch("/api/reviews-admin", { headers: { "x-admin-key": adminKey } })
    ]);

    const dashData = await dashRes.json();
    const crmData = await crmRes.json();
    const revData = await revRes.json();

    if (!dashRes.ok) throw new Error(dashData.error || "Dashboard error");

    renderOrders(dashData.orders || []);
    renderInventory(dashData.inventory || []);
    renderMediaManager(dashData.inventory || []);

    if (crmRes.ok) {
      cachedCustomers = crmData.customers || [];
      renderCrm(cachedCustomers);
    }

    if (revRes.ok) {
      cachedReviews = revData.reviews || [];
      renderReviews(cachedReviews);
    }

    if (dashboardSummary) {
      const pendingRevs = (cachedReviews || []).filter(r => r.status === "pending_screening").length;
      dashboardSummary.textContent = `${(dashData.orders || []).length} orders • ${cachedCustomers.length} customers • ${pendingRevs} pending review screenings`;
    }

    ordersStatus.textContent = "";
  } catch (error) {
    ordersStatus.textContent = error.message;
    if (error.message.toLowerCase().includes("unauthorized")) {
      clearAdminKey();
      showLogin();
    }
  }
}

// Patch Admin Call
async function patchAdmin(payload) {
  const adminKey = getAdminKey();
  const response = await fetch("/api/admin-dashboard", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Update failed");
  return result;
}

// CRM Search Filter
crmSearchInput?.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) {
    renderCrm(cachedCustomers);
    return;
  }
  const filtered = cachedCustomers.filter((c) =>
    c.full_name?.toLowerCase().includes(q) ||
    c.phone?.includes(q) ||
    c.city?.toLowerCase().includes(q)
  );
  renderCrm(filtered);
});

// Review Filters
document.querySelectorAll(".filter-review-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-review-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeReviewFilter = btn.dataset.filter;
    renderReviews(cachedReviews);
  });
});

// Click Handlers
document.addEventListener("click", async (event) => {
  const adminKey = getAdminKey();
  if (!adminKey) return;

  // Save Order Status
  const orderButton = event.target.closest("[data-save-order]");
  if (orderButton) {
    const id = orderButton.dataset.saveOrder;
    const status = document.querySelector(`[data-order-id="${id}"]`).value;
    ordersStatus.textContent = `Updating order ${id}...`;
    try {
      const result = await patchAdmin({ type: "order", id, status });
      await fetchAllData();
      ordersStatus.textContent = `Order ${id} status saved to ${status}.`;
      if (result.reviewInvite?.whatsappUrl) {
        window.open(result.reviewInvite.whatsappUrl, "_blank");
      }
    } catch (err) {
      ordersStatus.textContent = err.message;
    }
  }

  // Generate Review Invite Manually
  const inviteBtn = event.target.closest("[data-generate-invite]");
  if (inviteBtn) {
    const orderId = inviteBtn.dataset.generateInvite;
    const customerId = inviteBtn.dataset.custId;
    try {
      ordersStatus.textContent = "Generating 1-click review link...";
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action: "generate-review-invite", orderId, customerId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invite generation failed");
      await fetchAllData();
      window.open(data.whatsappUrl, "_blank");
    } catch (err) {
      ordersStatus.textContent = err.message;
    }
  }

  // Save Inventory
  const productButton = event.target.closest("[data-save-product]");
  if (productButton) {
    const id = productButton.dataset.saveProduct;
    const stock = Number(document.querySelector(`[data-stock-id="${id}"]`).value);
    const price = Number(document.querySelector(`[data-price-id="${id}"]`).value);
    ordersStatus.textContent = `Updating stock for product ${id}...`;
    try {
      await patchAdmin({ type: "inventory", id, stockQuantity: stock, price });
      await fetchAllData();
      ordersStatus.textContent = `Product ${id} updated successfully.`;
    } catch (err) {
      ordersStatus.textContent = err.message;
    }
  }

  // Save CRM Kitchen Note
  const noteBtn = event.target.closest("[data-save-note]");
  if (noteBtn) {
    const customerId = noteBtn.dataset.saveNote;
    const input = document.querySelector(`[data-note-input="${customerId}"]`);
    const noteText = input?.value?.trim();
    if (!noteText) return;
    try {
      ordersStatus.textContent = `Saving kitchen note for customer ${customerId}...`;
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action: "add-note", customerId, note: noteText, staffName: "Kitchen Staff" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Note saving failed");
      input.value = "";
      await fetchAllData();
      ordersStatus.textContent = "Kitchen note saved.";
    } catch (err) {
      ordersStatus.textContent = err.message;
    }
  }

  // Review Moderation Actions
  const reviewActionBtn = event.target.closest("[data-review-action]");
  if (reviewActionBtn) {
    const action = reviewActionBtn.dataset.reviewAction;
    const id = reviewActionBtn.dataset.reviewId;
    let screeningNotes = "";
    if (action === "reject") {
      screeningNotes = prompt("Enter reason for rejection (internal):") || "Rejected by moderator";
    }
    try {
      ordersStatus.textContent = `Applying action '${action}' to review ${id}...`;
      const res = await fetch("/api/reviews-admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id, action, screeningNotes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      await fetchAllData();
      ordersStatus.textContent = `Review ${id} marked as ${action}.`;
    } catch (err) {
      ordersStatus.textContent = err.message;
    }
  }

  // Sanitize PII in review
  const sanitizeBtn = event.target.closest("[data-review-sanitize]");
  if (sanitizeBtn) {
    const id = sanitizeBtn.dataset.reviewSanitize;
    const currentName = sanitizeBtn.dataset.currentName;
    const currentCity = sanitizeBtn.dataset.currentCity;
    const newName = prompt("Sanitize customer display name (e.g. 'Aarav S.'):", currentName);
    if (newName !== null) {
      const newCity = prompt("Customer City:", currentCity) || "India";
      try {
        ordersStatus.textContent = "Sanitizing review PII...";
        const res = await fetch("/api/reviews-admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ id, action: "sanitize", customerDisplayName: newName, customerCity: newCity })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Sanitizing failed");
        await fetchAllData();
        ordersStatus.textContent = "Review display details updated.";
      } catch (err) {
        ordersStatus.textContent = err.message;
      }
    }
  }
});

// Create Product Form
createProductForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const payload = {
    type: "create-product",
    name: String(formData.get("name") || "").trim(),
    slug: String(formData.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    sizeLabel: String(formData.get("sizeLabel") || "").trim(),
    price: Number(formData.get("price") || 0),
    stockQuantity: Number(formData.get("stockQuantity") || 0)
  };
  try {
    ordersStatus.textContent = `Creating ${payload.name}...`;
    await patchAdmin(payload);
    e.currentTarget.reset();
    await fetchAllData();
    ordersStatus.textContent = `${payload.name} created successfully!`;
  } catch (err) {
    ordersStatus.textContent = err.message;
  }
});

// Save Media Galleries
saveMediaButton?.addEventListener("click", async () => {
  try {
    const payloads = Array.from(document.querySelectorAll("[data-media-id]")).map((field) => {
      const paths = field.value.split("\n").map((v) => v.trim()).filter(Boolean);
      return {
        id: field.dataset.mediaId,
        slug: field.dataset.mediaSlug,
        galleryImages: paths,
        imageUrl: paths[0] || null
      };
    });
    ordersStatus.textContent = "Saving product galleries...";
    await Promise.all(payloads.map((p) => patchAdmin({
      type: "media",
      id: p.id,
      galleryImages: p.galleryImages,
      imageUrl: p.imageUrl
    })));
    await fetchAllData();
    ordersStatus.textContent = "Product media galleries saved to database.";
  } catch (err) {
    ordersStatus.textContent = err.message;
  }
});

// Login and Session
loginForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const password = document.querySelector("#admin-password").value.trim();
  if (!password) {
    loginStatus.textContent = "Enter admin password.";
    return;
  }
  setAdminKey(password);
  loginStatus.textContent = "";
  showDashboard();
  fetchAllData();
});

refreshButton?.addEventListener("click", fetchAllData);
logoutButton?.addEventListener("click", () => {
  clearAdminKey();
  showLogin();
  ordersStatus.textContent = "";
});

if (getAdminKey()) {
  showDashboard();
  fetchAllData();
}
