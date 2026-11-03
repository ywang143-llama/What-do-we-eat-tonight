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
- This is a **private two-person app**, not a multi-tenant product. Cloud mode uses **one shared access code** stored in `public.kitchen_access`; guests browse read-only until they unlock. Local demo mode has no access code.
- The **diner/chef switch is a local UI mode**, not authorization. Cloud writes are gated by membership in `public.kitchen_members` (created when the access code is redeemed).
- The **repository is public / open source**, so never commit secrets. Only `.env.example` with empty values belongs in git; docs and commit messages are English, UI copy stays Chinese.
- The tone is warm, playful, and low-pressure. Avoid corporate or alarmist wording.

---

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js `16.4.3`, App Router |
| UI | React `19.3.1`, TypeScript `5.9`, Tailwind CSS `4.3.3` |
| Icons | `lucide-react` (no emoji icon library) |
| Backend | Supabase Postgres, anonymous Auth + shared access code, Storage, Realtime |
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
| `/` | Landing / role picker (local or unlocked cloud) or unlock entry |
| `/login` | Shared access-code unlock screen |
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
- `lib/auth.ts` — role labels/permission helpers, safe `next` redirects and Chinese access-code error copy.

`components/providers/KitchenProvider.tsx` is the single source of truth for UI state and actions:

- `run()` wraps mutations: busy counter → adapter call → silent refresh → success/error toast.
- Loads all data on mount; subscribes to Supabase realtime for `dishes`, `orders`, `order_items`, `ratings`, `wishlist` with a 300 ms debounce.
- Local mode listens to the `storage` event for cross-tab refreshes.
- Auth: creates an anonymous Supabase session, checks `public.kitchen_members`, and exposes `authReady`, `authError`, `isUnlocked`, `isReadOnly`, `canEdit`, `canOrder`, `unlockKitchen` and `lockKitchen`.
- Cloud guests are read-only until they redeem the shared code through `redeem_kitchen_code`. The diner/chef role is stored in `localStorage` and only controls the UI.
- `ready` is data-ready **and** auth-ready, so pages do not flash write controls while the session loads.
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
| `KitchenAccess` | Single row with the shared `code`. RLS enabled with no client policies; only `redeem_kitchen_code` reads it. |
| `KitchenMember` | `user_id` → `auth.users`. Created by the RPC when a device unlocks; RLS lets each user read only their own row. |

Order lifecycle: `draft → submitted → completed`. A completed order is not reused; a new draft is created for the next dinner.

Wish lifecycle: `pending_review → ready`. Manual wishes and RedNote shares share the same table. Inbox placement is decided by `isInboxWish()` in `lib/wish.ts`: `share` rows **or** any pending row carrying a `rednote_url` — the iOS Shortcut inserts only the link, and the column default gives it `source = 'rednote'` (mapped to `share` when loaded). `title` is nullable for those rows, so render `wishTitle(wish)` instead of `wish.title`. `completeWish(wishId, patch, dish)` creates the dish and marks the wish `ready` in one step.

Dates use **`Asia/Shanghai`** via `lib/utils.ts` (`todayISO`). Do not use `new Date().toISOString().slice(0, 10)` for order dates.

### Persistence and environment

