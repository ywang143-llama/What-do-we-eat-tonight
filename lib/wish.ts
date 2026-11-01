import { FALLBACK_SHARE_TITLE } from "@/lib/share-import";
import type { Wish } from "@/lib/types";

/**
 * Small presentation helpers for wishes.
 *
 * Wishes created by the iOS Shortcut or the REST API may have no `title` at
 * all (the documented payload only sends `rednote_url` + `status`), so the UI
 * always renders through `wishTitle` instead of `wish.title`.
 */

export function wishTitle(
  wish: Pick<Wish, "title" | "rednote_url">,
): string {
  const title = wish.title?.trim();
  if (title) return title;
  return wish.rednote_url ? FALLBACK_SHARE_TITLE : "小心愿";
}

/**
 * An inbox wish is waiting for the chef to review a link: either it arrived
 * through the share sheet, or it was inserted straight into Supabase with a
 * `rednote_url` (iOS Shortcut), which defaults `source` to `manual`.
 */
export function isInboxWish(
  wish: Pick<Wish, "status" | "source" | "rednote_url">,
): boolean {
  return (
    wish.status === "pending_review" &&
    (wish.source === "share" || Boolean(wish.rednote_url))
  );
}

export function isManualWish(
  wish: Pick<Wish, "status" | "source" | "rednote_url">,
): boolean {
  return wish.status === "pending_review" && !isInboxWish(wish);
}
