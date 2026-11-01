import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { POST } from "../app/api/ai/recipe/route.ts";

/**
 * Route-level tests for POST /api/ai/recipe.
 *
 * `fetch` is stubbed with realistic OpenRouter payloads (including the
 * DeepSeek reasoning-model shape and "no endpoints support image input"), so
 * the whole parser → draft → error-mapping path is exercised without a key.
 */

const originalFetch = globalThis.fetch;
let calls: Array<{ url: string; body: Record<string, unknown> }> = [];
let ipCounter = 0;

type StubResponse = { status: number; body: string };

function stubFetch(responses: StubResponse[] | ((body: Record<string, unknown>) => StubResponse)) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls.push({ url: String(input), body });
    const next = typeof responses === "function" ? responses(body) : responses.shift();
    if (!next) throw new Error("stubFetch ran out of responses");
    return new Response(next.body, {
      status: next.status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

function completion(message: Record<string, unknown>): StubResponse {
  return {
    status: 200,
    body: JSON.stringify({ choices: [{ message }] }),
  };
}

function makeRequest(body: Record<string, unknown>): Request {
  ipCounter += 1;
  return new Request("http://localhost:3000/api/ai/recipe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": `test-${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

async function call(body: Record<string, unknown>) {
  const response = await POST(makeRequest(body));
  const payload = (await response.json()) as Record<string, unknown>;
  return { status: response.status, payload };
}

beforeEach(() => {
  calls = [];
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  delete process.env.OPENROUTER_MODEL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_MODEL;
});

describe("POST /api/ai/recipe — happy paths", () => {
  it("parses fenced JSON from a normal chat model", async () => {
    stubFetch([
      completion({
        content:
          '```json\n{"title":"番茄牛腩煲","category":"肉类","calories":520,"ingredients":["牛腩 400g","番茄 3 个"],"steps":["牛腩焯水。","小火炖 60 分钟。"]}\n```',
      }),
    ]);

    const { status, payload } = await call({ text: "番茄牛腩煲，两人份" });

    assert.equal(status, 200);
    assert.deepEqual(payload.draft, {
      title: "番茄牛腩煲",
      category: "meat",
      calories: 520,
      ingredients: ["牛腩 400g", "番茄 3 个"],
      steps: ["牛腩焯水。", "小火炖 60 分钟。"],
    });
    assert.equal(payload.model, "openai/gpt-4o-mini");
  });

  it("reads the reasoning field used by DeepSeek-style models", async () => {
    stubFetch([
      completion({
        content: "",
        reasoning_content:
          '{"title":"葱油拌面","category":"主食","calories":480,"ingredients":["面条","小葱"],"steps":["炸葱油"]}',
      }),
    ]);

    const { status, payload } = await call({ text: "葱油拌面" });

    assert.equal(status, 200);
    assert.equal((payload.draft as { title: string }).title, "葱油拌面");
    assert.equal((payload.draft as { category: string }).category, "staple");
  });

  it("sends screenshots as an image part", async () => {
    stubFetch([completion({ content: '{"title":"蛋炒饭","ingredients":["米饭"]}' })]);

    const image = `data:image/jpeg;base64,${"A".repeat(64)}`;
    const { status } = await call({ image });

    assert.equal(status, 200);
    const content = calls[0].body.messages as Array<{
      role: string;
      content: unknown;
    }>;
    const userParts = content[1].content as Array<Record<string, unknown>>;
    assert.equal(userParts[0].type, "text");
    assert.equal(userParts[1].type, "image_url");
    assert.deepEqual(userParts[1].image_url, { url: image });
  });

  it("asks for JSON mode and retries without it when the model refuses", async () => {
    stubFetch([
      { status: 400, body: JSON.stringify({ error: "response_format is not supported" }) },
      completion({ content: '{"title":"红烧肉","ingredients":["五花肉"]}' }),
    ]);

    const { status, payload } = await call({ text: "红烧肉" });

    assert.equal(status, 200);
    assert.equal((payload.draft as { title: string }).title, "红烧肉");
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].body.response_format, { type: "json_object" });
    assert.equal("response_format" in calls[1].body, false);
  });
});

describe("POST /api/ai/recipe — upstream failures", () => {
  it("falls back to text when a text-only model rejects the screenshot", async () => {
    stubFetch([
      {
        status: 404,
        body: JSON.stringify({
          error: { message: "No endpoints found that support image input" },
        }),
      },
      completion({ content: '{"title":"番茄牛腩","ingredients":["牛腩 400g"]}' }),
    ]);
    process.env.OPENROUTER_MODEL = "deepseek/deepseek-chat";

    const { status, payload } = await call({
      text: "番茄牛腩：牛腩焯水，番茄炒出汁，小火炖 60 分钟。",
      image: `data:image/jpeg;base64,${"A".repeat(64)}`,
    });

    assert.equal(status, 200);
    assert.equal((payload.draft as { title: string }).title, "番茄牛腩");
    assert.match(String(payload.warning), /看不了图片/);
    assert.equal(calls.length, 2);

    const retryParts = (
      calls[1].body.messages as Array<{ content: unknown }>
    )[1].content as Array<Record<string, unknown>>;
    assert.equal(retryParts.some((part) => part.type === "image_url"), false);
  });

  it("explains that the model cannot read images (OpenRouter 404)", async () => {
    stubFetch([
      {
        status: 404,
        body: JSON.stringify({
          error: { message: "No endpoints found that support image input" },
        }),
      },
    ]);
    process.env.OPENROUTER_MODEL = "deepseek/deepseek-chat";

    const { status, payload } = await call({
      image: `data:image/jpeg;base64,${"A".repeat(64)}`,
    });

    assert.equal(status, 502);
    assert.match(String(payload.error), /deepseek\/deepseek-chat/);
    assert.match(String(payload.error), /看不了图片/);
  });

  it("maps auth, credit and rate-limit failures to actionable copy", async () => {
    process.env.OPENROUTER_MODEL = "deepseek/deepseek-chat";

    stubFetch([{ status: 401, body: "{}" }]);
    assert.match(String((await call({ text: "x" })).payload.error), /OPENROUTER_API_KEY/);

    stubFetch([{ status: 402, body: "{}" }]);
    assert.match(String((await call({ text: "x" })).payload.error), /余额/);

    stubFetch([{ status: 429, body: "{}" }]);
    assert.match(String((await call({ text: "x" })).payload.error), /歇一分钟/);

    stubFetch([{ status: 404, body: JSON.stringify({ error: "model not found" }) }]);
    assert.match(String((await call({ text: "x" })).payload.error), /OPENROUTER_MODEL/);
  });

  it("rejects prose that is not a recipe object", async () => {
    stubFetch([completion({ content: "抱歉，我没看懂这张截图。" })]);

    const { status, payload } = await call({ text: "随便什么" });

    assert.equal(status, 422);
    assert.match(String(payload.error), /不是菜谱格式/);
  });

  it("rejects an empty completion", async () => {
    stubFetch([completion({ content: "" })]);

    const { status, payload } = await call({ text: "随便什么" });

    assert.equal(status, 422);
    assert.match(String(payload.error), /不是菜谱格式/);
  });

  it("returns 503 without a key", async () => {
    delete process.env.OPENROUTER_API_KEY;
    stubFetch([completion({ content: "{}" })]);

    const { status, payload } = await call({ text: "x" });

    assert.equal(status, 503);
    assert.match(String(payload.error), /OPENROUTER_API_KEY/);
    assert.equal(calls.length, 0);
  });
});

describe("POST /api/ai/recipe — guards", () => {
  it("requires text, an image or a link", async () => {
    const { status, payload } = await call({});

    assert.equal(status, 400);
    assert.match(String(payload.error), /笔记文字或截图/);
  });

  it("throttles repeated calls from one device", async () => {
    stubFetch((body) => {
      void body;
      return completion({ content: '{"title":"番茄炒蛋","ingredients":["番茄"]}' });
    });

    const request = () =>
      POST(
        new Request("http://localhost:3000/api/ai/recipe", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-real-ip": "throttled-device",
          },
          body: JSON.stringify({ text: "番茄炒蛋" }),
        }),
      );

    const statuses: number[] = [];
    for (let index = 0; index < 9; index += 1) {
      statuses.push((await request()).status);
    }

    assert.deepEqual(statuses.slice(0, 8), [200, 200, 200, 200, 200, 200, 200, 200]);
    assert.equal(statuses[8], 429);
  });
});
