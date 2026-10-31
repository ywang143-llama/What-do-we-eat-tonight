import { expect, test } from "@playwright/test";

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

test("a shared note lands in the chef's wish inbox and can be published", async ({
  page,
}) => {
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
