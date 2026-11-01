import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildUnsplashUrl,
  mapUnsplashResults,
} from "@/lib/image-search.ts";

describe("buildUnsplashUrl", () => {
  it("sets the search parameters the route relies on", () => {
    const url = buildUnsplashUrl("  红烧肉  ", 2);

    assert.equal(url.origin + url.pathname, "https://api.unsplash.com/search/photos");
    assert.equal(url.searchParams.get("query"), "红烧肉");
    assert.equal(url.searchParams.get("per_page"), "6");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("orientation"), "landscape");
    assert.equal(url.searchParams.get("content_filter"), "high");
  });

  it("clamps the page to a sane range", () => {
    assert.equal(buildUnsplashUrl("面", 0).searchParams.get("page"), "1");
    assert.equal(buildUnsplashUrl("面", -5).searchParams.get("page"), "1");
    assert.equal(buildUnsplashUrl("面", 999).searchParams.get("page"), "20");
    assert.equal(buildUnsplashUrl("面", Number.NaN).searchParams.get("page"), "1");
  });
});

describe("mapUnsplashResults", () => {
  it("maps photos into the UI shape", () => {
    const images = mapUnsplashResults({
      results: [
        {
          id: "abc",
          alt_description: "一碗牛肉面",
          urls: {
            regular: "https://images.test/regular.jpg",
            small: "https://images.test/small.jpg",
          },
          user: { name: "小明", links: { html: "https://unsplash.com/@ming" } },
          links: { html: "https://unsplash.com/photos/abc" },
        },
      ],
    });

    assert.deepEqual(images, [
      {
        id: "abc",
        url: "https://images.test/regular.jpg",
        thumb: "https://images.test/small.jpg",
        alt: "一碗牛肉面",
        creditName: "小明",
        creditLink: "https://unsplash.com/@ming",
        photoLink: "https://unsplash.com/photos/abc",
      },
    ]);
  });

  it("falls back to full/thumb/credit defaults", () => {
    const [image] = mapUnsplashResults({
      results: [
        {
          urls: { full: "https://images.test/full.jpg", thumb: "https://images.test/t.jpg" },
        },
      ],
    });

    assert.equal(image.url, "https://images.test/full.jpg");
    assert.equal(image.thumb, "https://images.test/t.jpg");
    assert.equal(image.alt, null);
    assert.equal(image.creditName, "Unsplash");
    assert.equal(image.creditLink, "https://unsplash.com");
    assert.equal(image.photoLink, null);
    assert.equal(image.id, "photo-0");
  });

  it("drops photos without a usable url and caps at six", () => {
    const results = [
      { urls: {} },
      { urls: { regular: "" } },
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `p${index}`,
        urls: { regular: `https://images.test/${index}.jpg` },
      })),
    ];

    const images = mapUnsplashResults({ results });

    assert.equal(images.length, 6);
    assert.equal(images[0].id, "p0");
    assert.equal(images[5].id, "p5");
  });

  it("returns [] for junk payloads", () => {
    assert.deepEqual(mapUnsplashResults(null), []);
    assert.deepEqual(mapUnsplashResults({}), []);
    assert.deepEqual(mapUnsplashResults({ results: "nope" }), []);
  });
});
