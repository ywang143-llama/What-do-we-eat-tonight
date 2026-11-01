import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decodeHtmlEntities,
  isSafeExternalUrl,
  parseLinkMeta,
} from "../lib/link-meta.ts";

describe("decodeHtmlEntities", () => {
  it("decodes named, decimal and hex entities", () => {
    assert.equal(
      decodeHtmlEntities("番茄&amp;牛腩 &quot;超香&quot; &#39;呀&#x27;"),
      "番茄&牛腩 \"超香\" '呀'",
    );
  });

  it("leaves unknown entities alone", () => {
    assert.equal(decodeHtmlEntities("&unknown; &nbsp;"), "&unknown;  ");
  });
});

describe("parseLinkMeta", () => {
  const html = `<!doctype html>
<html><head>
  <title>番茄牛腩煲 - 小红书</title>
  <meta property="og:title" content="番茄牛腩煲 - 小红书" />
  <meta property="og:description" content="两人份，番茄要炖到化开 &amp; 汤汁泡饭" />
  <meta property="og:image" content="/images/cover.jpg" />
  <meta property="og:site_name" content="小红书" />
</head><body></body></html>`;

  it("reads Open Graph tags and cleans the RedNote title", () => {
    const meta = parseLinkMeta(
      html,
      "https://www.xiaohongshu.com/explore/abc123",
    );

    assert.equal(meta.title, "番茄牛腩煲");
    assert.equal(meta.description, "两人份，番茄要炖到化开 & 汤汁泡饭");
    assert.equal(
      meta.image,
      "https://www.xiaohongshu.com/images/cover.jpg",
    );
    assert.equal(meta.siteName, "小红书");
    assert.equal(meta.url, "https://www.xiaohongshu.com/explore/abc123");
  });

  it("falls back to twitter tags and then to <title>", () => {
    const twitter = parseLinkMeta(
      `<meta name="twitter:title" content="葱油拌面">
       <meta name="twitter:description" content="十分钟搞定">
       <meta name="twitter:image" content="https://cdn.test/a.png">`,
      "https://example.test/recipe",
    );

    assert.equal(twitter.title, "葱油拌面");
    assert.equal(twitter.description, "十分钟搞定");
    assert.equal(twitter.image, "https://cdn.test/a.png");

    const plain = parseLinkMeta("<title>手撕包菜</title>", "https://example.test/x");
    assert.equal(plain.title, "手撕包菜");
    assert.equal(plain.description, null);
    assert.equal(plain.image, null);
  });

  it("resolves images against <base href> and rejects odd protocols", () => {
    const withBase = parseLinkMeta(
      `<base href="https://cdn.test/media/">
       <meta property="og:image" content="cover.webp">`,
      "https://example.test/post/1",
    );
    assert.equal(withBase.image, "https://cdn.test/media/cover.webp");

    const javascriptImage = parseLinkMeta(
      `<meta property="og:image" content="javascript:alert(1)">`,
      "https://example.test/post/1",
    );
    assert.equal(javascriptImage.image, null);
  });

  it("handles single-quoted attributes and prefers the first tag", () => {
    const meta = parseLinkMeta(
      `<meta property='og:title' content='红烧肉'>
       <meta property="og:title" content="忽略这个">`,
      "https://example.test/1",
    );
    assert.equal(meta.title, "红烧肉");
  });

  it("returns nulls for an HTML document without metadata", () => {
    const meta = parseLinkMeta("<html><body><p>空页面</p></body></html>", "https://x.test");

    assert.equal(meta.title, null);
    assert.equal(meta.description, null);
    assert.equal(meta.image, null);
    assert.equal(meta.siteName, null);
  });
});

describe("isSafeExternalUrl", () => {
  it("allows normal public links", () => {
    assert.equal(isSafeExternalUrl("https://www.xiaohongshu.com/explore/abc"), true);
    assert.equal(isSafeExternalUrl("http://xhslink.com/a/xyz"), true);
    assert.equal(isSafeExternalUrl("https://example.com:8443/recipe"), true);
  });

  it("rejects loopback, private ranges and link-local hosts", () => {
    for (const url of [
      "http://localhost:3000/admin",
      "http://127.0.0.1/",
      "http://0.0.0.0/",
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "http://172.16.0.9/",
      "http://169.254.169.254/latest/meta-data",
      "http://printer.local/",
    ]) {
      assert.equal(isSafeExternalUrl(url), false, url);
    }
  });

  it("rejects non-http protocols, credentials and junk", () => {
    assert.equal(isSafeExternalUrl("file:///etc/passwd"), false);
    assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
    assert.equal(isSafeExternalUrl("https://user:pass@example.com/"), false);
    assert.equal(isSafeExternalUrl("not a link"), false);
    assert.equal(isSafeExternalUrl(""), false);
  });
});
