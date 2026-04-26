alter table public.catalog_exercises
  add column if not exists image_url text,
  add column if not exists image_source text,
  add column if not exists image_credit text,
  add column if not exists image_license text,
  add column if not exists image_status text default 'pending',
  add column if not exists image_updated_at timestamptz;

alter table public.catalog_machines
  add column if not exists image_url text,
  add column if not exists image_source text,
  add column if not exists image_credit text,
  add column if not exists image_license text,
  add column if not exists image_status text default 'pending',
  add column if not exists image_updated_at timestamptz;

alter table public.muscles
  add column if not exists image_url text,
  add column if not exists image_source text,
  add column if not exists image_credit text,
  add column if not exists image_license text,
  add column if not exists image_status text default 'pending',
  add column if not exists image_updated_at timestamptz;

alter table public.muscle_subgroups
  add column if not exists image_url text,
  add column if not exists image_source text,
  add column if not exists image_credit text,
  add column if not exists image_license text,
  add column if not exists image_status text default 'pending',
  add column if not exists image_updated_at timestamptz;

insert into storage.buckets (id, name, public)
values ('gym-catalog-images', 'gym-catalog-images', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

drop policy if exists gym_catalog_images_select on storage.objects;
drop policy if exists gym_catalog_images_insert on storage.objects;
drop policy if exists gym_catalog_images_update on storage.objects;
drop policy if exists gym_catalog_images_delete on storage.objects;

create policy gym_catalog_images_select on storage.objects
for select to public
using (bucket_id = 'gym-catalog-images');

create policy gym_catalog_images_insert on storage.objects
for insert to public
with check (bucket_id = 'gym-catalog-images');

create policy gym_catalog_images_update on storage.objects
for update to public
using (bucket_id = 'gym-catalog-images')
with check (bucket_id = 'gym-catalog-images');

create policy gym_catalog_images_delete on storage.objects
for delete to public
using (bucket_id = 'gym-catalog-images');

notify pgrst, 'reload schema';
