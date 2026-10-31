import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleanSharedTitle,
  extractSharedUrl,
  FALLBACK_SHARE_TITLE,
  isRedNoteUrl,
  parseSharedWish,
} from "../lib/share-import.ts";

describe("extractSharedUrl", () => {
  it("returns the first http(s) link", () => {
    assert.equal(
      extractSharedUrl("看看这个 https://xhslink.com/a/AbCd12 很香"),
      "https://xhslink.com/a/AbCd12",
    );
  });

  it("drops trailing Chinese and ASCII punctuation", () => {
    assert.equal(
      extractSharedUrl("https://xhslink.com/a/AbCd12，超下饭"),
      "https://xhslink.com/a/AbCd12",
    );
    assert.equal(
      extractSharedUrl("https://xhslink.com/a/AbCd12."),
      "https://xhslink.com/a/AbCd12",
    );
  });

  it("keeps query parameters intact", () => {
    assert.equal(
      extractSharedUrl(
        "https://www.xiaohongshu.com/explore/123?xsec_token=XYZ&xsec_source=pc_share",
      ),
      "https://www.xiaohongshu.com/explore/123?xsec_token=XYZ&xsec_source=pc_share",
    );
  });

  it("returns null when there is no link", () => {
    assert.equal(extractSharedUrl("今晚想喝番茄牛腩汤"), null);
    assert.equal(extractSharedUrl(""), null);
  });
});

describe("isRedNoteUrl", () => {
  it("recognises xiaohongshu and xhslink hosts", () => {
    assert.equal(isRedNoteUrl("https://www.xiaohongshu.com/explore/abc"), true);
    assert.equal(isRedNoteUrl("https://xhslink.com/a/abc"), true);
    assert.equal(isRedNoteUrl("https://www.xiaohongshu.com.evil.test/a"), false);
  });

  it("is false for other sites and junk", () => {
    assert.equal(isRedNoteUrl("https://www.xiachufang.com/recipe/1"), false);
    assert.equal(isRedNoteUrl("not a url"), false);
    assert.equal(isRedNoteUrl(null), false);
  });
});

describe("cleanSharedTitle", () => {
  it("strips the RedNote branding suffix", () => {
    assert.equal(cleanSharedTitle("番茄牛腩煲 - 小红书"), "番茄牛腩煲");
  });

  it("strips URLs and share boilerplate", () => {
    assert.equal(
      cleanSharedTitle(
        "手撕包菜 http://xhslink.com/a/xyz789 复制本条信息，打开【小红书】App查看精彩内容！",
      ),
      "手撕包菜",
    );
  });

  it("removes wrapping brackets and hashtags", () => {
    assert.equal(cleanSharedTitle("【蒜蓉西兰花】 #家常菜"), "蒜蓉西兰花");
  });

  it("keeps the first meaningful line only", () => {
    assert.equal(
      cleanSharedTitle("\n可乐鸡翅\n鸡翅煎到金黄，倒可乐收汁。"),
      "可乐鸡翅",
    );
  });

  it("truncates very long titles", () => {
    const title = cleanSharedTitle("一".repeat(60));
    assert.equal(title.length, 41);
    assert.ok(title.endsWith("…"));
  });
});

describe("parseSharedWish", () => {
  it("reads the three share-target parameters", () => {
    const result = parseSharedWish(
      new URLSearchParams({
        title: "番茄牛腩煲 - 小红书",
        text: "两人份的番茄牛腩煲\n复制本条信息，打开【小红书】App查看精彩内容！",
        url: "https://xhslink.com/a/AbCd12",
      }),
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.draft.title, "番茄牛腩煲");
    assert.equal(result.draft.rednote_url, "https://xhslink.com/a/AbCd12");
    assert.equal(result.draft.note, "两人份的番茄牛腩煲");
    assert.equal(result.draft.isRedNote, true);
  });

  it("finds the link in the text when `url` is missing", () => {
    const result = parseSharedWish({
      text: "深夜食堂的手撕包菜 http://xhslink.com/a/xyz789 复制本条信息，打开【小红书】App查看精彩内容！",
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.draft.title, "深夜食堂的手撕包菜");
    assert.equal(result.draft.rednote_url, "http://xhslink.com/a/xyz789");
    assert.equal(result.draft.note, null);
  });

  it("decodes percent-encoded Chinese from a raw query string", () => {
    const query =
      "?title=%E7%95%AA%E8%8C%84%E7%89%9B%E8%85%A9&url=https%3A%2F%2Fxhslink.com%2Fa%2Fenc";
    const result = parseSharedWish(new URLSearchParams(query));

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.draft.title, "番茄牛腩");
    assert.equal(result.draft.rednote_url, "https://xhslink.com/a/enc");
  });

  it("falls back to a friendly title when only a link is shared", () => {
    const result = parseSharedWish({ url: "https://xhslink.com/a/only" });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.draft.title, FALLBACK_SHARE_TITLE);
    assert.equal(result.draft.rednote_url, "https://xhslink.com/a/only");
  });

  it("keeps non-RedNote links but flags them", () => {
    const result = parseSharedWish({
      title: "下厨房的红烧肉",
      url: "https://www.xiachufang.com/recipe/1001/",
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.draft.isRedNote, false);
    assert.equal(result.draft.rednote_url, "https://www.xiachufang.com/recipe/1001/");
  });

  it("accepts array values from a parsed query object", () => {
    const result = parseSharedWish({ title: ["红烧肉", "ignored"] });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.draft.title, "红烧肉");
    assert.equal(result.draft.rednote_url, null);
  });

  it("reports empty payloads instead of saving garbage", () => {
    assert.deepEqual(parseSharedWish(new URLSearchParams()), {
      ok: false,
      reason: "empty",
    });
    assert.deepEqual(parseSharedWish({ title: "  ", text: "", url: null }), {
      ok: false,
      reason: "empty",
    });
  });
});
