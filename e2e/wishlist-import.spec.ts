import assert from "node:assert/strict";

import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end smoke test for the Web Share Target flow:
 *   /import?title&text&url → chef wish inbox → Edit/Complete recipe → dish
 *
 * It runs against the local demo kitchen (no Supabase, no OpenRouter key), so
 * it exercises the same code paths a phone would.
 */

const SHARE_TITLE = "番茄牛腩煲 - 小红书";
const SHARE_TEXT = "两人份，番茄要炖到化开，汤汁泡饭。\n复制本条信息，打开【小红书】App查看精彩内容！";
const SHARE_URL = "https://xhslink.com/a/e2e-share-1";

function shareHref(params: { title?: string; text?: string; url?: string }) {
  const query = new URLSearchParams();
  if (params.title) query.set("title", params.title);
  if (params.text) query.set("text", params.text);
  if (params.url) query.set("url", params.url);
  return `/import?${query.toString()}`;
}

/**
 * Seed a wish exactly like the documented iOS Shortcut payload: only
 * `rednote_url` + `status`, no title, `source` left at the column default.
 */
async function seedShortcutWish(page: Page, rednoteUrl: string) {
  await page.addInitScript((url) => {
    if (window.localStorage.getItem("tonights-kitchen:v1")) return;
    window.localStorage.setItem(
      "tonights-kitchen:v1",
      JSON.stringify({
        dishes: [],
        orders: [],
        ratings: [],
        wishlist: [
          {
            id: "wish-shortcut",
            title: null,
            note: null,
            status: "pending_review",
            source: "manual",
            dish_id: null,
            calories: null,
            ingredients: [],
            cover_image: null,
            rednote_url: url,
            created_at: new Date().toISOString(),
            approved_at: null,
          },
        ],
      }),
    );
  }, rednoteUrl);
}

test("a shared note lands in the chef's wish inbox and can be published", async ({
  page,
}) => {
  // This note already has a title + text, so the sheet should not need the link.
  await page.route("**/api/link-meta**", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "链接没打开" }),
    });
  });

  await page.goto(shareHref({ title: SHARE_TITLE, text: SHARE_TEXT, url: SHARE_URL }));

  // Success state + quick toast.
  await expect(
    page.getByRole("heading", { name: "已经收进心愿收件箱" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("心愿收件箱");
  await expect(page.getByText("番茄牛腩煲", { exact: true })).toBeVisible();

  // The chef sees it in the inbox.
  await page.goto("/chef/wishlist");
  await expect(page.getByRole("heading", { name: "心愿收件箱" })).toBeVisible();

  const inboxItem = page
    .locator("li")
    .filter({ hasText: "番茄牛腩煲" })
    .first();
  await expect(inboxItem).toBeVisible();
  await expect(
    inboxItem.getByRole("link", { name: "查看原笔记" }),
  ).toHaveAttribute("href", SHARE_URL);

  // No horizontal overflow on a 360px screen.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  // Open the Edit / Complete recipe sheet.
  await inboxItem.getByRole("button", { name: "整理菜谱" }).click();
  const dialog = page.getByRole("dialog", { name: "整理这道菜" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "自动填写食材和热量" }),
  ).toBeEnabled();

  await dialog.getByLabel("菜名").fill("番茄牛腩煲");
  await dialog.getByRole("button", { name: /肉类/ }).click();
  await dialog.getByLabel("卡路里").fill("520");
  await dialog.getByLabel(/食材/).fill("牛腩 400g\n番茄 3 个");
  await dialog.getByLabel(/做法步骤/).fill("牛腩焯水切块。\n小火炖 60 分钟。");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await dialog.getByRole("button", { name: "保存并上架" }).click();
  await expect(dialog).toBeHidden();

  // The wish is published and the dish is on the menu.
  await expect(page.getByRole("heading", { name: "已实现" })).toBeVisible();
  await expect(
    page.locator("li").filter({ hasText: "番茄牛腩煲" }).first(),
  ).toBeVisible();

  await page.goto("/chef/menu");
  await expect(page.getByText("番茄牛腩煲").first()).toBeVisible();
});

test("an empty share shows guidance instead of saving junk", async ({ page }) => {
  await page.goto("/import");

  await expect(
    page.getByRole("heading", { name: "没收到可以收藏的内容" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "去写心愿" })).toHaveAttribute(
    "href",
    "/wishlist",
  );
});

