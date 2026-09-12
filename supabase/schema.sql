-- Customers table
create table if not exists customers (
  id bigint generated always as identity primary key,
  auth_user_id uuid unique,
  full_name text not null,
  phone text not null unique,
  email text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  pincode text,
  created_at timestamptz not null default now()
);

alter table customers
  add column if not exists auth_user_id uuid unique;

-- Products catalog table
create table if not exists products (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  size_label text not null,
  price numeric not null default 0,
  stock_quantity integer not null default 0,
  category text not null default 'Achar',
  shelf_life text not null default '12 Months',
  description text,
  image_url text,
  gallery_images jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products
  add column if not exists category text not null default 'Achar',
  add column if not exists shelf_life text not null default '12 Months',
  add column if not exists gallery_images jsonb not null default '[]'::jsonb;

-- Orders table
create table if not exists orders (
  id bigint generated always as identity primary key,
  order_number text not null unique,
  customer_id bigint references customers(id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  pincode text,
  payment_method text not null default 'COD',
  payment_status text not null default 'pending',
  carrier_name text,
  tracking_number text,
  tracking_url text,
  status text not null default 'pending',
  total_amount numeric not null default 0,
  delivery_notes text,
  items_summary text,
  created_at timestamptz not null default now()
);

alter table orders
  add column if not exists email text,
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pincode text,
  add column if not exists payment_method text not null default 'COD',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists carrier_name text,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text;

-- Order Items table
create table if not exists order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_slug text not null,
  product_name text not null,
  size_label text,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  line_total numeric not null default 0
);

-- Wishlist table
create table if not exists wishlist_items (
  id bigint generated always as identity primary key,
  customer_id bigint references customers(id) on delete cascade,
  product_slug text not null,
  created_at timestamptz not null default now()
);

-- Seed all 5 signature offerings
insert into products (slug, name, size_label, price, stock_quantity, category, shelf_life, description, image_url, gallery_images)
values
  ('aam-ka-achar', 'Aam Ka Achar', '500 g jar', 299, 24, 'Achar', '12 Months', 'Traditional raw mango achar cured in cold-pressed mustard oil with roasted fenugreek and fennel seeds.', '/images/achars/aam-ka-achar/Aam Ka Achar.png', '["/images/achars/aam-ka-achar/Aam Ka Achar.png"]'::jsonb),
  ('hing-ka-achar', 'Hing Ka Achar', '450 g jar', 279, 18, 'Achar', '12 Months', 'Digestive mango achar infused with aromatic pure compounded asafoetida and hand-ground spices.', '/images/achars/hing-ka-achar/Hing Aachar.png', '["/images/achars/hing-ka-achar/Hing Aachar.png"]'::jsonb),
  ('mirch-ka-achar', 'Mirch Ka Achar', '400 g jar', 259, 20, 'Achar', '12 Months', 'Hand-stuffed whole green chillies with crushed yellow mustard, tangy amchur, and roasted spices.', '/images/achars/mirch-ka-achar/Mirch Achar.png', '["/images/achars/mirch-ka-achar/Mirch Achar.png"]'::jsonb),
  ('mix-veg-achar', 'Mix Veg Achar', '500 g jar', 289, 16, 'Achar', '12 Months', 'Seasonal blend of crisp cauliflower, carrots, and turnip cured with whole aromatic spices.', '/images/achars/mix-veg-achar/Mix Veg.png', '["/images/achars/mix-veg-achar/Mix Veg.png"]'::jsonb),
  ('the-ghar-ka-achar-box', 'The Ghar Ka Achar Box (4-Jar Set)', '4 x 400g set', 1099, 12, 'Combo Box', '12 Months', 'Complete heirloom gift box containing all four signature homemade achars in a custom gift pack.', '/images/achars/combo-box/ghar-ka-achar-box.jpg', '["/images/achars/combo-box/ghar-ka-achar-box.jpg"]'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  size_label = excluded.size_label,
  price = excluded.price,
  category = excluded.category,
  shelf_life = excluded.shelf_life,
  description = excluded.description,
  image_url = excluded.image_url;

-- Enable Row Level Security (RLS)
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table wishlist_items enable row level security;

-- Public read access for active products
create policy if not exists "Allow public read active products"
  on products for select
  using (active = true);

-- Customer profile read/write policies
create policy if not exists "Allow customer self read"
  on customers for select
  using (auth.uid() = auth_user_id);

create policy if not exists "Allow customer self update"
  on customers for update
  using (auth.uid() = auth_user_id);

