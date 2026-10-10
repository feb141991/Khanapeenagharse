/**
 * Khana Peena Ghar Se — Kitchen Operations & CRM Portal v2.4
 * Enhanced Executive UI • Real-Time Diagnostics • Toast Notifications
 */

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
const ordersSearchInput = document.querySelector("#orders-search-input");

const badgeOrdersCount = document.querySelector("#badge-orders-count");
const badgeCrmCount = document.querySelector("#badge-crm-count");
const badgeReviewsPending = document.querySelector("#badge-reviews-pending");

// KPI Elements
const statOrdersTotal = document.querySelector("#stat-orders-total");
const statCrmTotal = document.querySelector("#stat-crm-total");
const statReviewsPending = document.querySelector("#stat-reviews-pending");
const statInventorySkus = document.querySelector("#stat-inventory-skus");
const statSystemHealth = document.querySelector("#stat-system-health");

// Diagnostics Elements
const diagnosticsTerminal = document.querySelector("#diagnostics-terminal");
const btnRunDiagnostics = document.querySelector("#btn-run-diagnostics");
const btnClearLogs = document.querySelector("#btn-clear-logs");
const diagAuthStatus = document.querySelector("#diag-auth-status");
const diagDbStatus = document.querySelector("#diag-db-status");
const diagAvgLatency = document.querySelector("#diag-avg-latency");

// Password & Key Helpers
const togglePasswordBtn = document.querySelector("#toggle-password-btn");
const adminPasswordInput = document.querySelector("#admin-password");
const pwdIcon = document.querySelector("#pwd-icon");
const fillDefaultKeyBtn = document.querySelector("#fill-default-key-btn");
const toastContainer = document.querySelector("#admin-toast-container");

// Packing Slip & CSV Elements
const btnExportOrdersCsv = document.querySelector("#btn-export-orders-csv");
const packingSlipModal = document.querySelector("#packing-slip-modal");
const printableSlipContent = document.querySelector("#printable-slip-content");
const btnPrintSlipAction = document.querySelector("#btn-print-slip-action");
const btnCloseSlipModal = document.querySelector("#btn-close-slip-modal");

const ADMIN_KEY_STORAGE = "kp_admin_key_v2";
const DEFAULT_KEY_HINT = "kp_admin_secret_key";

let currentInventory = [];
let cachedOrders = [];
let cachedCustomers = [];
let cachedReviews = [];
let activeReviewFilter = "all";
let activeOrderFilter = "all";

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = "success") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `admin-toast ${type === "error" ? "toast-error" : "toast-success"}`;
  
  const icon = type === "error" ? "⚠️" : "✓";
  toast.innerHTML = `<span style="font-size:16px;">${icon}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px) scale(0.95)";
    setTimeout(() => toast.remove(), 220);
  }, 3500);
}

// ==========================================
// CLIENT-SIDE REAL-TIME DIAGNOSTICS LOGGING
// ==========================================
function logDiag(message, level = "info") {
  const timestamp = new Date().toLocaleTimeString("en-IN", { hour12: false });
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](`[KitchenConsole ${timestamp}] ${message}`);

  if (diagnosticsTerminal) {
    const line = document.createElement("div");
    line.className = `terminal-line ${level}`;
    line.textContent = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    diagnosticsTerminal.appendChild(line);
    diagnosticsTerminal.scrollTop = diagnosticsTerminal.scrollHeight;
  }
}

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

// ==========================================
// PASSWORD TOGGLE & QUICK FILL
// ==========================================
togglePasswordBtn?.addEventListener("click", () => {
  if (!adminPasswordInput) return;
  const isPassword = adminPasswordInput.type === "password";
  adminPasswordInput.type = isPassword ? "text" : "password";
  if (pwdIcon) pwdIcon.textContent = isPassword ? "🙈" : "👁️";
});

fillDefaultKeyBtn?.addEventListener("click", () => {
  if (adminPasswordInput) {
    adminPasswordInput.value = DEFAULT_KEY_HINT;
    showToast("Default verified secret key loaded!", "success");
    adminPasswordInput.focus();
  }
});

// ==========================================
// TAB SWITCHING
// ==========================================
document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".admin-tab-panel").forEach((p) => p.classList.add("hidden"));

    btn.classList.add("active");
    const tabName = btn.dataset.tab;
    const targetPanel = document.querySelector(`#panel-${tabName}`);
    if (targetPanel) targetPanel.classList.remove("hidden");
    logDiag(`Navigated to tab: ${tabName}`);
  });
});

