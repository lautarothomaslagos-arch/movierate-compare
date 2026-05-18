# MovieRate Compare

Webapp para comparar el rating de una película en **IMDb, Rotten Tomatoes, Metacritic, TMDB, Letterboxd y Filmaffinity** en una sola búsqueda. Con historial persistente (DB para logueados, localStorage para anónimos) y recomendaciones.

## Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **TypeScript 5** estricto
- **Tailwind CSS v4** (con `@theme inline` en `globals.css`, sin `tailwind.config.js`)
- **shadcn/ui** (componentes copiados a mano en `components/ui/`)
- **Supabase** (Postgres + Auth con Google OAuth + RLS) usando `@supabase/ssr` con las keys nuevas (`sb_publishable_*` / `sb_secret_*`)
- **TanStack Query** para fetching en cliente
- **Zod** para validar respuestas de APIs externas
- **Cheerio** para scraping de Letterboxd y Filmaffinity
- **sonner** para toasts

## Setup local

### 1. Clonar e instalar

```bash
git clone <url-de-tu-repo>
cd movierate-compare
npm install
```

### 2. Conseguir las API keys

Necesitás 4 servicios:

#### a) TMDB

1. Crear cuenta en https://www.themoviedb.org
2. Ir a **Settings → API**
3. Pedir una API key (tipo "Developer") — completar el formulario
4. Cuando te la den copiá el **"API Read Access Token" (v4)** o el **"API Key (v3 auth)"** — el código lo detecta automáticamente

#### b) OMDb

1. Pedir clave gratis en https://www.omdbapi.com/apikey.aspx (1000 requests/día)
2. Te llega por mail un código de 8 caracteres

#### c) Supabase

1. Crear proyecto en https://supabase.com (gratis)
2. Una vez creado, andá a **Settings → API** y copiá:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **`sb_publishable_*`** — esta es la "publishable key" nueva (no la "anon key" vieja)
   - **`sb_secret_*`** — esta es la "secret key" nueva (no la "service_role" vieja)
3. Andá a **SQL Editor → New query** y pegá todo el contenido de [`supabase/schema.sql`](supabase/schema.sql). Click **Run**. Debería decir "Success. No rows returned".

#### d) Google OAuth (opcional — solo si querés que el historial sincronice en la nube)

1. Andá a https://console.cloud.google.com → crear proyecto
2. **APIs & Services → OAuth consent screen** → External → completar info básica → agregar tu mail como "Test user"
3. **APIs & Services → Credentials → + Crear credenciales → ID de cliente de OAuth**
   - Tipo: Web application
   - URIs de redireccionamiento autorizados: la **Callback URL** que muestra Supabase en `Authentication → Sign In / Providers → Google` (algo como `https://xxxx.supabase.co/auth/v1/callback`)
4. Copiar el **Client ID** y **Client Secret** que genera Google
5. En Supabase → **Authentication → Sign In / Providers → Google**: activar el toggle, pegar Client ID y Client Secret, **Save**
6. En Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: agregar `http://localhost:3000/auth/callback` y `http://localhost:3000/**`

### 3. Variables de entorno

Copiá el ejemplo y completalo:

```bash
cp .env.example .env.local
```

