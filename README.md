# Khana Peena Ghar Se

Production-ready Vite + React storefront for Netlify with Supabase-backed:
- customer auth
- customer profiles
- orders and order tracking
- inventory
- product media galleries
- admin dashboard updates

## Environment variables

Client-side Vite variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-side Netlify function variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_DASHBOARD_KEY`

Use `.env.example` as the template.

## Supabase setup

Run the SQL in [`supabase/schema.sql`](/Users/Business(C)/Khana%20Peena%20Ghar%20Se/Khannana/supabase/schema.sql) in your Supabase SQL editor.

That schema sets up:
- `customers`
- `products`
- `orders`
- `order_items`
- `wishlist_items`
- product gallery storage via `products.gallery_images`
- authenticated customer linking via `customers.auth_user_id`

In Supabase Auth:

1. Enable Email/Password sign-in
2. Configure your site URL and redirect URLs for Netlify
3. If email confirmation is enabled, users will need to verify before first sign-in

## Netlify setup

`netlify.toml` is configured with:
- build command: `npm run build`
- publish directory: `dist`
- functions directory: `netlify/functions`
- SPA redirect for React routes

## Image handling

Product images live in:

- `public/images/achars/aam-ka-achar/`
- `public/images/achars/hing-ka-achar/`
- `public/images/achars/mirch-ka-achar/`
- `public/images/achars/mix-veg-achar/`

The admin dashboard stores gallery paths in the database. One image path per line.

Example:

```text
/images/achars/aam-ka-achar/hero.jpg
/images/achars/aam-ka-achar/detail-1.jpg
/images/achars/aam-ka-achar/detail-2.jpg
```

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run check
```

## Current production shape

- Public storefront uses database-backed product media and inventory values
- Login and signup are wired to Supabase Auth
- Customer account creation can sync to the `customers` table through the `customer-profile` function
- Order creation writes customers, orders, and order items
- Admin can update order status, inventory, and gallery media

## Remaining deployment requirements outside the repo

- Add the environment variables in Netlify
- Run the Supabase schema
- Enable Supabase email/password auth
- Upload final product images
- Add Razorpay when you are ready to activate payments
