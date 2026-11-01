# 今晚吃什么 · Tonight's Kitchen

A cozy, mobile-first dinner PWA for two people: **one orders, one cooks**.

The entire UI is in Simplified Chinese. When Supabase is not configured the app runs on a complete local demo dataset, so it works immediately after `npm install`.

- **Diner (点餐员)** — browse a categorized menu, build tonight's order, write wishlist requests, rate past dinners.
- **Chef (大厨)** — see tonight's live order, toggle dishes between 备餐中 / 已上菜, manage the menu, upload dish photos, turn wishes into real dishes.
- **Shared from RedNote (小红书)** — share a note to the installed app and it lands in the chef's wish inbox, ready for an AI-assisted quick fill.

Built with **Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase · PWA**.

---

## Quick start (no backend required)

Requirements: Node.js 20.9+ and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

On first launch you get a **local demo kitchen** seeded with 25 common Chinese home-cooked dishes, a completed dinner from yesterday (with ratings), and two wishlist items. Everything is stored in this browser's `localStorage`, so it survives refreshes but does not sync between devices.

Choose **点餐员** or **大厨** on the landing screen and start using the app.

> Reset the demo at any time: **设置 → 重置演示数据**.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (service worker is intentionally off in dev) |
| `npm run build` | Production build |
| `npm start` | Serve the production build (needed to test PWA install/offline) |
| `npm run typecheck` | TypeScript check without emitting |
| `npm test` | Unit tests for the `/import` parser, the AI draft normaliser and the localStorage adapter (Node 22.18+ / 24, no extra dependencies) |
| `npm run test:e2e` | Playwright smoke test of the share-import flow (`npx playwright install chromium` once) |
| `npm run icons` | Regenerate the PNG app icons in `public/icons` |

### Tests

Three layers, all runnable offline:

1. **Unit tests** — `npm test` runs [`tests/`](tests) on Node's built-in `node:test` with native TypeScript type stripping:
   - `share-import.test.ts` — the `/import` URL parameter parser
   - `ai-recipe.test.ts` — category mapping, calorie clamping, tolerant JSON parsing
   - `local-api.test.ts` — the localStorage adapter: share dedupe, `completeWish`, legacy-data migration
2. **End-to-end smoke test** — `npm run test:e2e` drives Chromium through `/import` → 心愿收件箱 → 整理菜谱 → 已上架 at a 360×640 viewport. `playwright.config.ts` starts `next dev` with empty Supabase/OpenRouter env vars, so it always uses the demo kitchen and never touches real data or API credits. Playwright lives in `devDependencies` only.
3. **CI** — [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `npm test`, `npm run typecheck`, `npm run build` and the Playwright job on every pull request.

---

## Connect Supabase (free)

You need a Supabase project to sync data between the two phones.

### 1. Create a project

1. Go to <https://supabase.com> and sign in.
2. **New project** → choose an organization, name it (e.g. `tonights-kitchen`), set a database password, pick the region closest to you.
3. Wait for the project to finish provisioning.

### 2. Create the database

1. In the Supabase sidebar open **SQL Editor → New query**.
2. Copy the full contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.

This creates:

- `dishes`, `orders`, `order_items`, `ratings`, `wishlist`
- Row Level Security policies
- the public `dish-images` storage bucket + upload policies
- Realtime on all five tables

### 3. Load the demo menu (optional)

On a brand-new project, run [`supabase/seed.sql`](supabase/seed.sql) once to preload the same 25 dishes, one completed dinner, and two wishes.

> ⚠️ Run `seed.sql` only once. Running it twice duplicates the rows.
> You can skip it and add dishes by hand in the chef UI instead.

### 4. Copy the API credentials

In Supabase: **Project Settings → API**.

Copy:

- **Project URL** — `https://xxxx.supabase.co`
- **anon public key**

> The anon key is meant to be public in the browser. Access control comes from the RLS policies in `schema.sql`. See the security note below before sharing the URL widely.

### 5. Add environment variables

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Restart the dev server. The landing page footer should now say **云端厨房已连接**, and 设置 → 数据存放 should show **Supabase 云端**.

### 6. Enable anonymous sign-in (optional, recommended)

The app requests an anonymous Supabase Auth session so writes and uploads are associated with a real auth user:

1. Supabase → **Authentication → Providers**.
2. Enable **Anonymous sign-ins**.

If you skip this, the app still works because the RLS policies also permit the `anon` role. The only difference is that requests are not tied to an auth session.

### 7. Verify Storage & Realtime

- **Storage** → you should see a public bucket named `dish-images`.
- **Database → Publications** → `supabase_realtime` should include the five kitchen tables (the schema script does this automatically).

If you created the project before running the schema, re-running `schema.sql` is safe.

### 8. Test on both phones (optional)

Run the dev server on your local network:

```bash
npm run dev -- --hostname 0.0.0.0
```

Then open `http://<your-computer-LAN-IP>:3000` on the phones connected to the same Wi-Fi. Allow Node through the Windows firewall if prompted.

Supabase sync works over the internet, so after deploying to Vercel you can use the app from anywhere.

---

## Deploy to Vercel (free)

1. Push this repository to GitHub.
2. Go to <https://vercel.com/new> and import the repository.
3. Framework preset: **Next.js** (auto-detected). No build settings need changing.
4. Add the environment variables under **Environment Variables**:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `OPENROUTER_API_KEY` | *(optional)* server-side key for the AI auto-fill button |

   Add them to **Production**, **Preview**, and **Development**.
5. Click **Deploy**.

Vercel serves the app over HTTPS, which is required for service workers and "Add to Home Screen". After the first deploy, open the URL on both phones and install it.

> `NEXT_PUBLIC_*` values are inlined at build time. If you change them in Vercel, trigger a new deployment.

### Optional: connect a custom domain

Vercel → Project → **Settings → Domains** → add your domain and follow the DNS instructions. No app changes needed.

### Free-tier notes

- Vercel Hobby is free for personal projects.
- Supabase Free includes 500 MB database, 1 GB file storage, and pauses after long inactivity. A paused project resumes automatically when used, but the first request may be slow.
- The app performs no background jobs or server-side rendering of user data, so it fits comfortably in both free tiers.

---

## PWA: install & offline

The service worker deliberately **does not register in development** to avoid stale dev caches.

Test the real PWA with:

```bash
npm run build
npm start
```

Then open <http://localhost:3000> (localhost is treated as a secure origin).

### Android / Chrome

1. Open the site in Chrome.
2. Tap the **⋮** menu → **Install app** / **添加到主屏幕**.
3. Or use the in-app **安装到桌面** prompt when it appears.

### iPhone / iPad

1. Open the site in **Safari** (only Safari can install web apps on iOS).
2. Tap the **Share** button.
3. Choose **添加到主屏幕**.

### What is cached

- App shell pages (network-first, with a self-contained offline fallback for pages you have not visited yet)
- `/_next/static/*` assets and icons
- Dish images (cache-first)

The manifest lives at [`public/manifest.json`](public/manifest.json) and the service worker at [`public/sw.js`](public/sw.js). Icons are generated by `npm run icons`.

> After deploying a new version, the next navigation fetches fresh HTML. If you ever need to force an update, bump `VERSION` at the top of `public/sw.js` (e.g. `v1` → `v2`).

### Share a RedNote note to the app

`public/manifest.json` declares a **Web Share Target**:

```json
"share_target": {
  "action": "/import",
  "method": "GET",
  "params": { "title": "title", "text": "text", "url": "url" }
}
```

1. Install the app to the home screen (required — a browser tab cannot receive shares).
2. In 小红书 open a note → **分享** → **今晚吃什么**.
3. The app opens `/import?title=…&text=…&url=…`, saves the note as a `pending_review` wish and shows a quick toast.
4. The chef opens **心愿 → 心愿收件箱**, taps **查看原笔记** or **整理菜谱** to complete it.

Notes:

- Web Share Target is supported on **Android / Chromium and Edge**. iOS Safari does not implement it, so iPhone users use the **iOS Shortcut** below instead.
- Links and share boilerplate are cleaned up by [`lib/share-import.ts`](lib/share-import.ts); the same URL is never queued twice.
- The same route works in local demo mode, so you can paste a share URL into the address bar to try it without a phone.

---

## Optional: AI auto-fill with OpenRouter

The chef's **整理菜谱** sheet has an **自动填写食材和热量** button. It sends the note text and/or a screenshot to `POST /api/ai/recipe`, which calls [OpenRouter](https://openrouter.ai) and returns a title, category, estimated calories, ingredients and steps.

1. Create a key at <https://openrouter.ai/keys>.
2. Add it to `.env.local` (and to your Vercel project):

   ```env
   OPENROUTER_API_KEY=sk-or-v1-...
   # optional: any image-capable OpenRouter model
   OPENROUTER_MODEL=openai/gpt-4o-mini
   ```

3. Restart `npm run dev` (or redeploy on Vercel).

The key is **server-side only** — it has no `NEXT_PUBLIC_` prefix, so it is never included in the browser bundle. Without a key the route answers `503` and the modal simply asks you to fill the form by hand; the app never breaks. Requests are throttled to 8 per minute per IP.

---

## iOS Shortcut & Back Tap Integration

### Why a Shortcut?

RedNote (小红书) does not expose a native iOS share-sheet target for web apps, so the installed PWA cannot appear in its share panel on iPhone. Instead, a Shortcut reads the copied RedNote link from the iPhone clipboard and posts it straight to Supabase, where it lands in the chef's **心愿收件箱**.

> Needs cloud mode (Supabase). The local demo kitchen lives in the browser and cannot be written from a Shortcut.

### What the Shortcut writes

**Endpoint**

```text
POST https://rcqvaxjpuanzpzgxgfgy.supabase.co/rest/v1/wishlist
```

**Headers**

| Header | Value |
| --- | --- |
| `apikey` | `<SUPABASE_ANON_KEY>` |
| `Authorization` | `Bearer <SUPABASE_ANON_KEY>` |
| `Content-Type` | `application/json` |
| `Prefer` | `return=minimal` |

**JSON payload**

```json
{
  "rednote_url": "[URLs from Clipboard]",
  "status": "pending_review"
}
```

Notes:

- `title` is optional — the chef's **整理菜谱** sheet reads the link preview (Open Graph tags) and fills the title, note and cover image, then the AI parser guesses ingredients, category and calories.
- `source` is left to the column default. Any pending row that carries a `rednote_url` shows up in 心愿收件箱, regardless of its `source`.
- The partial unique index allows only **one pending inbox item per URL**, so posting the same note twice returns `409` — safe to ignore in the Shortcut.

### iPhone setup

1. Create a new Shortcut named **Add to Kitchen** (Shortcuts → **+** → name it).
2. **Action 1** — *Get URLs from* **[Clipboard]**.
3. **Action 2** — *Get contents of* **[URL]** (the magic variable from Action 1), configured with the POST request above: method **POST**, the four headers, and the JSON body `{"rednote_url": <URL>, "status": "pending_review"}`.
4. Open 设置 → 辅助功能 → 触控 → 轻点背面 → 轻点两下 → choose **Add to Kitchen**.

**Usage:** inside RedNote tap **分享 → 复制链接**, then double-tap the back of the iPhone. Open the app → **心愿 → 心愿收件箱** and the link is waiting.

> Optional: add **Show Notification** (`已送进心愿收件箱`) after Action 2 so the Shortcut confirms itself.

### Security & limits

- The anon key is public by design for this private kitchen (see the security note below). Anyone holding it can insert rows.
- RedNote frequently blocks server-side preview fetches. When autofill reports a failure, paste the note text or add a screenshot in **整理菜谱** — the manual form and the AI parser still work.
- The Shortcut is iOS-only; Android users use the **Web Share Target** described above.

---

## How it works

### Tonight's order lifecycle

1. The diner taps **今晚想吃** on any dish. A draft order for today (China time, `Asia/Shanghai`) is created automatically. Re-adding the same dish is prevented.
2. On **今晚菜单** the diner adds a note and submits. The order status becomes `submitted`.
3. The chef sees the order on **订单**, flips each dish to `preparing` / `served`, can mark all served, then taps **结束今晚**.
4. Completed orders move to **回顾**, where each dish can be rated 1–5 stars with a comment. Ratings can be edited later.
5. New dishes can still be added after submission — they arrive as `pending` and sync to the chef immediately.

### Wishes → menu

A wish is either `manual` (written on the diner's 心愿 page) or `share` (sent from RedNote through `/import`). Both start as `pending_review`:

- **Manual wishes** appear under 待实现. The chef taps **做成这道菜**; the dish form opens prefilled and saving creates the dish.
- **Shared wishes** appear in 心愿收件箱 with **查看原笔记** and **整理菜谱**. Rows that only carry a `rednote_url` (iOS Shortcut) show the fallback title 小红书收藏的菜 until reviewed. The review sheet reads the link preview (`GET /api/link-meta`), fills title/note/cover, can auto-fill ingredients, category, calories and steps with AI, and saving creates the dish, stores the reviewed ingredients/calories/cover on the wish and marks it `ready`.
- **用完整表单做成这道菜** opens the regular dish form for the same wish. The saved `rednote_url` is carried into 外部菜谱链接 automatically and the form has its own AI panel, so the link is never lost when you publish from there.

Either way the wish becomes `ready` with a link to the new dish, and the diner sees 大厨已经学会啦.

### Realtime

In Supabase mode the app subscribes to Postgres changes on all five tables and also refreshes on window focus/visibility. In local mode, changes sync between tabs via the `storage` event.

---

## Data model

| Table | Purpose |
| --- | --- |
| `dishes` | Menu items: name, category, calories, emoji, image URL, recipe steps, external link, active flag |
| `orders` | One dinner per night: date, status (`draft` / `submitted` / `completed`), note, timestamps |
| `order_items` | Dishes in an order with status (`pending` / `preparing` / `served`) |
| `ratings` | One rating + comment per dish per order (unique on `order_id, dish_id`) |
| `wishlist` | Wishes from the diner plus RedNote shares awaiting review: `title` (nullable — Shortcut rows start without one), `note`, `status` (`pending_review` / `ready`), `source` (`manual` / `share` / `rednote`), `rednote_url`, `cover_image`, `calories`, `ingredients`, optional link to the created dish |

Categories are fixed in [`lib/categories.ts`](lib/categories.ts): `staple`, `vegetable`, `meat`, `soup`, `snack`.

The TypeScript contract is in [`lib/types.ts`](lib/types.ts). Both the localStorage adapter and the Supabase adapter implement the same `KitchenApi` interface, which keeps the UI backend-agnostic.

---

## Project structure

```text
app/
  page.tsx                 Role picker / landing
  menu/                    Diner menu + categories + search
  order/                   Tonight's menu, note, submit
  wishlist/                Diner wishlist
  import/                  Web Share Target landing (saves to wish inbox)
  history/                 Past dinners + star ratings
  api/ai/recipe/           Server-only OpenRouter auto-fill route
  chef/
    orders/                Live kitchen order board
    menu/                  Menu management
    menu/new/              New dish form
    menu/[id]/             Edit dish form
    wishlist/              Wish approval + shared-wish inbox
    wishlist/[id]/         Convert a wish into a dish
  settings/                Role, data mode, install guide, reset
  offline/                 Standalone offline page (the service worker also has a tiny built-in fallback)
components/
  providers/KitchenProvider.tsx   Data + role + toasts + realtime
  layout/                  Header, bottom nav, toaster, error banner
  diner/DishCard.tsx
  chef/DishForm.tsx
  chef/WishReviewModal.tsx Edit / complete recipe + AI auto-fill
  ui/                      Buttons, images, stars, dialogs, etc.
  pwa/                     Service worker registration, install UI
lib/
  api/local.ts             localStorage demo adapter
  api/supabase.ts          Supabase adapter
  seed.ts                  25 mock dishes + demo history
  share-import.ts          Share-target parameter parser
  ai-recipe.ts             AI draft schema + normaliser
  categories.ts, types.ts, utils.ts
public/
  manifest.json, sw.js, icons/
supabase/
  schema.sql, seed.sql
scripts/
  generate-icons.mjs
tests/
  share-import.test.ts, ai-recipe.test.ts
```

---

## Customization

- **Colors / shape / type**: edit the `@theme` tokens at the top of [`app/globals.css`](app/globals.css). The palette is cream, warm amber, terracotta, sage, and cocoa ink.
- **Categories**: edit `CATEGORIES` in [`lib/categories.ts`](lib/categories.ts). Also update the SQL check constraint and the `Category` union in `lib/types.ts`.
- **Demo dishes**: edit [`lib/seed.ts`](lib/seed.ts) (local mode) and [`supabase/seed.sql`](supabase/seed.sql) (cloud mode).
- **App name / icons**: `app/layout.tsx`, `public/manifest.json`, `scripts/generate-icons.mjs`.
- **Safe-area / nav clearance**: utility classes `.above-nav`, `.pb-safe`, `.header-safe-top` in `globals.css`.

---

## Troubleshooting

**“Supabase 数据表还没创建…”**
Run `supabase/schema.sql` in the Supabase SQL Editor and press the retry button in the red banner.

**Images don't upload**
Check that the `dish-images` bucket exists and is public, and re-run the storage section of `schema.sql`. Uploads are compressed to JPEG in the browser before sending.

**Changes don't appear on the other phone**
Realtime may not be enabled. Check **Database → Publications → supabase_realtime** includes the kitchen tables, or simply pull to refresh / refocus the app. Re-running the schema's Realtime block is safe.

**The install prompt never shows**
It only appears on supported browsers (iOS Safari, Chromium). Production HTTPS is required. Use the manual **Add to Home Screen** steps above. The prompt is also dismissible, and the dismissal is stored locally.

**I still see an old version after deploying**
The service worker is network-first for pages but may keep old static chunks. Bump `VERSION` in `public/sw.js`, redeploy, and reopen the app. In dev tools you can also unregister the worker.

**Local demo data disappeared**
`localStorage` is per browser and per origin; private browsing, clearing site data, or switching from localhost to a deployed URL starts a fresh kitchen.

**iOS input zoom**
Inputs are set to 16px minimum in `globals.css`, which prevents Safari's auto-zoom.

**The share sheet has no 今晚吃什么 entry**
Web Share Target needs the app installed to the home screen and a Chromium browser on Android (iOS Safari does not support it yet). Open the app once after updating and make sure you are on the latest deployment.

**AI 自动填写 says the key is missing, or nothing happens**
The AI route needs `OPENROUTER_API_KEY` on the server (`.env.local` or Vercel env vars). Without it the button explains that instead of failing; the dish form still works by hand. Check the server logs for `[ai-recipe]` lines when the key is set. A `429`-style “AI 被叫得太勤” message just means you tapped it too many times in a minute.

---

## Security note

This is a **private two-person app**, and `schema.sql` deliberately allows the `anon` role full access to the five tables so that setup is one SQL paste and no login screen.

That means: **anyone who has your deployed URL and anon key can read and write the data.** The anon key is visible in the browser bundle by design. For a private couple's app this is usually acceptable, but if you share the URL publicly you should lock it down:

1. Enable Supabase Auth (email/OAuth) and require a signed-in user.
2. Replace the `for all to anon` policies with `to authenticated` policies limited to your two user IDs.
3. Make the `dish-images` bucket private and serve images through signed URLs, or keep it public but restrict writes.

Do not put a Supabase `service_role` key in any `NEXT_PUBLIC_*` variable.

`OPENROUTER_API_KEY` is server-side only: it is read inside `app/api/ai/recipe/route.ts` and never prefixed with `NEXT_PUBLIC_`. Keep it in `.env.local` or your Vercel environment settings — `.gitignore` excludes every `.env*` file except `.env.example`.

---

Made for two people and one warm bowl of soup. 🍲
