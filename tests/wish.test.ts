import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FALLBACK_SHARE_TITLE } from "@/lib/share-import.ts";
import { isInboxWish, isManualWish, wishTitle } from "@/lib/wish.ts";

describe("wishTitle", () => {
  it("trims a real title", () => {
    assert.equal(wishTitle({ title: "  番茄牛腩 ", rednote_url: null }), "番茄牛腩");
  });

  it("falls back to the share title for URL-only wishes", () => {
    assert.equal(
      wishTitle({ title: null, rednote_url: "https://xhslink.com/a/x" }),
      FALLBACK_SHARE_TITLE,
    );
    assert.equal(
      wishTitle({ title: "   ", rednote_url: "https://xhslink.com/a/x" }),
      FALLBACK_SHARE_TITLE,
    );
  });

  it("falls back to a generic name for blank manual wishes", () => {
    assert.equal(wishTitle({ title: null, rednote_url: null }), "小心愿");
  });
});

describe("isInboxWish", () => {
  it("includes in-app shares", () => {
    assert.equal(
      isInboxWish({
        status: "pending_review",
        source: "share",
        rednote_url: null,
      }),
      true,
    );
  });

  it("includes shortcut rows that only carry a rednote_url", () => {
    assert.equal(
      isInboxWish({
        status: "pending_review",
        source: "manual",
        rednote_url: "https://xhslink.com/a/shortcut",
      }),
      true,
    );
  });

  it("excludes manual wishes without a link", () => {
    assert.equal(
      isInboxWish({ status: "pending_review", source: "manual", rednote_url: null }),
      false,
    );
  });

  it("excludes finished wishes even when they came from a link", () => {
    assert.equal(
      isInboxWish({
        status: "ready",
        source: "share",
        rednote_url: "https://xhslink.com/a/done",
      }),
      false,
    );
  });
});

describe("isManualWish", () => {
  it("is the complement for pending wishes", () => {
    assert.equal(
      isManualWish({ status: "pending_review", source: "manual", rednote_url: null }),
      true,
    );
    assert.equal(
      isManualWish({ status: "pending_review", source: "share", rednote_url: null }),
      false,
    );
    assert.equal(
      isManualWish({ status: "ready", source: "manual", rednote_url: null }),
      false,
    );
  });
});
