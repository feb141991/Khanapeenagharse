# Khana Peena Ghar Se

Premium achar storefront built with Vite, React, Netlify Functions, and Supabase.

## Current structure

```text
src/
  App.jsx
  data.js
  main.jsx
  store.js
  styles.css
  supabaseClient.js
netlify/functions/
  _lib/supabase.js
  admin-dashboard.js
  create-order.js
  customer-addresses.js
  customer-dashboard.js
  customer-orders.js
  customer-profile.js
  products.js
  track-order.js
public/
  admin.html
  css/style.css
  js/admin.js
  images/
supabase/
  schema.sql
```

## Supabase setup

Run `supabase/schema.sql` against your Supabase project.

Main tables:

- `customers`
- `addresses`
- `products`
- `orders`
- `order_items`
- `order_status_events`
- `support_tickets`
- `refunds`
- `referrals`
- `reward_points`
- `notifications`
- `admin_roles`
- `wishlist_items`

## Environment variables

Frontend:

- `NETLIFY_SUPABASE_URL`
- `NETLIFY_SUPABASE_ANON_KEY`

Server:

- `NETLIFY_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_DASHBOARD_KEY`
- `NETLIFY_SUPABASE_STORAGE_BUCKET` optional, defaults to `product-images`

## Key improvements made

### Customer conversion and retention

- conversion-optimized login, signup, forgot password, and reset password flow
- remember-me behavior and session timeout for session-only logins
- richer account dashboard with saved addresses, preferences, referral section, and loyalty messaging
- premium orders page with order search, reorder actions, cancel request, support request, and refund request placeholders
- improved order tracking timeline with ETA and tracking placeholder fields

### Admin and operations

- admin analytics cards for revenue, repeat customer rate, referrals, and support load
- customer list in admin
- support and referral summaries in admin
- product creation in admin
- Supabase-backed product image delivery from storage folders

### Data model

- relational schema expanded for addresses, referrals, reward points, notifications, support, refunds, and admin roles
- RLS starter policies added for customer-owned records

## Product image convention

Bucket:

- `product-images`

Folder naming:

- use the exact product slug as the folder name

Examples:

- `aam-ka-achar/cover.jpg`
- `aam-ka-achar/detail-1.jpg`
- `hing-ka-achar/cover.jpg`

The server resolves all images in the slug folder and returns signed URLs to the frontend.

## Build

```bash
npm install
npm run check
```

## Next growth roadmap

1. Connect Razorpay checkout and payment webhooks
2. Connect Shiprocket tracking sync into `order_status_events`
3. Add real invoice PDF generation and download
4. Move wishlist from local storage into Supabase per account
5. Add abandoned checkout capture and win-back messaging
6. Add admin-triggered email campaigns for repeat orders and referrals