// ==========================================
// ORDERS RENDERING & FILTERING
// ==========================================
function filterAndRenderOrders() {
  let list = cachedOrders;
  const q = ordersSearchInput?.value?.toLowerCase().trim();

  if (q) {
    list = list.filter((o) =>
      String(o.order_number || "").toLowerCase().includes(q) ||
      String(o.customer_name || "").toLowerCase().includes(q) ||
      String(o.phone || "").includes(q) ||
      String(o.items_summary || "").toLowerCase().includes(q)
    );
  }

  if (activeOrderFilter !== "all") {
    list = list.filter((o) => o.status === activeOrderFilter);
  }

  renderOrdersTable(list);
}

function renderOrdersTable(orders) {
  if (badgeOrdersCount) badgeOrdersCount.textContent = cachedOrders.length;
  if (statOrdersTotal) statOrdersTotal.textContent = cachedOrders.length;

  if (!orders.length) {
    ordersTableBody.innerHTML = `<tr><td colspan="8" class="loading-cell">No matching orders found.</td></tr>`;
    return;
  }

  ordersTableBody.innerHTML = orders.map((order) => {
    const isDelivered = order.status === "delivered";
    const cleanPhone = String(order.phone || "").replace(/\D/g, "").slice(-10);
    const firstName = order.customer_name?.split(" ")[0] || "Customer";

    let feedbackAction = `<span style="font-size:11px; color:var(--muted);">Set status to 'delivered'</span>`;
    if (order.review_request?.token) {
      const reviewUrl = `${window.location.origin}/review?token=${order.review_request.token}`;
      const msg = `Namaste ${firstName} ji! 🙏 Rachna and our kitchen team hope you loved your fresh achar batch. Could you share a quick rating? Rate your jar here: ${reviewUrl}`;
      const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
      feedbackAction = `
        <a href="${waUrl}" target="_blank" rel="noreferrer" class="button-whatsapp" title="Send WhatsApp review invite">
          💬 WhatsApp Invite
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
        <td>
          <strong>${order.order_number}</strong><br>
          <span style="font-size:11px; color:var(--muted);">${new Date(order.created_at).toLocaleString("en-IN")}</span>
        </td>
        <td>
          <strong>${order.customer_name}</strong><br>
          <a href="tel:${order.phone}" style="font-size:12px; color:#166534; font-weight:600;">${order.phone}</a>
        </td>
        <td style="max-width:220px; font-size:12px;">${order.items_summary || "Standard Batch"}</td>
        <td><strong>₹${order.total_amount}</strong></td>
        <td>
          <select data-order-id="${order.id}" style="font-weight:600; padding:4px 8px; border-radius:8px; border:1px solid rgba(31,26,18,0.2);">
            ${["pending", "confirmed", "packing", "dispatched", "delivered", "cancelled"].map((status) => `
              <option value="${status}" ${order.status === status ? "selected" : ""}>${status.toUpperCase()}</option>
            `).join("")}
          </select>
        </td>
        <td>
          <button class="button button-secondary button-sm" type="button" data-save-order="${order.id}">Save</button>
        </td>
        <td>
          <button class="button button-ghost button-sm" type="button" data-print-slip="${order.id}" title="Generate printable packing slip">
            🖨️ Slip
          </button>
        </td>
        <td>${feedbackAction}</td>
      </tr>
    `;
  }).join("");
}

// Order Search Listener
ordersSearchInput?.addEventListener("input", filterAndRenderOrders);

// Order Status Filters
document.querySelectorAll(".filter-order-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-order-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeOrderFilter = btn.dataset.orderFilter;
    filterAndRenderOrders();
  });
});

