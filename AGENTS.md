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
| Tests | No committed E2E suite; Playwright was used for manual smoke checks |

There is **no** component library, state manager, ORM, or CSS-in-JS. Prefer the existing primitives and Tailwind tokens.

---

## 3. Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm start
npm run icons
```

- `npm run dev` — development server. **Service worker is intentionally disabled in dev.**
- `npm run typecheck` — `tsc --noEmit`.
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
| `/history` | Past dinners + per-dish ratings/comments |
| `/chef` | Redirects to `/chef/orders` |
| `/chef/orders` | Live order board, item status, finish night |
| `/chef/menu` | Menu management / active toggle |
| `/chef/menu/new` | Add dish |
| `/chef/menu/[id]` | Edit dish |
| `/chef/wishlist` | Wish approval |
| `/chef/wishlist/[id]` | Convert a wish into a dish |
| `/settings` | Role, data mode, install guide, demo reset |
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
| `Wish` | name, note, status (`pending` / `approved`), dish_id, approved_at |

Order lifecycle: `draft → submitted → completed`. A completed order is not reused; a new draft is created for the next dinner.

Dates use **`Asia/Shanghai`** via `lib/utils.ts` (`todayISO`). Do not use `new Date().toISOString().slice(0, 10)` for order dates.

### Persistence and environment

- Demo DB key: `tonights-kitchen:v1`.
- Role key: `tonights-kitchen:role`.
- Env: copy `.env.example` → `.env.local`.
- **Never commit `.env.local` or a service-role key.**
- Cloud images go to the public `dish-images` bucket; local images are compressed data URLs.

### Backend

- `supabase/schema.sql`: tables, indexes, RLS, storage bucket, realtime publication. Safe to re-run.
- `supabase/seed.sql`: 25 dishes + one completed dinner + two wishes. Run **once**.
- RLS is intentionally open to `anon, authenticated` for this private household app. This is a documented security trade-off, not a template for public multi-user apps.
- If real multi-user support is added, replace the open policies and the role switch with real authentication.

### PWA

- Manifest: `public/manifest.json`.
- Service worker: `public/sw.js`.
- Registration: `components/pwa/ServiceWorkerRegister.tsx`, production only.
- Strategy: pages network-first, `/_next/static/*` cache-first, images cache-first, RSC requests skipped.
- Unknown pages offline get a **self-contained inline fallback** with no app chunks.
- Bump `VERSION` in `public/sw.js` when changing cache behavior.
- Test PWA only with `npm run build && npm start`, and load a page twice before going offline (the first load installs the worker; the second is controlled).

---

## 5. User roles

### Diner (点餐员)

- Browse/search categorized menu; categories: `主食`, `蔬菜`, `肉类/禽类`, `汤品/饮料`, `小吃/甜品`.
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
- Preserve `post_development_roadmap.md` if present, but treat it as an **early draft**. It contains obsolete `VITE_SUPABASE_*` names and old table designs. `README.md` is the source of truth.
- Update `README.md` when setup steps, env names, scripts, or PWA behavior change.
- Do not commit `.next`, `node_modules`, or `.env.local`.

---

## 8. Verification checklist

Before declaring work done:

1. `npm run typecheck` passes.
2. `npm run build` passes.
3. Browser smoke test with no console/page errors:
   - Diner: add two dishes → open 今晚 → write note → submit.
   - Chef: see order → 备餐中 → 已上菜 → 结束今晚 → confirm.
   - History: open completed dinner → set stars → write comment.
   - Chef: add a dish → save → toggle active; convert a wish → save.
   - Reload: demo data and role persist.
4. Small-screen check at **360×640**: no overflow, fixed bars do not cover the last field, nav and toast do not overlap.
5. PWA check (production only):
   - `npm run build && npm start`
   - Load a page, wait for the service worker, reload online, then go offline.
   - Visited page still opens; unvisited page shows the inline offline screen.
6. If Supabase is configured, verify against a scratch project by running `schema.sql` and `seed.sql`, then repeat the diner/chef flow. Do not test destructive changes against shared data.

There is currently no committed E2E suite. If adding one, keep Playwright out of runtime dependencies and document the command here.

---

## 9. Known limitations

- Role switching is a UX mode, not authorization.
- Supabase policies are open for a private household; not suitable for a public deployment.
- Demo mode is per-browser only and bounded by localStorage quota.
- One active dinner per day; completed orders move to history.
- The service worker never runs in `next dev`.
- Offline works for pages visited while the worker was active; the fallback covers the rest.
