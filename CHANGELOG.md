# Changelog

All notable changes to **今晚吃什么 · Tonight's Kitchen** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project uses [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added

- **✨ 自动找图 (Unsplash)** — `GET /api/dish-image?q=…` searches Unsplash
  (`UNSPLASH_ACCESS_KEY`, server-side only) and the dish form shows six
  candidates to use as the cover. Helpers live in `lib/image-search.ts`, with
  route + mapping tests.
- **Delete a dish** — `KitchenApi.deleteDish` (both adapters) plus a
  删除这道菜 danger zone in the published-dish editor. Dishes that already
  appeared in a dinner are refused with “先下架吧，历史要留着” so order history
  and ratings survive.
- **Source link buttons** — any dish with a `recipe_link` now shows
  看原笔记 / 看菜谱 in the dish form and on the diner's menu cards (the review
  sheet already had it), so both people can open the original RedNote post.
- **AI assist in the full dish form** now accepts pasted text **and** a
  screenshot (previously link/wish only), so it works when editing a published
  dish, not just during wish approval.

### Changed

- Category label `肉类/禽类` → **`肉类/蛋类`** (AI aliases and prompts updated).
- The chef menu toggle moved to the far right of each row, and the dish form
  toggle now shows an explicit 在售 / 已下架 label.
- `ConfirmDialog` action buttons are `type="button"`, so they can be rendered
  inside a form without submitting it.
- **iOS Shortcut & Back Tap documentation** — `README.md` explains how to read a copied
  RedNote link from the iPhone clipboard and `POST` it to `…/rest/v1/wishlist` as
  `{ "rednote_url": …, "status": "pending_review" }` (includes Back Tap / Action Button setup).
- **Link preview autofill** — `GET /api/link-meta` reads Open Graph / Twitter / `<title>` tags
  (`lib/link-meta.ts`, with an SSRF guard for private hosts). The Review modal fills the title,
  note and cover image automatically for wishes that only carry a `rednote_url`.
- **AI parsing for link-only wishes** — `POST /api/ai/recipe` accepts `url` and reads the page
  preview when there is no pasted text or screenshot, so the shortcut rows can be AI-filled.
- `lib/wish.ts` — `wishTitle()`, `isInboxWish()` and `isManualWish()` presentation helpers.
- Tests: `tests/link-meta.test.ts`, `tests/wish.test.ts`, a URL-only adapter case and a new
  Playwright spec for the shortcut→inbox→autofill→publish flow.
- **Web Share Target** — `public/manifest.json` now exposes a `share_target`
  (GET → `/import?title=…&text=…&url=…`), so a RedNote (小红书) share can be sent
  straight to the installed app on Android / Chromium.
- **`/import` route** — parses the shared `title` / `text` / `url` parameters,
  de-duplicates the note, saves it to the wishlist as `pending_review` and shows
  a quick success toast plus a link back to the chef's inbox.
- **Wishlist Inbox for the chef** — `/chef/wishlist` has a dedicated 心愿收件箱
  section for shared items with a **查看原笔记** link to the saved `rednote_url`.
- **Edit / Complete Recipe modal** — `components/chef/WishReviewModal.tsx` lets
  the chef finish title, category, calories, ingredients, steps and cover photo
  before publishing the dish.
- **AI auto-fill via OpenRouter** — `POST /api/ai/recipe` reads note text and/or
  a screenshot and returns title, category, estimated calories, ingredients and
  steps. `OPENROUTER_API_KEY` stays server-side; `OPENROUTER_MODEL` is optional.
  The route is rate limited and fails soft so manual entry always works.
- **Unit tests** — `npm test` runs `node:test` suites for the `/import`
  parameter parser (`tests/share-import.test.ts`), the AI draft normaliser
  (`tests/ai-recipe.test.ts`) and the localStorage adapter incl. share dedupe
  and legacy migration (`tests/local-api.test.ts`).
- **Playwright smoke test** — `npm run test:e2e` covers `/import` → 心愿收件箱 →
  整理菜谱 → 已上架 at 360×640 against the demo kitchen. Playwright is a
  devDependency; `playwright.config.ts` blanks the Supabase/OpenRouter env vars.
