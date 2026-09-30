create table if not exists public.business_product_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  image_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.business_product_images enable row level security;

drop policy if exists "Anyone can view business product images" on public.business_product_images;
create policy "Anyone can view business product images"
  on public.business_product_images for select to anon, authenticated
  using (true);

drop policy if exists "Owners can add product images to their businesses" on public.business_product_images;
create policy "Owners can add product images to their businesses"
  on public.business_product_images for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.businesses
      where businesses.id = business_id
        and businesses.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners can remove their product images" on public.business_product_images;
create policy "Owners can remove their product images"
  on public.business_product_images for delete to authenticated
  using (owner_id = (select auth.uid()));

create or replace function public.enforce_business_product_image_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_count integer;
begin
  perform 1
  from public.businesses
  where id = new.business_id
    and owner_id = new.owner_id
  for update;

  if not found then
    raise exception 'You can only add images to a business you own.';
  end if;

  select count(*) into current_count
  from public.business_product_images
  where business_id = new.business_id;

  if current_count >= 15 then
    raise exception 'A business can have at most 15 product images. Remove an image before adding another.';
  end if;

  return new;
end;
$$;

drop trigger if exists limit_business_product_images on public.business_product_images;
create trigger limit_business_product_images
  before insert on public.business_product_images
  for each row execute function public.enforce_business_product_image_limit();

create index if not exists business_product_images_business_id_created_at_idx
  on public.business_product_images (business_id, created_at);

drop policy if exists "Users can delete images in their own folder" on storage.objects;
create policy "Users can delete images in their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );