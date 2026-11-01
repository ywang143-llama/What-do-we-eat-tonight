# AGENTS.md

Instructions for AI coding agents working on **Tonight's Kitchen (今晚吃什么)**.

Keep this file up to date when architecture, commands, or design rules change.

---

## 1. Project overview

A private, mobile-first dinner PWA for a couple:

- **One person orders** (点餐员 / Diner).
- **One person cooks** (大厨 / Chef).
- The app decides what to eat tonight, tracks cooking progress, and records past dinners with ratings.

Key product rules:

- **All user-facing copy is Simplified Chinese.** Brand/proper nouns such as `Supabase` are fine.
- The app must work immediately **without a backend**. When Supabase is not configured, it uses a fully seeded localStorage demo mode.
- This is a **private two-person app**, not a multi-tenant product. There is no login screen; the role switch is a UI mode stored in the browser.
- The **repository is public / open source**, so never commit secrets. Only `.env.example` with empty values belongs in git; docs and commit messages are English, UI copy stays Chinese.
- The tone is warm, playful, and low-pressure. Avoid corporate or alarmist wording.

---

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js `16.4.3`, App Router |
| UI | React `19.3.1`, TypeScript `5.9`, Tailwind CSS `4.3.3` |
| Icons | `lucide-react` (no emoji icon library) |
| Backend | Supabase Postgres, Auth (optional anonymous), Storage, Realtime |
| Database client | `@supabase/supabase-js` |
| PWA | Custom `public/manifest.json` + `public/sw.js` |
| Deployment | Vercel Hobby |
| Tests | `node:test` unit tests in `tests/` (no extra dependency) + Playwright smoke tests in `e2e/` (devDependency only) |

There is **no** component library, state manager, ORM, or CSS-in-JS. Prefer the existing primitives and Tailwind tokens.

---