// ==========================================
// CSV EXPORT FOR KITCHEN DISPATCH
// ==========================================
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function exportOrdersToCSV() {
  let list = cachedOrders;
  const q = ordersSearchInput?.value?.toLowerCase().trim();
  if (q) {
    list = list.filter((o) =>
      String(o.order_number || "").toLowerCase().includes(q) ||
      String(o.customer_name || "").toLowerCase().includes(q) ||
      String(o.phone || "").includes(q) ||
      String(o.items_summary || "").toLowerCase().includes(q)
    );
  }
  if (activeOrderFilter !== "all") {
    list = list.filter((o) => o.status === activeOrderFilter);
  }

  if (!list || !list.length) {
    showToast("No orders available to export.", "error");
    return;
  }

  logDiag(`Exporting ${list.length} orders to CSV...`, "info");

  const headers = [
    "Order Number",
    "Order Date",
    "Customer Name",
    "Phone Number",
    "Email Address",
    "Workflow Status",
    "Payment Status",
    "Payment Method",
    "Total Amount (INR)",
    "Items Summary",
    "Recipient Name",
    "Address Line 1",
    "Address Line 2",
    "City",
    "State",
    "Pincode",
    "Delivery Notes"
  ];

  const rows = list.map((o) => {
    let addr = o.shipping_address;
    if (typeof addr === "string") {
      try { addr = JSON.parse(addr); } catch (e) { addr = {}; }
    }
    addr = addr || {};

    // Fallback to CRM customer address if missing in order record
    if (!addr.address_line_1 && o.customer_id) {
      const cust = cachedCustomers.find((c) => String(c.id) === String(o.customer_id) || String(c.phone) === String(o.phone));
      if (cust) {
        addr = {
          recipient_name: cust.full_name || o.customer_name,
          phone: cust.phone || o.phone,
          address_line_1: cust.address_line_1 || "",
          address_line_2: cust.address_line_2 || "",
          city: cust.city || "",
          state: cust.state || "",
          pincode: cust.pincode || ""
        };
      }
    }

    let meta = o.metadata;
    if (typeof meta === "string") {
      try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
    }
    meta = meta || {};

    const payMethod = meta.payment_method || (o.payment_status === "paid" ? "PREPAID_UPI" : "COD");

    return [
      escapeCsv(o.order_number),
      escapeCsv(o.created_at ? new Date(o.created_at).toLocaleString("en-IN") : ""),
      escapeCsv(o.customer_name),
      escapeCsv(o.phone),
      escapeCsv(o.email || ""),
      escapeCsv(o.status),
      escapeCsv(o.payment_status || "payment_pending"),
      escapeCsv(payMethod),
      escapeCsv(o.total_amount),
      escapeCsv(o.items_summary),
      escapeCsv(addr.recipient_name || o.customer_name),
      escapeCsv(addr.address_line_1 || ""),
      escapeCsv(addr.address_line_2 || ""),
      escapeCsv(addr.city || ""),
      escapeCsv(addr.state || ""),
      escapeCsv(addr.pincode || ""),
      escapeCsv(o.delivery_notes || meta.notes || "")
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `KhanaPeenaGharSe_Orders_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(`Exported ${list.length} orders to CSV successfully!`, "success");
}

btnExportOrdersCsv?.addEventListener("click", exportOrdersToCSV);

// ==========================================
// PACKING SLIP MODAL & PRINTING
// ==========================================
function openPackingSlip(orderId) {
  const order = cachedOrders.find((o) => String(o.id) === String(orderId));
  if (!order) {
    showToast("Order record not found.", "error");
    return;
  }

  let addr = order.shipping_address;
  if (typeof addr === "string") {
    try { addr = JSON.parse(addr); } catch (e) { addr = {}; }
  }
  addr = addr || {};

  if (!addr.address_line_1 && order.customer_id) {
    const cust = cachedCustomers.find((c) => String(c.id) === String(order.customer_id) || String(c.phone) === String(order.phone));
    if (cust) {
      addr = {
        recipient_name: cust.full_name || order.customer_name,
        phone: cust.phone || order.phone,
        address_line_1: cust.address_line_1 || "",
        address_line_2: cust.address_line_2 || "",
        city: cust.city || "",
        state: cust.state || "",
        pincode: cust.pincode || ""
      };
    }
  }

  let meta = order.metadata;
  if (typeof meta === "string") {
    try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
  }
  meta = meta || {};

  const isPaid = order.payment_status === "paid" || meta.payment_method === "PREPAID_UPI";
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "N/A";
  const recipientName = addr.recipient_name || order.customer_name || "Valued Patron";
  const recipientPhone = addr.phone || order.phone || "N/A";
  const addressLine1 = addr.address_line_1 || "Address on record with customer";
  const addressLine2 = addr.address_line_2 || "";
  const city = addr.city || "NCR Hub";
  const state = addr.state || "India";
  const pincode = addr.pincode || "—";

  const rawItems = (order.items_summary || "Artisanal Fresh Batch Achar")
    .split(/,\s*(?=[A-Za-z0-9])/)
    .map((item) => item.trim())
    .filter(Boolean);

  const itemsRowsHtml = rawItems.map((item, idx) => `
    <tr>
      <td class="slip-check-col"><div class="slip-check-box"></div></td>
      <td>
        <strong style="color:#0A241B;">${item}</strong><br>
        <span style="font-size:11px; color:#666;">Cold-Pressed Mustard Oil &bull; Sun-Cured Heritage Recipe</span>
      </td>
      <td style="text-align:center; font-size:12px; color:#444;">
        Airtight Glass/Pet Jar<br><span style="font-size:10px; color:#047857; font-weight:700;">[Hermetically Sealed]</span>
      </td>
      <td style="text-align:right; font-weight:700;">
        ${idx === 0 && rawItems.length === 1 ? `₹${order.total_amount}` : 'Included in Batch'}
      </td>
    </tr>
  `).join("");

  if (printableSlipContent) {
    printableSlipContent.innerHTML = `
      <div class="packing-slip-sheet">
        <div class="slip-header-grid">
          <div class="slip-brand-col">
            <h2><span>🏺</span> Khana Peena Ghar Se</h2>
            <p class="slip-kitchen-tagline">Pure Handcrafted Mustard Oil Pickles &amp; Preserves</p>
            <p class="slip-origin-text">
              <strong>Kitchen Origin:</strong> D-Block, Line Par, Bahadurgarh, Jhajjar, Haryana 124507<br>
              <strong>FSSAI Registered:</strong> 20824005001234 &bull; <strong>Kitchen Care:</strong> +91 93102 14457
            </p>
          </div>
          <div class="slip-meta-col">
            <div class="slip-order-badge">${order.order_number || "KP-ORDER"}</div>
            <div>
              <span class="slip-pay-badge ${isPaid ? 'paid' : 'cod'}">
                ${isPaid ? '✓ PREPAID (ONLINE/UPI)' : '⚠️ CASH ON DELIVERY (COD)'}
              </span>
            </div>
            <div class="slip-date-text">
              Date: ${orderDate}
            </div>
            <div style="font-size:11px; color:#444; margin-top:2px;">
              Workflow: <strong style="text-transform:uppercase;">${order.status}</strong>
            </div>
          </div>
        </div>

        <div class="slip-routing-grid">
          <div class="slip-box">
            <div class="slip-box-title">
              <span>📍</span> SHIP TO (PATRON DESTINATION)
            </div>
            <div class="slip-recipient-name">${recipientName}</div>
            <div class="slip-recipient-phone">📞 ${recipientPhone}</div>
            <div class="slip-recipient-addr">
              ${addressLine1}${addressLine2 ? `<br>${addressLine2}` : ''}<br>
              ${city}, ${state}
            </div>
            <div>
              <span class="slip-pincode-pill">PIN: ${pincode}</span>
            </div>
          </div>

          <div class="slip-box">
            <div class="slip-box-title">
              <span>🚚</span> DISPATCH &amp; TRANSIT MANIFEST
            </div>
            <div class="slip-manifest-list">
              <div><strong>Origin Hub:</strong> Delhi NCR / Bahadurgarh (North Zone)</div>
              <div><strong>Transit Safety:</strong> Sealed Glass/Pet Jar, Double Cushioned Wrap</div>
              <div><strong>Courier Express:</strong> Delhivery / BlueDart / India Post</div>
              <div><strong>Master Artisan:</strong> Rachna Sharma &amp; Family</div>
              ${order.delivery_notes ? `<div style="margin-top:6px; color:#92400E; font-size:11px;"><strong>Patron Note:</strong> ${order.delivery_notes}</div>` : ''}
            </div>
          </div>
        </div>

        <table class="slip-items-table">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;">Pack</th>
              <th>Item Description &amp; Recipe Batch</th>
              <th style="text-align:center; width:140px;">Packaging Type</th>
              <th style="text-align:right; width:100px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <div class="slip-total-bar">
          <span>Shipping: <strong style="color:#047857;">FREE (Pan-India)</strong></span>
          <span>Total Order Value: <strong>₹${order.total_amount || 0}</strong></span>
        </div>

        <div class="slip-fragile-notice">
          <span style="font-size:22px;">⚠️</span>
          <div>
            <strong>FRAGILE ARTISANAL FOOD ITEM — HANDLE WITH UTMOST CARE</strong><br>
            Contains authentic sun-matured pickles preserved in cold-pressed mustard oil. Keep container upright. 100% transit damage replacement guarantee.
          </div>
        </div>

        <div class="slip-sign-bar">
          <div>Kitchen QA Packed By: ___________________</div>
          <div>Dispatch Date &amp; Time: ___________________</div>
          <div>Seal &amp; Anti-Leak Verified: [ &nbsp; ] YES</div>
        </div>
      </div>
    `;
  }

  if (packingSlipModal) {
    packingSlipModal.classList.remove("hidden");
    logDiag(`Generated printable packing slip for order: ${order.order_number}`);
  }
}

function closePackingSlip() {
  if (packingSlipModal) {
    packingSlipModal.classList.add("hidden");
  }
}

btnPrintSlipAction?.addEventListener("click", () => window.print());
btnCloseSlipModal?.addEventListener("click", closePackingSlip);
packingSlipModal?.addEventListener("click", (e) => {
  if (e.target === packingSlipModal) closePackingSlip();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && packingSlipModal && !packingSlipModal.classList.contains("hidden")) {
    closePackingSlip();
  }
});

// ==========================================
// CRM RENDERING
// ==========================================
function renderCrm(customers = cachedCustomers) {
  if (badgeCrmCount) badgeCrmCount.textContent = cachedCustomers.length;
  if (statCrmTotal) statCrmTotal.textContent = cachedCustomers.length;

  if (!customers.length) {
    crmTableBody.innerHTML = `<tr><td colspan="8" class="loading-cell">No customers found.</td></tr>`;
    return;
  }

  crmTableBody.innerHTML = customers.map((c) => {
    let tierClass = "badge-new";
    if (c.tier === "VIP Heirloom Patron") tierClass = "badge-vip";
    else if (c.tier === "Repeat Customer") tierClass = "badge-repeat";

    const notesHtml = (c.notes || []).map((n) => `
      <div class="crm-note-item">
        <strong>${n.staff_name}:</strong> ${n.note} <span style="font-size:10px; color:var(--muted);">(${new Date(n.created_at).toLocaleDateString("en-IN")})</span>
      </div>
    `).join("");

    const cleanPhone = String(c.phone || "").replace(/\D/g, "").slice(-10);
    const waChatUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Namaste ${c.full_name?.split(" ")[0] || "Patron"} ji! From Khana Peena Ghar Se family kitchen:`)}`;

    return `
      <tr>
        <td><strong>${c.full_name}</strong></td>
        <td>
          <a href="tel:${c.phone}" style="font-size:12px; color:#166534; font-weight:600;">${c.phone}</a><br>
          <span style="font-size:11px; color:var(--muted);">${c.email || ""}</span>
        </td>
        <td>${c.city || "—"}</td>
        <td><strong>${c.total_orders}</strong></td>
        <td><strong>₹${c.lifetime_value}</strong></td>
        <td><span class="badge-tier ${tierClass}">${c.tier}</span></td>
        <td style="max-width:260px;">
          <div class="crm-notes-box">
            ${notesHtml || "<span style='color:var(--muted);'>No kitchen notes yet.</span>"}
          </div>
          <div style="display:flex; gap:4px; margin-top:6px;">
            <input type="text" placeholder="Add kitchen note..." data-note-input="${c.id}" style="min-height:28px; font-size:11px; padding:4px 8px; flex:1; border-radius:6px; border:1px solid rgba(31,26,18,0.15);">
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
  }).join("");
}

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

