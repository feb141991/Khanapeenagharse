create extension if not exists pgcrypto;

create table if not exists customers (
  id bigint generated always as identity primary key,
  auth_user_id uuid unique,
  full_name text not null,
  first_name text,
  phone text not null unique,
  email text,
  avatar_url text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  pincode text,
  default_address_id bigint,
  referral_code text unique,
  referred_by_code text,
  reward_points integer not null default 0,
  lifetime_value numeric not null default 0,
  total_orders integer not null default 0,
  last_order_at timestamptz,
  marketing_opt_in boolean not null default true,
  order_updates_opt_in boolean not null default true,
  support_opt_in boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customers add column if not exists auth_user_id uuid unique;
alter table customers add column if not exists first_name text;
alter table customers add column if not exists avatar_url text;
alter table customers add column if not exists default_address_id bigint;
alter table customers add column if not exists referral_code text unique;
alter table customers add column if not exists referred_by_code text;
alter table customers add column if not exists reward_points integer not null default 0;
alter table customers add column if not exists lifetime_value numeric not null default 0;
alter table customers add column if not exists total_orders integer not null default 0;
alter table customers add column if not exists last_order_at timestamptz;
alter table customers add column if not exists marketing_opt_in boolean not null default true;
alter table customers add column if not exists order_updates_opt_in boolean not null default true;
alter table customers add column if not exists support_opt_in boolean not null default true;
alter table customers add column if not exists updated_at timestamptz not null default now();

create table if not exists addresses (
  id bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null,
  phone text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products add column if not exists gallery_images jsonb not null default '[]'::jsonb;
alter table products add column if not exists updated_at timestamptz not null default now();

create table if not exists orders (
  id bigint generated always as identity primary key,
  order_number text not null unique,
  customer_id bigint references customers(id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text,
  status text not null default 'pending',
  payment_status text not null default 'payment_pending',
  tracking_number text,
  delivery_eta date,
  total_amount numeric not null default 0,
  subtotal_amount numeric not null default 0,
  shipping_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  referral_discount numeric not null default 0,
  reward_points_earned integer not null default 0,
  reward_points_used integer not null default 0,
  delivery_notes text,
  items_summary text,
  shipping_address jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders add column if not exists email text;
alter table orders add column if not exists payment_status text not null default 'payment_pending';
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists delivery_eta date;
alter table orders add column if not exists subtotal_amount numeric not null default 0;
alter table orders add column if not exists shipping_amount numeric not null default 0;
alter table orders add column if not exists discount_amount numeric not null default 0;
alter table orders add column if not exists referral_discount numeric not null default 0;
alter table orders add column if not exists reward_points_earned integer not null default 0;
alter table orders add column if not exists reward_points_used integer not null default 0;
alter table orders add column if not exists shipping_address jsonb not null default '{}'::jsonb;
alter table orders add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table orders add column if not exists updated_at timestamptz not null default now();

create table if not exists order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_slug text not null,
  product_name text not null,
  size_label text,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  line_total numeric not null default 0,
  product_image text,
  created_at timestamptz not null default now()
);

alter table order_items add column if not exists product_image text;
alter table order_items add column if not exists created_at timestamptz not null default now();

create table if not exists order_status_events (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  status text not null,
  label text not null,
  note text,
  happened_at timestamptz not null default now()
);

create table if not exists support_tickets (
  id bigint generated always as identity primary key,
  customer_id bigint references customers(id) on delete set null,
  order_id bigint references orders(id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists refunds (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  customer_id bigint references customers(id) on delete set null,
  reason text,
  status text not null default 'requested',
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists referrals (
  id bigint generated always as identity primary key,
  referrer_customer_id bigint not null references customers(id) on delete cascade,
  referred_customer_id bigint references customers(id) on delete set null,
  referral_code text not null,
  reward_to_referrer integer not null default 0,
  reward_to_referred integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reward_points (
  id bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  points integer not null,
  reason text not null,
  order_id bigint references orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'account',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists admin_roles (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null unique,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists wishlist_items (
  id bigint generated always as identity primary key,
  customer_id bigint references customers(id) on delete cascade,
  product_slug text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_addresses_customer_id on addresses(customer_id);
create index if not exists idx_orders_customer_id on orders(customer_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_notifications_customer_id on notifications(customer_id);
create index if not exists idx_support_tickets_customer_id on support_tickets(customer_id);
create index if not exists idx_reward_points_customer_id on reward_points(customer_id);
create index if not exists idx_referrals_referrer_customer_id on referrals(referrer_customer_id);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'customers_default_address_id_fkey'
  ) then
    alter table customers
      add constraint customers_default_address_id_fkey
      foreign key (default_address_id) references addresses(id) on delete set null;
  end if;
end $$;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at before update on customers
for each row execute procedure set_updated_at();

drop trigger if exists addresses_set_updated_at on addresses;
create trigger addresses_set_updated_at before update on addresses
for each row execute procedure set_updated_at();

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at before update on products
for each row execute procedure set_updated_at();

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at before update on orders
for each row execute procedure set_updated_at();

drop trigger if exists support_tickets_set_updated_at on support_tickets;
create trigger support_tickets_set_updated_at before update on support_tickets
for each row execute procedure set_updated_at();

drop trigger if exists refunds_set_updated_at on refunds;
create trigger refunds_set_updated_at before update on refunds
for each row execute procedure set_updated_at();

drop trigger if exists referrals_set_updated_at on referrals;
create trigger referrals_set_updated_at before update on referrals
for each row execute procedure set_updated_at();

insert into products (slug, name, size_label, price, stock_quantity, description, image_url)
values
  ('aam-ka-achar', 'Aam Ka Achar', '500 g jar', 299, 24, 'Raw mango achar with balanced roasted masala.', null),
  ('hing-ka-achar', 'Hing Ka Achar', '450 g jar', 279, 18, 'Aromatic hing achar with savoury depth.', null),
  ('mirch-ka-achar', 'Mirch Ka Achar', '400 g jar', 259, 20, 'Green chilli achar with tang and heat.', null),
  ('mix-veg-achar', 'Mix Veg Achar', '500 g jar', 289, 16, 'Seasonal mixed vegetable achar.', null)
on conflict (slug) do nothing;

alter table customers enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_events enable row level security;
alter table support_tickets enable row level security;
alter table refunds enable row level security;
alter table referrals enable row level security;
alter table reward_points enable row level security;
alter table notifications enable row level security;
alter table admin_roles enable row level security;
alter table wishlist_items enable row level security;

drop policy if exists "customers_select_self" on customers;
create policy "customers_select_self" on customers
for select using (auth.uid() = auth_user_id);

drop policy if exists "customers_update_self" on customers;
create policy "customers_update_self" on customers
for update using (auth.uid() = auth_user_id);

drop policy if exists "customers_insert_self" on customers;
create policy "customers_insert_self" on customers
for insert with check (auth.uid() = auth_user_id);

drop policy if exists "addresses_manage_self" on addresses;
create policy "addresses_manage_self" on addresses
for all using (
  customer_id in (select id from customers where auth_user_id = auth.uid())
)
with check (
  customer_id in (select id from customers where auth_user_id = auth.uid())
);

drop policy if exists "orders_select_self" on orders;
create policy "orders_select_self" on orders
for select using (
  customer_id in (select id from customers where auth_user_id = auth.uid())
);

drop policy if exists "order_items_select_self" on order_items;
create policy "order_items_select_self" on order_items
for select using (
  order_id in (
    select id from orders where customer_id in (
      select id from customers where auth_user_id = auth.uid()
    )
  )
);

drop policy if exists "order_status_events_select_self" on order_status_events;
create policy "order_status_events_select_self" on order_status_events
for select using (
  order_id in (
    select id from orders where customer_id in (
      select id from customers where auth_user_id = auth.uid()
    )
  )
);

drop policy if exists "notifications_select_self" on notifications;
create policy "notifications_select_self" on notifications
for select using (
  customer_id in (select id from customers where auth_user_id = auth.uid())
);

drop policy if exists "wishlist_select_self" on wishlist_items;
create policy "wishlist_select_self" on wishlist_items
for select using (
  customer_id in (select id from customers where auth_user_id = auth.uid())
);

drop policy if exists "admin_roles_select_self" on admin_roles;
create policy "admin_roles_select_self" on admin_roles
for select using (auth.uid() = auth_user_id);
