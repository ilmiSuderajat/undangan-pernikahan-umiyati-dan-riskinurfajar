create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  attendance text not null check (attendance in ('datang', 'berhalangan')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.wishes enable row level security;

drop policy if exists "Anyone can read wishes" on public.wishes;
create policy "Anyone can read wishes"
on public.wishes
for select
to anon
using (true);

drop policy if exists "Anyone can create wishes" on public.wishes;
create policy "Anyone can create wishes"
on public.wishes
for insert
to anon
with check (
  length(trim(name)) between 1 and 80
  and length(trim(message)) between 1 and 1000
  and attendance in ('datang', 'berhalangan')
);

insert into storage.buckets (id, name, public)
values ('wedding-gallery', 'wedding-gallery', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read wedding gallery" on storage.objects;
create policy "Anyone can read wedding gallery"
on storage.objects
for select
to anon
using (bucket_id = 'wedding-gallery');