test("a shortcut row without a title autofills from the link", async ({
  page,
}) => {
  const shortcutUrl = "https://xhslink.com/a/e2e-shortcut";

  // RedNote may block server fetches, so mock the preview endpoint here.
  await page.route("**/api/link-meta**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        meta: {
          url: shortcutUrl,
          title: "番茄牛腩煲",
          description: "两人份，番茄炖到化开，汤汁泡饭。",
          image: null,
          siteName: "小红书",
        },
      }),
    });
  });

  // Exactly what the documented iOS Shortcut posts: only rednote_url + status.
  await seedShortcutWish(page, shortcutUrl);

  await page.goto("/chef/wishlist");

  // It still shows up in the inbox, with a readable fallback title.
  const item = page.locator("li").filter({ hasText: "小红书收藏的菜" }).first();
  await expect(item).toBeVisible();
  await expect(item.getByRole("link", { name: "查看原笔记" })).toHaveAttribute(
    "href",
    shortcutUrl,
  );

  await item.getByRole("button", { name: "整理菜谱" }).click();
  const dialog = page.getByRole("dialog", { name: "整理这道菜" });
  await expect(dialog).toBeVisible();

  // Link preview autofills the title and the AI note field.
  await expect(dialog.getByLabel("菜名")).toHaveValue("番茄牛腩煲");
  await expect(
    dialog.getByPlaceholder("粘贴小红书里的做法文字…"),
  ).toHaveValue(/番茄炖到化开/);

  await dialog.getByLabel("卡路里").fill("520");
  await dialog.getByRole("button", { name: "保存并上架" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/chef/menu");
  await expect(page.getByText("番茄牛腩煲").first()).toBeVisible();
});

test("the full dish form keeps the saved link and can AI-fill", async ({
  page,
}) => {
  const shortcutUrl = "https://xhslink.com/a/e2e-form";

  await page.route("**/api/link-meta**", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "链接没打开" }),
    });
  });
  await page.route("**/api/ai/recipe", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        draft: {
          title: "番茄牛腩煲",
          category: "meat",
          calories: 520,
          ingredients: ["牛腩 400g", "番茄 3 个"],
          steps: ["牛腩焯水切块。", "小火炖 60 分钟。"],
        },
      }),
    });
  });

  await seedShortcutWish(page, shortcutUrl);
  await page.goto("/chef/wishlist");

  await page.getByRole("link", { name: "用完整表单做成这道菜" }).click();
  await expect(page).toHaveURL(/\/chef\/wishlist\/wish-shortcut$/);

  // Issue 1: the saved rednote_url is carried into the recipe-link field.
  await expect(page.getByLabel(/外部菜谱链接/)).toHaveValue(shortcutUrl);

  // Issue 2: the AI card is visible in the full form and fills the fields.
  await expect(
    page.getByRole("heading", { name: "AI 帮忙整理菜谱" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "自动填写菜名和做法" }).click();

  await expect(page.getByLabel(/菜名/)).toHaveValue("番茄牛腩煲");
  await expect(page.getByLabel("卡路里")).toHaveValue("520");
  await expect(
    page.getByPlaceholder("比如：鸡翅两面划刀，冷水下锅焯水。"),
  ).toHaveValue("牛腩焯水切块。");

  await page.getByRole("button", { name: "保存并上架" }).click();
  await expect(page).toHaveURL(/\/chef\/menu$/);

  // The dish keeps the link and the wish is marked ready.
  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("tonights-kitchen:v1") ?? "{}"),
  );
  assert.equal(stored.dishes[0].recipe_link, shortcutUrl);
  assert.equal(stored.wishlist[0].status, "ready");
  assert.equal(stored.wishlist[0].title, "番茄牛腩煲");
});

test("the same note is not queued twice", async ({ page }) => {
  const href = shareHref({ title: "小炒黄牛肉", url: "https://xhslink.com/a/e2e-dupe" });
  await page.goto(href);
  await expect(
    page.getByRole("heading", { name: "已经收进心愿收件箱" }),
  ).toBeVisible();

  await page.goto(href);
  await expect(
    page.getByRole("heading", { name: "这次没放进去" }),
  ).toBeVisible();

  await page.goto("/chef/wishlist");
  await expect(page.getByText("小炒黄牛肉", { exact: true })).toHaveCount(1);
});

test("AI failures show up inside the sheet, not behind it", async ({ page }) => {
  const shortcutUrl = "https://xhslink.com/a/e2e-ai-error";

  await page.route("**/api/link-meta**", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "链接没打开" }),
    });
  });
  await page.route("**/api/ai/recipe", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        error:
          "模型 deepseek/deepseek-chat 看不了图片：换一个支持图片的模型，或者把笔记文字贴进来",
      }),
    });
  });

  await seedShortcutWish(page, shortcutUrl);
  await page.goto("/chef/wishlist");

  await page.getByRole("button", { name: "整理菜谱" }).click();
  const dialog = page.getByRole("dialog", { name: "整理这道菜" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "自动填写食材和热量" }).click();

  // The message must be readable while the sheet is open (role=alert inside it).
  const alert = dialog.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("看不了图片");
  await expect(alert).toContainText("deepseek/deepseek-chat");
});
