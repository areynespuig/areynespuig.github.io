-- Base de datos del portafolio.
--
-- · site_content guarda el contenido publicado de la web (una sola fila, id = 'main').
-- · site_content_versions guarda una copia de cada versión publicada (la rellena un trigger).
-- · admins dice qué usuarios pueden editar. No es accesible desde la web: se rellena desde el panel de Supabase.
-- · El bucket "portfolio" guarda las fotos, imágenes de proyectos y el CV que se suben desde el editor.
--
-- Todo lo que no permiten estas políticas queda bloqueado por Row Level Security.

-- Quién puede editar ---------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Contenido publicado ----------------------------------------------------------

create table public.site_content (
  id text primary key default 'main' check (id = 'main'),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint site_content_shape check (
    jsonb_typeof(content) = 'object'
    and content ?& array['profile', 'hero', 'about', 'education', 'experience', 'projects', 'meta']
    and jsonb_typeof(content -> 'education') = 'array'
    and jsonb_typeof(content -> 'experience') = 'array'
    and jsonb_typeof(content -> 'projects') = 'array'
  ),
  constraint site_content_size check (pg_column_size(content) < 1000000)
);

alter table public.site_content enable row level security;
revoke all on table public.site_content from anon, authenticated;
grant select on table public.site_content to anon, authenticated;
grant insert, update on table public.site_content to authenticated;

-- Cualquiera puede leer lo publicado: es lo mismo que ya muestra la web.
create policy "Lectura pública del contenido"
  on public.site_content for select
  to anon, authenticated
  using (true);

create policy "Solo el administrador crea el contenido"
  on public.site_content for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Solo el administrador cambia el contenido"
  on public.site_content for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Historial ----------------------------------------------------------------------

create table public.site_content_versions (
  id bigint generated always as identity primary key,
  content jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

alter table public.site_content_versions enable row level security;
revoke all on table public.site_content_versions from anon, authenticated;
grant select on table public.site_content_versions to authenticated;

create policy "Solo el administrador ve el historial"
  on public.site_content_versions for select
  to authenticated
  using ((select public.is_admin()));

-- Cada vez que se publica, se guarda una copia en el historial y se apunta quién y cuándo.
create or replace function public.site_content_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  insert into public.site_content_versions (content, created_by) values (new.content, new.updated_by);
  return new;
end;
$$;

create trigger site_content_before_write
  before insert or update on public.site_content
  for each row execute function public.site_content_before_write();

-- Archivos (fotos, imágenes y PDF) -------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio',
  'portfolio',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'application/pdf']
)
on conflict (id) do nothing;

-- El bucket es público para leer (la web enlaza los archivos). Solo el administrador sube, cambia o borra.
create policy "Solo el administrador sube archivos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'portfolio' and (select public.is_admin()));

create policy "Solo el administrador cambia archivos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'portfolio' and (select public.is_admin()))
  with check (bucket_id = 'portfolio' and (select public.is_admin()));

create policy "Solo el administrador borra archivos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'portfolio' and (select public.is_admin()));