Editá `.env.local` con los 5 valores que conseguiste arriba:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
SUPABASE_SECRET_KEY=sb_secret_xxxx
TMDB_API_KEY=xxxx
OMDB_API_KEY=xxxx
```

### 4. Correr

```bash
npm run dev
```

Abrir http://localhost:3000.

## Cómo funciona

### Caché de ratings (importante por el límite de OMDb)

Tabla `ratings_cache` en Supabase con **TTL de 7 días**. Cada visita a `/movie/[id]`:

1. Lee de `ratings_cache` por `tmdb_id`
2. Si el row existe y `updated_at < 7 días` → devuelve cache
3. Sino → fetch en paralelo a TMDB + OMDb + Letterboxd + Filmaffinity con `Promise.allSettled`, escribe cache, devuelve

Una visita "fría" tarda ~2-3s; una "caliente" ~150ms (16x).

Si querés vaciar el cache:

```sql
truncate table ratings_cache;
```

### Scrapers

- **Letterboxd:** fetch a `letterboxd.com/film/<slug>/` con el slug del `original_title`. Parsea `meta[name="twitter:data2"]` o el JSON-LD `aggregateRating`. Escala 0-5 → multiplicamos por 2 para 0-10.
- **Filmaffinity:** búsqueda + página de detalle. Bloqueado por Cloudflare en la mayoría de IPs residenciales → suele devolver `null` ("No disponible" en la UI). Puede que ande mejor desde Vercel.

Timeout de 5s por scraper, nunca tiran excepción que rompa la respuesta.

### Auth y historial

- **Anónimo:** historial en `localStorage` clave `movierate:history:v1`, máximo 50 items
- **Logueado:** historial en tabla `history` de Supabase, ordenado por `last_viewed_at` desc, máximo 50 items
- RLS garantiza que cada user solo lee/escribe sus propias rows

## Estructura

```
app/
  page.tsx                          # Home con buscador
  layout.tsx                        # Layout root: dark mode, Header, Footer
  providers.tsx                     # TanStack Query
  globals.css                       # Tailwind v4 + tema shadcn
  error.tsx                         # Error boundary global
  not-found.tsx                     # 404 global
  movie/[tmdbId]/
    page.tsx                        # Detalle de peli (server, Suspense para ratings + recs)
    loading.tsx                     # Skeleton mientras carga
    not-found.tsx                   # 404 cuando el id no existe en TMDB
  api/
    search/route.ts                 # GET /api/search?q=...
    ratings/[tmdbId]/route.ts       # GET /api/ratings/[tmdbId]
    recommendations/[tmdbId]/route.ts
  auth/callback/route.ts            # OAuth callback
  historial/
    page.tsx                        # Página de historial (server)
    DbHistoryList.tsx               # Lista (logueado)
    LocalHistoryList.tsx            # Lista (anónimo, localStorage)
    HistoryItemCard.tsx             # Item individual con delete
  actions/history.ts                # Server actions: delete, clear

components/
  ui/                               # shadcn (button, card, input, skeleton, avatar, dropdown-menu)
  Header.tsx                        # Header global con auth state
  LoginButton.tsx                   # Sign in with Google
  UserMenu.tsx                      # Dropdown del avatar
  Footer.tsx                        # Disclaimer global
  AuthErrorToast.tsx                # Toast en home si ?error=auth_callback_failed
  SearchBar.tsx                     # Autocomplete con debounce 300ms
  RatingCard.tsx                    # Card de una plataforma
  RatingsSection.tsx                # Grid de 6 cards
  MovieGrid.tsx                     # Grid scrollable horizontal (recomendaciones)
  RecommendationsSection.tsx
  TrackVisit.tsx                    # Persiste visita anónima en localStorage

lib/
  tmdb.ts                           # Wrapper TMDB (Bearer auth, detecta v3/v4)
  omdb.ts                           # Wrapper OMDb + helpers de parsing
  ratings.ts                        # getRatings(tmdbId): cache + fetch en paralelo
  letterboxd.ts                     # Scraper
  filmaffinity.ts                   # Scraper (bloqueado por Cloudflare)
  history.ts                        # Helpers de DB
  history-local.ts                  # Helpers de localStorage
  supabase/
    client.ts                       # createBrowserClient (PUBLISHABLE)
    server.ts                       # createServerClient + createServiceClient (SECRET)
    middleware.ts                   # updateSession para proxy.ts
  utils.ts                          # cn() helper

types/
  movie.ts                          # Schemas Zod (TMDB + OMDb) + RatingsResponse

supabase/
  schema.sql                        # SQL idempotente para crear tablas + RLS

proxy.ts                            # Next 16 reemplazo de middleware.ts (refresh de sesión)
next.config.ts                      # remotePatterns para image.tmdb.org
.env.example                        # plantilla de env vars
```

## Deploy en Vercel

1. Pushear el repo a GitHub
2. En https://vercel.com → **Add New → Project** → importar el repo
3. **Environment Variables** → pegar las 5 vars de `.env.local`
4. **Deploy**
5. Cuando termine, copiar la URL final (algo como `https://movierate-compare.vercel.app`)
6. **Actualizar Supabase:**
   - **Authentication → URL Configuration → Site URL**: cambiar a la URL de Vercel
   - **Redirect URLs**: agregar `https://tu-app.vercel.app/auth/callback` y `https://tu-app.vercel.app/**`
7. La callback URL de Google **no cambia** (sigue apuntando a Supabase)

## Notas técnicas

- **Next 16 → `proxy.ts`**, no `middleware.ts` (deprecado en 16). Runtime nodejs (no edge).
- **`params` y `searchParams` son `Promise`** — siempre `await`.
- **Dark mode forzado** vía `<html className="dark">` en el root layout, sin toggle.
- **Idioma UI:** español argentino (vos/tenés).
- **Tailwind v4** sin `tailwind.config.js` — todo el tema vive en `app/globals.css`.

## Licencia

MIT — uso personal/educativo. Datos de películas © TMDB, OMDb, IMDb, Rotten Tomatoes, Metacritic, Letterboxd, Filmaffinity.