- Demo DB key: `tonights-kitchen:v1`.
- Diner/chef UI mode key: `tonights-kitchen:role` (used in both local and cloud modes). The anonymous Supabase session is persisted by `@supabase/supabase-js`; membership lives in `public.kitchen_members`.
- Env: copy `.env.example` → `.env.local`. `.gitignore` ignores `.env*` except `.env.example`, so `.env.production` and `.env.development` are covered too.
- **Never commit any `.env*` file or a service-role key.** Only the public anon/publishable key may ever reach the browser.
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` are **server-only** (no `NEXT_PUBLIC_` prefix) and read inside `app/api/ai/recipe/route.ts`. Never move them into the client bundle.
- `UNSPLASH_ACCESS_KEY` is **server-only** too, read by `app/api/dish-image/route.ts`; without it the ✨ 自动找图 button shows a friendly note and manual upload still works.
- `NEXT_PUBLIC_*` values are inlined at build time — restart `next dev`, or redeploy on Vercel, after changing them.
- Reset: 设置 → 重置演示数据 calls `resetLocalData()` and reseeds the demo DB. Cloud mode has **no in-app reset** by design; wipe cloud data with SQL instead.
- Cloud images go to the public `dish-images` bucket; local images are compressed data URLs.

### Backend

- `supabase/schema.sql`: seven tables (including `kitchen_access` and `kitchen_members`), indexes, RLS, storage bucket, realtime publication. Safe to re-run. It also migrates an older `wishlist` table (`name` → `title`, `pending`/`approved` → `pending_review`/`ready`, new share columns).
- `supabase/seed.sql`: 25 dishes + one completed dinner + three wishes (one shared). Run **once**.
- RLS: guests (`anon`) read the live kitchen but cannot write; `kitchen_members` rows can write. The one exception is an append-only `pending_review` wishlist insert for the iOS Shortcut.
- `redeem_kitchen_code(input_code)` compares the shared code and inserts the current anonymous user into `kitchen_members`. `is_kitchen_member()` is the RLS helper.
- The code is set in the SQL editor: `insert into public.kitchen_access (id, code) values (true, '…') on conflict (id) do update set code = excluded.code;`. Delete `kitchen_members` to revoke all devices.
- If multi-user support is added, replace the shared code with per-user auth and remove the Shortcut exception.

### Deployment (Vercel)

- Framework preset: **Next.js**, auto-detected from `package.json`. No `vercel.json` — custom headers live in `next.config.ts`.
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for **Production**, **Preview**, and **Development**, otherwise the deploy silently falls back to local demo mode with no sync.
- Redeploy after changing env vars; values are baked into the client bundle at build time.
- Vercel's HTTPS is what makes the service worker and "Add to Home Screen" work.

### PWA

- Manifest: `public/manifest.json` — also declares a `share_target` (`GET` → `/import?title=…&text=…&url=…`). Parsing lives in `lib/share-import.ts`; `/import` and `/login` must keep their `useSearchParams` client code inside a `Suspense` boundary.
- Service worker: `public/sw.js`.
- Registration: `components/pwa/ServiceWorkerRegister.tsx`, production only.
- Strategy: pages network-first, `/_next/static/*` cache-first, images cache-first, RSC requests skipped.
- Unknown pages offline get a **self-contained inline fallback** with no app chunks.
- Bump `VERSION` in `public/sw.js` when changing cache behavior.
- Test PWA only with `npm run build && npm start`, and load a page twice before going offline (the first load installs the worker; the second is controlled).

---

## 5. Access code and UI roles

Cloud access is a single shared code. The diner/chef switch is a local UI mode stored in `localStorage`; it is not authorization. Local demo mode is always unlocked and fully editable.

### Guest (cloud, locked)

- Can read the menu, wishes, history and the live order.
- Write actions are hidden or disabled; `ReadOnlyBanner` shows **只读演示 · Viewing live demo in read-only mode.**
- `/chef/*` routes render `RoleGate`; `/import` asks them to unlock (and preserves the share via `?next=`).
- RLS allows SELECT only, plus the append-only iOS Shortcut wishlist insert.

### Unlocked diner (点餐员)

- Browse/search categorized menu; categories: `主食`, `蔬菜`, `肉类/蛋类`, `汤品/饮料`, `小吃/甜品`.
- Add/remove dishes for tonight; see calories and per-person average.
- Write an optional note; submit the order.
- Add wishes; view approved wishes.
- Rate completed dinners (1–5 stars) and leave comments.
- Cannot edit dishes, approve wishes, import shared links, run AI, upload photos, or delete anything. `/chef/*` shows `RoleGate`; `/import` points them back to the menu.
- Diner nav: 点菜 · 今晚 · 心愿 · 回顾.

### Unlocked chef (大厨)

- See the live order, note, calories, and progress.
- Toggle each item: 备餐中 / 已上菜.
- Mark all served, finish the night (order → completed).
- Add/edit/delete dishes: category, calories, emoji, photo, recipe steps, external link, active toggle.
- Import shared RedNote links (`/import` or the iOS Shortcut) into the wish inbox.
- Approve wishes by converting them into dishes.
- Shared links live in 心愿收件箱: **整理菜谱** opens the review sheet (link autofill + AI), **用完整表单做成这道菜** opens `DishForm` with `rednote_url` prefilled into 外部菜谱链接 and its own AI panel. Both publish through `completeWish`.
- Chef nav: 订单 · 菜品 · 心愿 · 回顾.

### Local demo mode

- No access code; `setRole` toggles 点餐员 / 大厨 in `localStorage`.
- `canEdit` and `canOrder` are always true, so the demo adapter exercises every feature.
- The landing page shows the two role cards in local mode and after a cloud unlock; a locked cloud visitor sees the unlock card instead.

**Role is not a hard redirect.** Cloud chef routes render `RoleGate` instead of redirecting, so direct links and the two-person UX stay friendly. Do not add hard redirects without checking both the role gate and the local role switch.

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
- Use `ReadOnlyBanner` for cloud guests and `RoleGate` for chef-only routes; use `canEdit` / `canOrder` from `useKitchen()` for permissions instead of checking the role string directly.
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
   - Cloud guest: locked → menu/wishlist are visible, add/edit/delete/AI controls are hidden or disabled, and the read-only banner is visible.
   - Unlock with the shared code → the device is remembered after reload; a wrong code shows a friendly error.
   - Cloud diner: can order, wish and rate; `/chef/*` shows `RoleGate`.
   - Cloud chef: can manage dishes, wishes, AI and photos.
   - Lock the device in 设置 → the unlock screen returns; re-entering the code unlocks again.
6. Small-screen check at **360×640**: no overflow, fixed bars do not cover the last field, nav and toast do not overlap.
7. PWA check (production only):
   - `npm run build && npm start`
   - Load a page, wait for the service worker, reload online, then go offline.
   - Visited page still opens; unvisited page shows the inline offline screen.
8. If Supabase is configured, verify against a scratch project by running `schema.sql` and `seed.sql`, then repeat the diner/chef flow. Do not test destructive changes against shared data.

`npm test` + `npm run typecheck` + `npm run build` + `npm run test:e2e` also run in CI on every PR (`.github/workflows/ci.yml`). The Playwright suite is the committed E2E layer — keep Playwright in `devDependencies` only, and never point it at a real Supabase project or OpenRouter key (the config blanks those env vars on purpose).

---

## 9. Known limitations

- Cloud authorization is enforced by RLS + `public.kitchen_members`; the diner/chef switch is only a UX mode. The iOS Shortcut's append-only anon wishlist insert is a deliberate exception.
- The access code is shared, not per-person. Changing it does not revoke devices that already unlocked; delete `kitchen_members` to revoke everyone.
- Anonymous sign-ins must be enabled in Supabase or the unlock flow cannot create a session.
- Web Share Target works on Android / Chromium and Edge only; iOS Safari has no share target, so iPhone users add wishes with the Shortcut (which needs cloud mode + the anon key) or by hand.
- RedNote often blocks server-side preview fetches, so `/api/link-meta` can fail; the review modal then relies on pasted text or a screenshot.
- Dishes that already appeared in a dinner cannot be deleted (`order_items` restricts the FK); the UI asks the chef to 下架 instead so history and ratings survive.
- The ✨ 自动找图 button needs `UNSPLASH_ACCESS_KEY`; without it the chef uploads a photo by hand.
- The AI auto-fill needs `OPENROUTER_API_KEY`; without it the review modal stays fully usable but manual.
- The AI route is not tied to the unlocked device (the client calls it directly) and is only throttled in memory; the UI hides it from guests and diners, but it is not an auth boundary.
- Supabase policies are tuned for a private household; add a user-ID allow-list before sharing the project more widely.
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
