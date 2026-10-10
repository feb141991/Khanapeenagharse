-- 1. Reviews table
create table if not exists reviews (
  id bigint generated always as identity primary key,
  order_id bigint references orders(id) on delete set null,
  customer_id bigint references customers(id) on delete set null,
  product_slug text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  title text,
  comment text not null,
  images jsonb not null default '[]'::jsonb,
  is_verified_buyer boolean not null default true,
  status text not null default 'pending_screening',
  customer_display_name text not null,
  customer_city text,
  screening_notes text,
  screened_by text,
  screened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Review Request Tokens
create table if not exists review_requests (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  customer_id bigint not null references customers(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  product_slug text,
  customer_name text,
  phone text,
  email text,
  channel text not null default 'whatsapp',
  sent_at timestamptz not null default now(),
  is_completed boolean not null default false,
  completed_at timestamptz
);

-- 3. CRM Staff Notes & Tags
create table if not exists crm_notes (
  id bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  staff_name text not null default 'Kitchen Staff',
  note text not null,
  tag text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_reviews_product on reviews(product_slug, status);
create index if not exists idx_reviews_status on reviews(status);
create index if not exists idx_crm_notes_customer on crm_notes(customer_id);
create index if not exists idx_review_requests_token on review_requests(token);

-- Row Level Security (RLS)
alter table reviews enable row level security;
alter table review_requests enable row level security;
alter table crm_notes enable row level security;

-- Public read approved & featured reviews
drop policy if exists "Allow public read approved reviews" on reviews;
create policy "Allow public read approved reviews"
  on reviews for select
  using (status in ('approved', 'featured'));
