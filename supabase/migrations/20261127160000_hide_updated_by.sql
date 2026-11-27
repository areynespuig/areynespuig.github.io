-- El contenido publicado se sigue pudiendo leer sin sesión (es lo mismo que muestra la web),
-- pero sin la columna updated_by: era el identificador de la cuenta de administrador.
-- La web y el editor solo leen id, content y updated_at.

revoke select on table public.site_content from anon, authenticated;
grant select (id, content, updated_at) on table public.site_content to anon, authenticated;