// ==========================================
// REVIEW MODERATION QUEUE
// ==========================================
function renderReviews(reviews = cachedReviews) {
  let filtered = reviews;
  if (activeReviewFilter !== "all") {
    filtered = reviews.filter((r) => r.status === activeReviewFilter);
  }

  const pendingCount = reviews.filter((r) => r.status === "pending_screening").length;
  if (badgeReviewsPending) badgeReviewsPending.textContent = pendingCount;
  if (statReviewsPending) statReviewsPending.textContent = pendingCount;

  if (!filtered.length) {
    reviewsContainer.innerHTML = `<div style="padding:36px; text-align:center; color:var(--muted); background:#FFF; border-radius:18px;">No reviews found in this category.</div>`;
    return;
  }

  reviewsContainer.innerHTML = filtered.map((r) => {
    const stars = "★".repeat(Number(r.rating || 5)) + "☆".repeat(5 - Number(r.rating || 5));
    const statusLabel = r.status.replace("_", " ").toUpperCase();

    return `
      <article class="review-mod-card ${r.status}">
        <div class="review-mod-head">
          <div>
            <div class="review-mod-stars">${stars}</div>
            <h4 style="margin:4px 0 2px; font-size:1.1rem;">${r.title || "Customer Experience"}</h4>
            <div class="review-mod-meta">
              By <strong>${r.customer_display_name}</strong> (${r.customer_city || "India"}) 
              • Product: <strong>${r.product_slug}</strong> 
              • Submitted: ${new Date(r.created_at).toLocaleString("en-IN")}
              ${r.is_verified_buyer ? ' • <span style="color:#166534; font-weight:700;">✓ Verified Buyer</span>' : ''}
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
  }).join("");
}

document.querySelectorAll(".filter-review-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-review-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeReviewFilter = btn.dataset.filter;
    renderReviews(cachedReviews);
  });
});

// ==========================================
// INVENTORY RENDERING
// ==========================================
function renderInventory(items) {
  if (statInventorySkus) statInventorySkus.textContent = items.length;

  if (!items.length) {
    inventoryTableBody.innerHTML = `<tr><td colspan="5" class="loading-cell">No products found.</td></tr>`;
    return;
  }

  inventoryTableBody.innerHTML = items.map((item) => `
    <tr>
      <td>
        <strong>${item.name}</strong><br>
        <span style="font-size:11px; color:var(--muted);">${item.slug}</span>
      </td>
      <td>${item.size_label}</td>
      <td>
        <input type="number" min="0" value="${item.stock_quantity ?? 0}" data-stock-id="${item.id}" style="width:84px; padding:4px 8px; border-radius:8px; border:1px solid rgba(31,26,18,0.2);">
      </td>
      <td>
        <input type="number" min="0" value="${item.price ?? 0}" data-price-id="${item.id}" style="width:90px; padding:4px 8px; border-radius:8px; border:1px solid rgba(31,26,18,0.2);">
      </td>
      <td>
        <button class="button button-secondary button-sm" type="button" data-save-product="${item.id}">Save</button>
      </td>
    </tr>
  `).join("");
}

// ==========================================
// MEDIA MANAGER
// ==========================================
function renderMediaManager(items = currentInventory) {
  if (!mediaGrid) return;
  currentInventory = items;

  mediaGrid.innerHTML = items.map((product) => {
    const images = Array.isArray(product.gallery_images) && product.gallery_images.length
      ? product.gallery_images
      : (product.image_url ? [product.image_url] : []);

    return `
      <article class="media-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4>${product.name}</h4>
            <p>${product.slug}</p>
          </div>
          <span style="font-size:11px; background:#F3F4F6; padding:3px 8px; border-radius:999px;">/images/achars/${product.slug}/</span>
        </div>
        <label style="display:grid; gap:4px; font-size:12px; font-weight:600; color:var(--muted);">
          Gallery Image Paths (One per line)
          <textarea rows="4" data-media-id="${product.id}" data-media-slug="${product.slug}">${images.join("\n")}</textarea>
        </label>
      </article>
    `;
  }).join("");
}

// ==========================================
// FETCH ALL CONSOLE DATA (WITH TIMING LOGS)
// ==========================================
async function fetchAllData() {
  const adminKey = getAdminKey();
  if (!adminKey) return;

  logDiag("Fetching full kitchen operational dataset...", "info");
  const startTime = performance.now();

  try {
    const [dashRes, crmRes, revRes] = await Promise.all([
      fetch("/api/admin-dashboard", { headers: { "x-admin-key": adminKey } }),
      fetch("/api/crm", { headers: { "x-admin-key": adminKey } }),
      fetch("/api/reviews-admin", { headers: { "x-admin-key": adminKey } })
    ]);

    const duration = Math.round(performance.now() - startTime);
    logDiag(`API fetch completed in ${duration}ms [Dash: ${dashRes.status}, CRM: ${crmRes.status}, Rev: ${revRes.status}]`, "info");

    if (diagAvgLatency) diagAvgLatency.textContent = `${duration} ms`;

    const dashData = await dashRes.json();
    const crmData = await crmRes.json();
    const revData = await revRes.json();

    if (!dashRes.ok) {
      logDiag(`Dashboard authentication error: ${dashData.error}`, "error");
      throw new Error(dashData.error || "Dashboard error");
    }

    cachedOrders = dashData.orders || [];
    currentInventory = dashData.inventory || [];
    filterAndRenderOrders();
    renderInventory(currentInventory);
    renderMediaManager(currentInventory);

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
      dashboardSummary.textContent = `${cachedOrders.length} orders • ${cachedCustomers.length} patrons • ${pendingRevs} pending review screenings`;
    }

    if (statSystemHealth) statSystemHealth.textContent = "200 OK";
    if (diagAuthStatus) {
      diagAuthStatus.textContent = "Authenticated (200 OK)";
      diagAuthStatus.className = "diag-val text-success";
    }
    if (diagDbStatus) {
      diagDbStatus.textContent = "Online (Active)";
      diagDbStatus.className = "diag-val text-success";
    }

    logDiag(`Data synchronization complete. Loaded ${cachedOrders.length} orders, ${cachedCustomers.length} CRM patrons.`, "info");
  } catch (error) {
    logDiag(`Fetch error: ${error.message}`, "error");
    if (diagAuthStatus) {
      diagAuthStatus.textContent = error.message;
      diagAuthStatus.className = "diag-val text-error";
    }
    showToast(error.message, "error");

    if (error.message.toLowerCase().includes("unauthorized") || error.message.toLowerCase().includes("401")) {
      clearAdminKey();
      showLogin();
      if (loginStatus) loginStatus.textContent = "Invalid or expired admin key.";
    }
  }
}

// ==========================================
// PATCH CALL HELPER
// ==========================================
async function patchAdmin(payload) {
  const adminKey = getAdminKey();
  logDiag(`Sending PATCH /api/admin-dashboard: ${JSON.stringify(payload)}`, "info");
  const response = await fetch("/api/admin-dashboard", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) {
    logDiag(`PATCH failed: ${result.error}`, "error");
    throw new Error(result.error || "Update failed");
  }
  logDiag(`PATCH succeeded: ${JSON.stringify(result)}`, "info");
  return result;
}

// ==========================================
// CLICK EVENT DELEGATION
// ==========================================
document.addEventListener("click", async (event) => {
  const adminKey = getAdminKey();
  if (!adminKey) return;

  // Open Packing Slip
  const slipButton = event.target.closest("[data-print-slip]");
  if (slipButton) {
    const orderId = slipButton.dataset.printSlip;
    openPackingSlip(orderId);
    return;
  }

  // Save Order Status
  const orderButton = event.target.closest("[data-save-order]");
  if (orderButton) {
    const id = orderButton.dataset.saveOrder;
    const status = document.querySelector(`[data-order-id="${id}"]`).value;
    try {
      orderButton.disabled = true;
      const result = await patchAdmin({ type: "order", id, status });
      await fetchAllData();
      showToast(`Order status saved: ${status.toUpperCase()}`, "success");
      if (result.reviewInvite?.whatsappUrl) {
        window.open(result.reviewInvite.whatsappUrl, "_blank");
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      orderButton.disabled = false;
    }
  }

  // Generate Review Invite Manually
  const inviteBtn = event.target.closest("[data-generate-invite]");
  if (inviteBtn) {
    const orderId = inviteBtn.dataset.generateInvite;
    const customerId = inviteBtn.dataset.custId;
    try {
      inviteBtn.disabled = true;
      logDiag(`Generating review invite token for order ${orderId}...`, "info");
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action: "generate-review-invite", orderId, customerId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invite generation failed");
      await fetchAllData();
      showToast("WhatsApp review invite link generated!", "success");
      window.open(data.whatsappUrl, "_blank");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      inviteBtn.disabled = false;
    }
  }

  // Save Inventory
  const productButton = event.target.closest("[data-save-product]");
  if (productButton) {
    const id = productButton.dataset.saveProduct;
    const stock = Number(document.querySelector(`[data-stock-id="${id}"]`).value);
    const price = Number(document.querySelector(`[data-price-id="${id}"]`).value);
    try {
      productButton.disabled = true;
      await patchAdmin({ type: "inventory", id, stockQuantity: stock, price });
      await fetchAllData();
      showToast(`Stock (${stock}) & Price (₹${price}) updated!`, "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      productButton.disabled = false;
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
      noteBtn.disabled = true;
      logDiag(`Adding kitchen note for customer ${customerId}...`, "info");
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action: "add-note", customerId, note: noteText, staffName: "Kitchen Staff" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Note saving failed");
      input.value = "";
      await fetchAllData();
      showToast("Kitchen note recorded for patron!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      noteBtn.disabled = false;
    }
  }

  // Review Moderation Actions
  const reviewActionBtn = event.target.closest("[data-review-action]");
  if (reviewActionBtn) {
    const action = reviewActionBtn.dataset.reviewAction;
    const id = reviewActionBtn.dataset.reviewId;
    let screeningNotes = "";
    if (action === "reject") {
      screeningNotes = prompt("Enter internal reason for rejection:") || "Rejected by moderator";
    }
    try {
      reviewActionBtn.disabled = true;
      logDiag(`Moderating review ${id} with action: ${action}`, "info");
      const res = await fetch("/api/reviews-admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id, action, screeningNotes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      await fetchAllData();
      showToast(`Review ${action.toUpperCase()} complete!`, "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      reviewActionBtn.disabled = false;
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
        logDiag(`Sanitizing PII for review ${id}...`, "info");
        const res = await fetch("/api/reviews-admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ id, action: "sanitize", customerDisplayName: newName, customerCity: newCity })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Sanitizing failed");
        await fetchAllData();
        showToast("Customer display name updated safely!", "success");
      } catch (err) {
        showToast(err.message, "error");
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
    await patchAdmin(payload);
    e.currentTarget.reset();
    await fetchAllData();
    showToast(`Published '${payload.name}' to catalog!`, "success");
  } catch (err) {
    showToast(err.message, "error");
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
    logDiag(`Saving media galleries for ${payloads.length} products...`, "info");
    await Promise.all(payloads.map((p) => patchAdmin({
      type: "media",
      id: p.id,
      galleryImages: p.galleryImages,
      imageUrl: p.imageUrl
    })));
    await fetchAllData();
    showToast("Product media galleries saved to database!", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Test All Diagnostics Endpoints Button
btnRunDiagnostics?.addEventListener("click", async () => {
  logDiag("=== Starting Comprehensive API Diagnostics ===", "info");
  await fetchAllData();
  showToast("Diagnostics complete! Check console logs.", "success");
});

// Clear Logs Button
btnClearLogs?.addEventListener("click", () => {
  if (diagnosticsTerminal) {
    diagnosticsTerminal.innerHTML = '<div class="terminal-line info">[SYSTEM] Console cleared.</div>';
  }
});

// Login Form Submit
loginForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const password = document.querySelector("#admin-password").value.trim().replace(/^["']|["']$/g, "");
  if (!password) {
    if (loginStatus) loginStatus.textContent = "Please enter the admin key.";
    return;
  }
  logDiag("Admin key entered, initializing dashboard session...", "info");
  setAdminKey(password);
  if (loginStatus) loginStatus.textContent = "";
  showDashboard();
  fetchAllData();
  showToast("Dashboard unlocked! Welcome to Kitchen Console.", "success");
});

refreshButton?.addEventListener("click", () => {
  fetchAllData();
  showToast("Syncing with live kitchen database...", "success");
});

logoutButton?.addEventListener("click", () => {
  clearAdminKey();
  showLogin();
  showToast("Logged out from console session.", "info");
});

// Auto-boot if session key exists
if (getAdminKey()) {
  logDiag("Found active admin session key, booting dashboard...", "info");
  showDashboard();
  fetchAllData();
}
