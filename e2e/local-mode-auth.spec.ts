import { expect, test } from "@playwright/test";

/**
 * The Playwright config blanks the Supabase env vars, so these tests run
 * against the localStorage demo kitchen. Local mode must stay access-code-free
 * and fully editable, even though cloud mode now uses an access code.
 */

test("local demo mode explains that an access code is not needed", async ({
  page,
}) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "现在不用访问码" }),
  ).toBeVisible();
  await expect(page.getByText("本机演示厨房")).toBeVisible();
});

test("local demo mode keeps chef tools available without a role", async ({
  page,
}) => {
  await page.goto("/chef/menu/new");

  await expect(
    page.getByRole("heading", { name: "添一道新菜" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI 帮忙整理菜谱" }),
  ).toBeVisible();
});
