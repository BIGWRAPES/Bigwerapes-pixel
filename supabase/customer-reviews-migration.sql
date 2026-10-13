-- Customer reviews are published immediately after a successful submission.
-- Run this migration once in Supabase SQL Editor for this project.

create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  reviewer_name text not null check (char_length(btrim(reviewer_name)) between 2 and 80),
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(btrim(review_text)) between 20 and 1500),
  source_url text check (source_url is null or source_url ~* '^https?://'),
  display_name_consent boolean not null default false check (display_name_consent),
  created_at timestamptz not null default now()
);

-- Remove the former approval workflow if that earlier draft was already applied.
drop policy if exists "Anyone can read approved customer reviews" on public.customer_reviews;
drop policy if exists "Anyone can submit pending customer reviews" on public.customer_reviews;
drop index if exists public.customer_reviews_approved_created_at_idx;
drop index if exists public.customer_reviews_approved_business_idx;
alter table public.customer_reviews drop column if exists status;

create index if not exists customer_reviews_created_at_idx
  on public.customer_reviews (created_at desc);
create index if not exists customer_reviews_business_idx
  on public.customer_reviews (business_id, created_at desc);

alter table public.customer_reviews enable row level security;

-- Public visitors may read published fields and insert a review, but cannot edit or delete reviews.
revoke all on table public.customer_reviews from public, anon, authenticated;
grant select (id, business_id, reviewer_name, rating, review_text, source_url, created_at)
  on public.customer_reviews to anon, authenticated;
grant insert (business_id, reviewer_name, rating, review_text, source_url, display_name_consent)
  on public.customer_reviews to anon, authenticated;

drop policy if exists "Anyone can read customer reviews" on public.customer_reviews;
create policy "Anyone can read customer reviews"
  on public.customer_reviews for select to anon, authenticated
  using (true);

drop policy if exists "Anyone can submit customer reviews" on public.customer_reviews;
create policy "Anyone can submit customer reviews"
  on public.customer_reviews for insert to anon, authenticated
  with check (
    display_name_consent is true
    and (source_url is null or source_url ~* '^https?://')
  );
