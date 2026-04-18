const loginForm = document.querySelector("#customer-login-form");
const registerForm = document.querySelector("#customer-register-form");

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const status = document.querySelector("#login-status");
  status.textContent = "Connect SUPABASE_URL and SUPABASE_ANON_KEY to enable customer auth.";
});

registerForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const status = document.querySelector("#register-status");
  status.textContent = "Connect SUPABASE_URL and SUPABASE_ANON_KEY to enable customer auth.";
});
