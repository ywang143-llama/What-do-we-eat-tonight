import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { GET } from "../app/api/dish-image/route.ts";

/**
 * Route-level tests for GET /api/dish-image (Unsplash) with a stubbed fetch,
 * so the key handling, query building and error mapping are covered without
 * hitting the network.
 */

const originalFetch = globalThis.fetch;
let calls: Array<{ url: string; headers: Record<string, string> }> = [];

function stubFetch(
  reply:
    | { status: number; body: string }
    | ((url: URL) => { status: number; body: string }),
) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({
      url,
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    const next = typeof reply === "function" ? reply(new URL(url)) : reply;
    return new Response(next.body, {
      status: next.status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

function request(query: string): Request {
  return new Request(`http://localhost:3000/api/dish-image${query}`);
}

async function call(query: string) {
  const response = await GET(request(query));
  return { status: response.status, payload: (await response.json()) as Record<string, unknown> };
}

beforeEach(() => {
  calls = [];
  process.env.UNSPLASH_ACCESS_KEY = "test-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.UNSPLASH_ACCESS_KEY;
});

describe("GET /api/dish-image", () => {
  it("searches Unsplash with the dish name and returns candidates", async () => {
    stubFetch({
      status: 200,
      body: JSON.stringify({
        results: [
          {
            id: "p1",
            alt_description: "红烧肉",
            urls: {
              regular: "https://images.test/regular.jpg",
              small: "https://images.test/small.jpg",
            },
            user: { name: "厨师", links: { html: "https://unsplash.com/@chef" } },
          },
        ],
      }),
    });

    const { status, payload } = await call("?q=红烧肉&page=2");

    assert.equal(status, 200);
    assert.equal(payload.query, "红烧肉");
    assert.equal((payload.images as unknown[]).length, 1);

    const url = new URL(calls[0].url);
    assert.equal(url.searchParams.get("query"), "红烧肉");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("per_page"), "6");
    assert.equal(calls[0].headers.Authorization, "Client-ID test-key");
  });

  it("requires a query", async () => {
    const { status, payload } = await call("");

    assert.equal(status, 400);
    assert.match(String(payload.error), /菜名/);
    assert.equal(calls.length, 0);
  });

  it("explains when the Unsplash key is missing", async () => {
    delete process.env.UNSPLASH_ACCESS_KEY;

    const { status, payload } = await call("?q=红烧肉");

    assert.equal(status, 503);
    assert.match(String(payload.error), /UNSPLASH_ACCESS_KEY/);
    assert.equal(calls.length, 0);
  });

  it("maps an invalid key to a helpful message", async () => {
    stubFetch({ status: 401, body: "{}" });

    const { status, payload } = await call("?q=红烧肉");

    assert.equal(status, 502);
    assert.match(String(payload.error), /UNSPLASH_ACCESS_KEY/);
  });

  it("reports an empty result set with the searched term", async () => {
    stubFetch({ status: 200, body: JSON.stringify({ results: [] }) });

    const { status, payload } = await call("?q=月亮");

    assert.equal(status, 404);
    assert.match(String(payload.error), /月亮/);
  });

  it("copes with upstream errors and network failures", async () => {
    stubFetch({ status: 500, body: "{}" });
    assert.equal((await call("?q=面")).status, 502);

    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    const { status, payload } = await call("?q=面");
    assert.equal(status, 502);
    assert.match(String(payload.error), /连不上/);
  });
});