- **CI** — `.github/workflows/ci.yml` runs tests, typecheck, build and the
  Playwright job on every pull request.
- **`CHANGELOG.md`** — this file.

### Changed

- **Wishlist model** — `wishlist` rows are now
  `{ id, title, note, status, source, rednote_url, cover_image, calories, ingredients, dish_id, created_at, approved_at }`.
  Statuses are `pending_review` → `ready` (replacing `pending` → `approved`);
  `source` is `manual` or `share` (a direct REST insert may store `rednote`,
  which loads as `share`).
- `KitchenApi` gained `addSharedWish`, `markWishReady` and `completeWish`
  (`approveWish` was renamed), implemented in both the localStorage and the
  Supabase adapters. Local storage is migrated on read, so existing demo
  kitchens keep working.
- The diner wishlist, chef wishlist, bottom navigation and the dish form now use
  the new wish fields, and shared wishes show a 查看收藏的原笔记 link.
- `supabase/schema.sql` re-runs safely and migrates older wishlist tables
  (`name` → `title`, old statuses, new columns + a partial unique index that
  keeps one pending inbox item per note).
- `supabase/seed.sql` seeds a shared example wish so the inbox is not empty.
- Service worker bumped to `v3` so the new manifest is picked up.
- `package.json` declares `"type": "module"` so `node --test` loads the
  TypeScript helper modules as ESM without warnings; `tsconfig.json` enables
  `allowImportingTsExtensions` for the test imports.

### Fixed

- **AI looked like it did nothing** — the toast rendered *behind* the Review
  sheet (`z-70` vs `z-80`). Toasts now sit at `z-90`, and both the sheet and the
  dish form show the AI result/error inline (with `role="alert"`), so feedback is
  visible even while the dialog is open.
- **DeepSeek / vision errors were swallowed** — the route now maps upstream
  failures to actionable Chinese copy: wrong key, no credits, rate limit,
  unknown model, context too long, and “模型 … 看不了图片” (with the configured
  model name) for text-only models given a screenshot. It also logs the model,
  status and a clamped response body server-side.
- AI requests ask for JSON mode and retry once without it when a provider
  rejects `response_format`, read `reasoning` / `reasoning_content` when
  `content` is empty (DeepSeek reasoners), and allow 45 s instead of 25 s so
  slow vision models can finish. If a text-only model rejects a screenshot but
  the chef also pasted text, the route retries without the image and returns a
  warning instead of an error.
- README documents which models accept screenshots and the DeepSeek caveat.
- **Wishlist → dish flow for link-only rows** — `title` is nullable end to end
  (schema, types, both adapters, diner/chef lists and the review sheet), so rows
  inserted by the iOS Shortcut no longer render blank titles or crash the
  controlled inputs, and they appear in 心愿收件箱 even though their `source`
  defaults to `rednote`/`manual`.
- **AI parser had nothing to read for shortcut rows** — the route now falls back
  to the link preview (or the text/screenshot pasted in the sheet), so
  `自动填写` actually returns ingredients/calories instead of a 400.
- `supabase/schema.sql` now drops `not null` on `wishlist.title` for existing
  projects and allows `rednote` in the source check, so shortcut inserts stop
  failing on a freshly re-run schema.
- **Wish → dish form lost the source link** — `DishForm` now seeds 外部菜谱链接
  from `wish.rednote_url` (and the cover from `wish.cover_image`), so publishing
  from 用完整表单做成这道菜 keeps the original note attached to the dish.
- **AI assist was only in the review sheet** — the full dish form now has an
  **AI 帮忙整理菜谱 / 自动填写菜名和做法** panel (visible when a wish or a recipe
  link is present) and 心愿收件箱 cards gained a 用完整表单做成这道菜 link.
  Publishing from the form goes through `completeWish`, so the wish keeps its
  link/ingredients and is marked `ready` in one step.
- Added `data-scroll-behavior="smooth"` to `<html>` to silence the Next.js
  smooth-scroll transition warning.
- Wish approvals from the share inbox persist the reviewed ingredients, calories
  and cover image alongside the created dish.
