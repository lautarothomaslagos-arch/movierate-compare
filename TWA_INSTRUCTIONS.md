# MovieRate Compare — Cómo publicar en Google Play Store

Guía paso a paso para wrappear tu PWA en una app Android nativa usando
**Trusted Web Activity (TWA)** y publicarla en Play Store.

Tiempo estimado: ~2 horas + 1-3 días de review de Google.
Costo: $25 USD one-time (cuenta Play Console).

---

## 1. Preparación

Necesitás tener instalado:

- **Node.js** 18+ (ya lo tenés)
- **Java JDK** 17+ (necesario para firmar el APK)
- **Android SDK** (bubblewrap lo descarga solo si no lo tenés)

Instalá la CLI de bubblewrap:

```bash
npm install -g @bubblewrap/cli
```

---

## 2. Inicializar el proyecto TWA

Desde una carpeta cualquiera (NO dentro del proyecto Next.js — bubblewrap
crea su propia carpeta Android):

```bash
mkdir twa-movierate && cd twa-movierate

bubblewrap init --manifest=https://movierate-compare.vercel.app/manifest.json
```

Te va a hacer preguntas. Respondé:

- **Package name**: `app.movierate.compare` (debe matchear lo que está
  en `public/.well-known/assetlinks.json` del repo)
- **App version**: `1.0.0` (versionCode 1)
- **Display mode**: `standalone`
- **Orientation**: `portrait`
- **Theme color**: `#241d12` (coincide con manifest)
- **Background color**: `#241d12`
- **Splash screen**: usar el icon de la web
- **Signing key**: dejá que cree una nueva (`Create new`) y guardalo
  bien. Anotá la password.

---

## 3. Obtener el SHA-256 fingerprint de la firma

Bubblewrap te muestra el SHA-256 después del init. Si te lo perdiste:

```bash
bubblewrap fingerprint
```

Copiá el SHA-256 (formato `XX:XX:XX:...`).

---

## 4. Actualizar `assetlinks.json` en el repo

Editá `public/.well-known/assetlinks.json` y pegá el SHA-256:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.movierate.compare",
      "sha256_cert_fingerprints": [
        "AB:CD:EF:01:23:..."
      ]
    }
  }
]
```

Commit, push, esperá el deploy de Vercel.

Verificá que el archivo está accesible:
`https://movierate-compare.vercel.app/.well-known/assetlinks.json`

Si responde el JSON, está OK. Esto es lo que valida Chrome al abrir la
TWA — si no está bien, vas a ver una barra de URL fea encima de tu app.

---

## 5. Generar el AAB

```bash
bubblewrap build
```

Esto genera `app-release-signed.aab` en la carpeta. Es el archivo que
sube a Play Console.

---

## 6. Cuenta Google Play Console

Andá a [play.google.com/console](https://play.google.com/console).

- Pagás $25 USD (one-time, vale para todas tus apps).
- Crear cuenta de desarrollador (te piden datos personales/empresa).
- Verificación de identidad (lleva 1-3 días).

---

## 7. Crear la app en Play Console

1. Apps → **Create app**
2. App name: **MovieRate Compare**
3. Default language: Spanish (Argentina)
4. App or game: **App**
5. Free or paid: **Free**
6. Tildá las declaraciones.

---

## 8. Listing (cómo se ve en Play Store)

En **Main store listing**:

- **Short description** (80 chars):
  "Ratings de pelis y series de IMDb, RT, Metacritic y TMDB en uno."

- **Full description** (4000 chars):
  ```
  MovieRate Compare promedia las notas de las cinco grandes plataformas
  (IMDb, Rotten Tomatoes, Metacritic, TMDB, Letterboxd) en una sola
  búsqueda. Mirá el ranking general y decidí en segundos qué ver.

  Recomendador IA que cruza tu historial, watchlist y tus propias notas
  para sugerirte cinco títulos personalizados cada semana.

  Curiosidades de cada película generadas con IA. Compará hasta cuatro
  títulos lado a lado en un gráfico radar. Mirá dónde verla en streaming
  según tu país. Disfrutá del catálogo completo de TMDB en español.
  ```

- **App icon**: 512x512 PNG. Tomá el `/icon.svg` y exportalo.

- **Feature graphic**: 1024x500 PNG (banner que sale arriba en Play).

- **Screenshots**: mínimo 2, máximo 8. Tomálos del browser en mobile
  (DevTools → device mode).

- **Categoría**: Entertainment

- **Content rating**: Completá el questionnaire — la app es **Everyone
  10+** probablemente (tiene posters que pueden ser PG-13).

- **Target audience**: 13+

- **Política de privacidad**: necesitás una URL pública. Creá una página
  `/privacidad` en la app (te ayudo si querés). Mínimo: qué datos
  guardás (Supabase: email + historial + reviews) y que no compartís
  con terceros.

---

## 9. Subir el AAB

1. Production → Create new release
2. Subir `app-release-signed.aab`
3. Release name: `1.0.0`
4. Release notes: "Primera versión"
5. **Save → Review release → Start rollout to production**

---

## 10. Review de Google

Toma 1-3 días. Te llega un email cuando aprueban o rechazan.

Si rechazan, leé el motivo (suelen ser cosas de privacidad o
descripciones). Corregís y volvés a enviar.

Una vez aprobado: aparece en Play Store buscando "MovieRate" o por el
nombre exacto.

---

## Bonus: iOS

Para Apple Store es más caro y largo:
- Cuenta Apple Developer: **$99 USD/año** (no one-time).
- Necesitás envolver con **Capacitor** o **Expo**.
- Review de Apple es más estricta (rechazan apps "que son solo wrapper
  de web").

Mi recomendación: esperá a tener tracción en Android antes de iOS.

---

## Si algo se rompe

- **Barra de URL en la TWA**: el `assetlinks.json` no matchea. Verificá
  el SHA-256 y el package_name.
- **App no se abre offline**: el SW tarda en cachear. Visitá un par de
  páginas online primero.
- **No me aparece en Play Store después de aprobado**: tarda hasta 2 hs
  más en propagar. Buscá por nombre exacto.

Cualquier duda, decime.
