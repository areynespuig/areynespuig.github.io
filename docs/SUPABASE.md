# Conectar el portafolio a Supabase

Con esto, el editor de `/admin/` pide correo y contraseña, guarda el contenido en una base de datos de Supabase con historial de versiones y sube las fotos y el CV a Supabase Storage. Lo que publicas se ve al momento: la web lee la última versión de Supabase al abrirse. Además, GitHub vuelve a generar el HTML con el contenido nuevo, que es lo que leen los buscadores y lo que se ve si Supabase no responde.

## Cómo queda protegido

- **Solo tu cuenta puede editar.** Los cambios en la base de datos pasan por políticas de Row Level Security que solo dejan escribir a los usuarios de la tabla `admins`. Aunque alguien descargue el código del editor, sin tu sesión no puede cambiar nada.
- **No hay registro público.** Tu usuario lo creas tú desde el panel y el registro queda desactivado.
- **No hay secretos en la web.** La web solo lleva la URL del proyecto y la clave *publishable*, que son públicas por diseño. El token de GitHub se guarda como secreto en Supabase y solo lo usa la función `publish`.
- **La sesión dura lo que la pestaña.** Se guarda en `sessionStorage`, no en el almacenamiento permanente que comparten todas las páginas de `areynespuig.github.io`.
- **Nada se pierde.** Cada publicación guarda una copia en `site_content_versions`, y el editor te deja recuperar cualquiera desde «Historial».

## Pasos

### 1. Crea el proyecto

1. Entra en [supabase.com](https://supabase.com), crea una cuenta y un proyecto nuevo (*New project*).
2. Elige una región de Europa.
3. Guarda la contraseña de la base de datos en tu gestor de contraseñas. El editor no la usa.

### 2. Crea las tablas

1. En el panel, abre **SQL Editor**.
2. Pega todo `supabase/migrations/20261125230000_portfolio.sql` y pulsa **Run**.
3. Pega `supabase/seed.sql` y pulsa **Run**. Copia el contenido actual de la web en la base de datos.

### 3. Cierra el registro

En **Authentication › Sign In / Providers › Email**:

- Desactiva **Allow new users to sign up**.
- Si aparece, sube la longitud mínima de la contraseña a 12 caracteres o más.

### 4. Crea tu usuario

1. En **Authentication › Users**, pulsa **Add user › Create new user**.
2. Escribe tu correo y una contraseña larga que solo tú conozcas; lo mejor es generarla con tu gestor de contraseñas.
3. Marca **Auto Confirm User**.

### 5. Date permiso de editor

En **SQL Editor**, ejecuta esto con tu correo:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'TU_CORREO';
```

### 6. Crea el token de GitHub para actualizar la web

1. Abre [crear un token en GitHub](https://github.com/settings/personal-access-tokens/new).
2. En **Repository access**, elige **Only select repositories** y marca `areynespuig.github.io`.
3. En **Permissions › Repository permissions**, da a **Actions** acceso **Read and write**. Con eso puede lanzar el despliegue, pero no cambiar el código.
4. Pon una caducidad (por ejemplo, 90 días) y apunta cuándo tendrás que renovarlo.
5. Copia el token.
6. En Supabase, abre **Edge Functions › Secrets** y crea el secreto `GITHUB_TOKEN` con ese valor.

### 7. Despliega la función `publish`

Puedes hacerlo de dos formas.

**Con la terminal** (desde la carpeta del proyecto):

```
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase functions deploy publish
```

`TU_PROJECT_REF` es el código que aparece en la URL del proyecto: `https://TU_PROJECT_REF.supabase.co`.

**Desde el panel:**

1. Abre **Edge Functions › Deploy a new function › Via Editor**.
2. Llámala `publish` y pega el contenido de `supabase/functions/publish/index.ts`.
3. En los ajustes de la función, desactiva **Enforce JWT verification**. La función ya comprueba la sesión y el permiso de administrador por sí misma.

### 8. Conecta la web

1. En **Project Settings › API Keys**, copia la **Project URL** y la **publishable key** (`sb_publishable_…`).
2. Pégalas en `src/lib/config.ts`, en `SUPABASE.url` y `SUPABASE.publishableKey`.
3. Haz commit y súbelo a `main`. El workflow volverá a generar la web leyendo el contenido de Supabase.

No pongas nunca la **secret key** (`sb_secret_…` o `service_role`) en el código.

### 9. Pruébalo

1. Abre `https://areynespuig.github.io/admin/` y entra con tu correo y contraseña.
2. Cambia un texto y pulsa **Publicar**.
3. En uno o dos minutos, la web mostrará el cambio. La versión anterior quedará en «Historial».

## Si algo falla

- **«Esta cuenta no tiene permiso para editar»:** falta el paso 5, o el correo no coincide.
- **«Publicado: ya se ve en la web. Pero GitHub no ha regenerado la versión para buscadores»:** los visitantes ya ven el cambio, porque la web lee Supabase al abrirse; lo que falla es regenerar el HTML que leen los buscadores. El mensaje incluye el motivo. Lo habitual es que el secreto `GITHUB_TOKEN` (paso 6) falte, haya caducado o no tenga permiso **Actions: Read and write**, o que la función no esté desplegada (paso 7). Cuando lo arregles, pulsa «Regenerar la web».
- **El despliegue de GitHub falla al leer Supabase:** la web publicada se queda como estaba. Revisa la URL y la clave del paso 8.
