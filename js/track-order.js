const trackForm = document.querySelector("#track-form");
const trackStatus = document.querySelector("#track-status");
const trackResult = document.querySelector("#track-result");

trackForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const params = new URLSearchParams(new FormData(trackForm));
  trackStatus.textContent = "Checking order...";

  try {
    const response = await fetch(`/.netlify/functions/track-order?${params.toString()}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to find the order.");

    trackResult.innerHTML = `
      <div class="auth-card">
        <p class="eyebrow">Order status</p>
        <h2>${result.order.order_number}</h2>
        <p>Status: ${result.order.status}</p>
        <p>Customer: ${result.order.customer_name}</p>
        <p>Total: INR ${result.order.total_amount}</p>
      </div>
    `;
    trackStatus.textContent = "";
  } catch (error) {
    trackStatus.textContent = error.message;
    trackResult.innerHTML = "";
  }
});