## 3. Commands

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
npm start
npm run icons
```

- `npm run dev` — development server. **Service worker is intentionally disabled in dev.**
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — `node --test` over `tests/*.test.ts`, with `tests/register-alias.mjs` teaching Node the `@/` alias. Node strips TypeScript natively, so there is no test framework dependency; imports inside tests must keep the `.ts` extension (enabled by `allowImportingTsExtensions`).
- `npm run test:e2e` — Playwright smoke tests in `e2e/`. Needs `npx playwright install chromium` once. `playwright.config.ts` starts `next dev` on port `3100` with empty Supabase/OpenRouter env vars, so tests always run against the localStorage demo kitchen and never touch real data or credits.
- `npm run build` — production build.
- `npm start` — serve the production build; required to test PWA install/offline behavior.
- `npm run icons` — regenerate PNG app icons into `public/icons/`. Do not hand-edit generated PNGs.

> Run `typecheck` and `build` **sequentially**, never in parallel. They both write `.next/types`, and parallel runs can produce a transient `Cannot find module './routes.js'` error.
>
> Windows/PowerShell note: if `npm.ps1` is blocked by execution policy, use `npm.cmd ...`.

---

## 4. Architecture

### Runtime tree

```text
app/layout.tsx
  └─ KitchenProvider          central data, role, toasts, realtime
      └─ AppShell             header, error/offline banners, nav, toaster
          └─ route page
  └─ ServiceWorkerRegister    production only
```

### Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing / role picker |
| `/menu` | Diner menu, categories, search, add to tonight |
| `/order` | Tonight's order, note, submit, status |
| `/wishlist` | Diner wishlist |
| `/import` | Web Share Target landing: parses `title` / `text` / `url`, saves a `pending_review` wish |
| `/api/ai/recipe` | Server-only OpenRouter proxy for the wish-inbox AI auto-fill (`GET` reports whether a key is configured) |
| `/api/link-meta` | Server-only link preview (Open Graph) reader used to autofill URL-only wishes |
| `/api/dish-image` | Server-only Unsplash photo search for the dish form's ✨ 自动找图 button |
| `/history` | Past dinners + per-dish ratings/comments |
| `/chef` | Redirects to `/chef/orders` |
| `/chef/orders` | Live order board, item status, finish night |
| `/chef/menu` | Menu management / active toggle |
| `/chef/menu/new` | Add dish |
| `/chef/menu/[id]` | Edit dish |
| `/chef/wishlist` | Wish approval + shared-wish inbox |
| `/chef/wishlist/[id]` | Convert a wish into a dish |
| `/settings` | Role, data mode, install guide, demo reset (local mode only) |
| `/offline` | Standalone offline route (SW has its own inline fallback) |

### Data layer

`lib/api/types.ts` defines the `KitchenApi` interface. Both adapters must stay in sync:

- `lib/api/local.ts` — localStorage demo adapter.
- `lib/api/supabase.ts` — cloud adapter.
- `lib/api/index.ts` — chooses based on `isSupabaseConfigured`.
- `lib/supabase.ts` — reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; exports `null` when unconfigured.

`components/providers/KitchenProvider.tsx` is the single source of truth for UI state and actions:

- `run()` wraps mutations: busy counter → adapter call → silent refresh → success/error toast.
- Loads all data on mount; subscribes to Supabase realtime for `dishes`, `orders`, `order_items`, `ratings`, `wishlist` with a 300 ms debounce.
- Local mode listens to the `storage` event for cross-tab refreshes.
- `saveDish(input, id?, wishlistId?)` also approves the linked wish when converting.
- Images are compressed in the browser (`lib/utils.ts`) before upload.

When adding a new entity or mutation:

1. Update `lib/types.ts`.
2. Add the method to `KitchenApi`.
3. Implement it in **both** adapters.
4. Expose it through `KitchenProvider`.
5. Update the UI and any relevant loading/empty/error states.
6. Update `supabase/schema.sql` and the realtime table list if needed.

### Data model

| Entity | Key fields |
| --- | --- |
| `Dish` | name, category, calories, emoji, image_url, recipe_steps[], recipe_link, is_active |
| `Order` | order_date, status (`draft` / `submitted` / `completed`), note, timestamps, items |
| `OrderItem` | order_id, dish_id, status (`pending` / `preparing` / `served`) |
| `Rating` | order_id, dish_id, rating 1–5, comment; unique per order + dish |
| `Wish` | title (nullable for link-only rows), note, status (`pending_review` / `ready`), source (`manual` / `share`), rednote_url, cover_image, calories, ingredients[], dish_id |

Order lifecycle: `draft → submitted → completed`. A completed order is not reused; a new draft is created for the next dinner.

Wish lifecycle: `pending_review → ready`. Manual wishes and RedNote shares share the same table. Inbox placement is decided by `isInboxWish()` in `lib/wish.ts`: `share` rows **or** any pending row carrying a `rednote_url` — the iOS Shortcut inserts only the link, and the column default gives it `source = 'rednote'` (mapped to `share` when loaded). `title` is nullable for those rows, so render `wishTitle(wish)` instead of `wish.title`. `completeWish(wishId, patch, dish)` creates the dish and marks the wish `ready` in one step.

Dates use **`Asia/Shanghai`** via `lib/utils.ts` (`todayISO`). Do not use `new Date().toISOString().slice(0, 10)` for order dates.

### Persistence and environment

- Demo DB key: `tonights-kitchen:v1`.
- Role key: `tonights-kitchen:role`.
- Env: copy `.env.example` → `.env.local`. `.gitignore` ignores `.env*` except `.env.example`, so `.env.production` and `.env.development` are covered too.
- **Never commit any `.env*` file or a service-role key.** Only the public anon/publishable key may ever reach the browser.
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` are **server-only** (no `NEXT_PUBLIC_` prefix) and read inside `app/api/ai/recipe/route.ts`. Never move them into the client bundle.
- `UNSPLASH_ACCESS_KEY` is **server-only** too, read by `app/api/dish-image/route.ts`; without it the ✨ 自动找图 button shows a friendly note and manual upload still works.
- `NEXT_PUBLIC_*` values are inlined at build time — restart `next dev`, or redeploy on Vercel, after changing them.
- Reset: 设置 → 重置演示数据 calls `resetLocalData()` and reseeds the demo DB. Cloud mode has **no in-app reset** by design; wipe cloud data with SQL instead.
- Cloud images go to the public `dish-images` bucket; local images are compressed data URLs.

### Backend

- `supabase/schema.sql`: tables, indexes, RLS, storage bucket, realtime publication. Safe to re-run. It also migrates an older `wishlist` table (`name` → `title`, `pending`/`approved` → `pending_review`/`ready`, new share columns).
- `supabase/seed.sql`: 25 dishes + one completed dinner + three wishes (one shared). Run **once**.
- RLS is intentionally open to `anon, authenticated` for this private household app. This is a documented security trade-off, not a template for public multi-user apps.
- If real multi-user support is added, replace the open policies and the role switch with real authentication.

### Deployment (Vercel)

- Framework preset: **Next.js**, auto-detected from `package.json`. No `vercel.json` — custom headers live in `next.config.ts`.
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for **Production**, **Preview**, and **Development**, otherwise the deploy silently falls back to local demo mode with no sync.
- Redeploy after changing env vars; values are baked into the client bundle at build time.
- Vercel's HTTPS is what makes the service worker and "Add to Home Screen" work.

### PWA

- Manifest: `public/manifest.json` — also declares a `share_target` (`GET` → `/import?title=…&text=…&url=…`). Parsing lives in `lib/share-import.ts`; `/import` must keep its `useSearchParams` client code inside a `Suspense` boundary.
- Service worker: `public/sw.js`.
- Registration: `components/pwa/ServiceWorkerRegister.tsx`, production only.
- Strategy: pages network-first, `/_next/static/*` cache-first, images cache-first, RSC requests skipped.
- Unknown pages offline get a **self-contained inline fallback** with no app chunks.
- Bump `VERSION` in `public/sw.js` when changing cache behavior.
- Test PWA only with `npm run build && npm start`, and load a page twice before going offline (the first load installs the worker; the second is controlled).

---

## 5. User roles

### Diner (点餐员)

- Browse/search categorized menu; categories: `主食`, `蔬菜`, `肉类/蛋类`, `汤品/饮料`, `小吃/甜品`.
- Add/remove dishes for tonight; see calories and per-person average.
- Write an optional note; submit the order.
- Add wishes; view approved wishes.
- Rate completed dinners (1–5 stars) and leave comments.
- Diner nav: 点菜 · 今晚 · 心愿 · 回顾.

### Chef (大厨)

- See the live order, note, calories, and progress.
- Toggle each item: 备餐中 / 已上菜.
- Mark all served, finish the night (order → completed).
- Add/edit dishes: category, calories, emoji, photo, recipe steps, external link, active toggle.
- Approve wishes by converting them into dishes.
- Shared links live in 心愿收件箱: **整理菜谱** opens the review sheet (link autofill + AI), **用完整表单做成这道菜** opens `DishForm` with `rednote_url` prefilled into 外部菜谱链接 and its own AI panel. Both publish through `completeWish`.
- Chef nav: 订单 · 菜品 · 心愿 · 回顾.

**Role is not access control.** Any role can open any route directly; copy may adapt (e.g. the menu says "大厨也在挑菜"). Do not add hard redirects without checking the role-switch flow and the two-person UX.

---

## 6. Design rules

### Layout

- Mobile-first, one-handed use. App shell max width `480px`; floating bars max `448px`.
- Must look correct at **360×640** and common iPhone sizes.
- Fixed bottom nav + safe-area padding. Use `.pb-safe`, `header-safe-top`, `.above-nav`, and the toast placement utilities in `app/globals.css`.
- Main content uses `pb-36`; forms with action bars add `pb-24`. Do not let fixed bars cover the last field/card.
- Toasts are **single-item, bottom-anchored**, and offset above the cart bar / order submit bar / form action bar. If you add another fixed bottom bar, update `Toaster.tsx` placement logic.
- Inputs use 16px font to prevent iOS zoom.

### Palette (`app/globals.css`)

| Token | Value | Use |
| --- | --- | --- |
| `cream` | `#FBF4E8` | page background |
| `cream-deep` | `#F3E6D3` | soft fills |
| `paper` | `#FFFCF6` | cards |
| `ink` | `#43352B` | primary text |
| `ink-soft` | `#806F61` | secondary text |
| `line` | `#EADCC9` | borders |
| `terracotta` | `#C26A4A` | primary CTA |
| `terracotta-deep` | `#A9553A` | pressed/deep accent |
| `amber` | `#E5A13C` | highlights, stars |
| `amber-soft` | `#F6D9A8` | warm surfaces |
| `sage` | `#7F9A72` | success/served |
| `rose-soft` | `#F8E4DC` | wishes/soft alerts |

- Light theme only; `color-scheme: light`.
- Warm radial gradients live on `body`; do not flatten to plain white.
- Rounded corners: cards `rounded-3xl` / `rounded-[26px]`, sheets `rounded-t-4xl`.
- Shadows: `shadow-soft`, `shadow-card`, `shadow-float`. Keep them warm and subtle.
- Category accent classes are defined in `lib/categories.ts`; reuse them instead of inventing new colors.

### Components and interaction

- Reuse `Button`, `PageIntro`, `DishImage`, `RatingStars`, `ConfirmDialog`, `EmptyState`, `Toggle`, `PageLoading`.
- Touch targets: primary actions `h-11` / `h-13`; avoid making small icon-only controls smaller than `size-9`.
- Every page needs sensible loading, empty, and error states.
- Use `aria-label` for icon-only buttons and `aria-current` for nav.
- Keep animations subtle (`animate-rise`, `animate-pop`, `animate-toast`) and respect `prefers-reduced-motion`.
- Use `lucide-react` icons for UI actions; dish emojis are content, not controls.

### Copy

- Use concise, friendly Simplified Chinese.
- Prefer "今晚", "小心愿", "收工", "开饭" over technical wording.
- Error messages should explain the next step, not dump raw errors.
- Do not introduce English UI labels. Technical proper nouns are okay.

---

## 7. Engineering conventions

- TypeScript strict; avoid `any` except in Supabase row mappers where already used.
- Import via the `@/` alias.
- Client components need `"use client"`; most interactive pages/provider are client-side.
- Keep the local demo adapter working for every feature — it is the default developer experience.
- Do not add runtime dependencies for small UI needs; check existing components/icons first.
- `README.md` is the source of truth for setup, env names, and PWA behavior. Update it when those change.
- Do not commit `.next`, `node_modules`, or any `.env*` file. `.gitignore` allows only `.env.example`.

---

## 8. Verification checklist

Before declaring work done:

1. `npm test` passes.
2. `npm run typecheck` passes.
3. `npm run build` passes.
4. `npm run test:e2e` passes for changes touching the share import / wish inbox (needs `npx playwright install chromium` once).
5. Browser smoke test with no console/page errors:
   - Diner: add two dishes → open 今晚 → write note → submit.
   - Chef: see order → 备餐中 → 已上菜 → 结束今晚 → confirm.
   - History: open completed dinner → set stars → write comment.
   - Chef: add a dish → save → toggle active; convert a wish → save.
   - Share import: open `/import?title=番茄牛腩&text=…&url=https://xhslink.com/a/abc`, confirm the success toast, then in 心愿 → 心愿收件箱 review it and save (with and without `OPENROUTER_API_KEY`).
   - Reload: demo data and role persist.
6. Small-screen check at **360×640**: no overflow, fixed bars do not cover the last field, nav and toast do not overlap.
7. PWA check (production only):
   - `npm run build && npm start`
   - Load a page, wait for the service worker, reload online, then go offline.
   - Visited page still opens; unvisited page shows the inline offline screen.
8. If Supabase is configured, verify against a scratch project by running `schema.sql` and `seed.sql`, then repeat the diner/chef flow. Do not test destructive changes against shared data.

`npm test` + `npm run typecheck` + `npm run build` + `npm run test:e2e` also run in CI on every PR (`.github/workflows/ci.yml`). The Playwright suite is the committed E2E layer — keep Playwright in `devDependencies` only, and never point it at a real Supabase project or OpenRouter key (the config blanks those env vars on purpose).

---

## 9. Known limitations

- Role switching is a UX mode, not authorization.
- Web Share Target works on Android / Chromium and Edge only; iOS Safari has no share target, so iPhone users add wishes with the Shortcut (which needs cloud mode + the anon key) or by hand.
- RedNote often blocks server-side preview fetches, so `/api/link-meta` can fail; the review modal then relies on pasted text or a screenshot.
- Dishes that already appeared in a dinner cannot be deleted (`order_items` restricts the FK); the UI asks the chef to 下架 instead so history and ratings survive.
- The ✨ 自动找图 button needs `UNSPLASH_ACCESS_KEY`; without it the chef uploads a photo by hand.
- The AI auto-fill needs `OPENROUTER_API_KEY`; without it the review modal stays fully usable but manual.
- The AI route is unauthenticated (like the rest of the app) and only throttled in memory; don't expose it publicly without auth.
- Supabase policies are open for a private household; not suitable for a public deployment.
- Cloud mode has **no in-app data reset**; 重置演示数据 only exists in local mode.
- Demo mode is per-browser only and bounded by localStorage quota.
- One active dinner per day; completed orders move to history.
- The service worker never runs in `next dev`.
- Offline works for pages visited while the worker was active; the fallback covers the rest.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
