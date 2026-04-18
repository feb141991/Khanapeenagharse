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

create table if not exists products (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  size_label text not null,
  price numeric not null default 0,
  stock_quantity integer not null default 0,
  description text,
  image_url text,
  gallery_images jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products
  add column if not exists gallery_images jsonb not null default '[]'::jsonb;

create table if not exists orders (
  id bigint generated always as identity primary key,
  order_number text not null unique,
  customer_id bigint references customers(id) on delete set null,
  customer_name text not null,
  phone text not null,
  status text not null default 'pending',
  total_amount numeric not null default 0,
  delivery_notes text,
  items_summary text,
  created_at timestamptz not null default now()
);

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

create table if not exists wishlist_items (
  id bigint generated always as identity primary key,
  customer_id bigint references customers(id) on delete cascade,
  product_slug text not null,
  created_at timestamptz not null default now()
);

insert into products (slug, name, size_label, price, stock_quantity, description, image_url)
values
  ('aam-ka-achar', 'Aam Ka Achar', '500 g jar', 299, 24, 'Raw mango achar with balanced roasted masala.', '/images/achars/aam-ka-achar.jpg'),
  ('hing-ka-achar', 'Hing Ka Achar', '450 g jar', 279, 18, 'Aromatic hing achar with savoury depth.', '/images/achars/hing-ka-achar.jpg'),
  ('mirch-ka-achar', 'Mirch Ka Achar', '400 g jar', 259, 20, 'Green chilli achar with tang and heat.', '/images/achars/mirch-ka-achar.jpg'),
  ('mix-veg-achar', 'Mix Veg Achar', '500 g jar', 289, 16, 'Seasonal mixed vegetable achar.', '/images/achars/mix-veg-achar.jpg')
on conflict (slug) do nothing;

update products
set gallery_images = case slug
  when 'aam-ka-achar' then '["/images/achars/aam-ka-achar/hero.jpg"]'::jsonb
  when 'hing-ka-achar' then '["/images/achars/hing-ka-achar/hero.jpg"]'::jsonb
  when 'mirch-ka-achar' then '["/images/achars/mirch-ka-achar/hero.jpg"]'::jsonb
  when 'mix-veg-achar' then '["/images/achars/mix-veg-achar/hero.jpg"]'::jsonb
  else gallery_images
end
where coalesce(jsonb_array_length(gallery_images), 0) = 0;
