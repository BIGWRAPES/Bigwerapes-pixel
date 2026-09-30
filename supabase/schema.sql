create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  account_type text not null default 'student' check (account_type in ('student', 'entrepreneur')),
  created_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  business_name text not null,
  category text not null,
  description text not null default '',
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Anyone can view businesses"
  on public.businesses for select to anon, authenticated
  using (true);

create policy "Owners can add their own businesses"
  on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners can update their own businesses"
  on public.businesses for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners can delete their own businesses"
  on public.businesses for delete to authenticated
  using (owner_id = (select auth.uid()));

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    case
      when new.raw_user_meta_data ->> 'account_type' = 'entrepreneur' then 'entrepreneur'
      else 'student'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-images', 'business-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view business images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'business-images');

create policy "Users can upload images into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update images in their own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'business-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete images in their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );