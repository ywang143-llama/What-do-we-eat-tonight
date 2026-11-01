import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  completionCandidates,
  normalizeCategory,
  normalizeRecipeDraft,
  parseCompletionDraft,
  parseRecipeDraft,
} from "../lib/ai-recipe.ts";

describe("normalizeCategory", () => {
  it("accepts the canonical category ids", () => {
    assert.equal(normalizeCategory("staple"), "staple");
    assert.equal(normalizeCategory("soup"), "soup");
    assert.equal(normalizeCategory("VEGETABLE"), "vegetable");
  });

  it("maps Chinese labels models like to return", () => {
    assert.equal(normalizeCategory("主食"), "staple");
    assert.equal(normalizeCategory("肉类"), "meat");
    assert.equal(normalizeCategory("汤"), "soup");
    assert.equal(normalizeCategory("甜点"), "snack");
    assert.equal(normalizeCategory("凉菜"), "vegetable");
  });

  it("falls back to staple for unknown values", () => {
    assert.equal(normalizeCategory("看心情"), "staple");
    assert.equal(normalizeCategory(undefined), "staple");
  });
});

describe("normalizeRecipeDraft", () => {
  it("keeps valid fields and clamps calories", () => {
    const draft = normalizeRecipeDraft({
      title: "番茄牛腩",
      category: "肉类",
      calories: "520",
      ingredients: ["牛腩 400g", "  ", "番茄 3 个"],
      steps: ["牛腩焯水。", "小火炖 60 分钟。"],
    });

    assert.deepEqual(draft, {
      title: "番茄牛腩",
      category: "meat",
      calories: 520,
      ingredients: ["牛腩 400g", "番茄 3 个"],
      steps: ["牛腩焯水。", "小火炖 60 分钟。"],
    });
  });

  it("clamps out-of-range calories", () => {
    assert.equal(normalizeRecipeDraft({ title: "x", calories: 99999 })?.calories, 5000);
    assert.equal(normalizeRecipeDraft({ title: "x", calories: -20 })?.calories, 0);
    assert.equal(normalizeRecipeDraft({ title: "x", calories: "很多" })?.calories, 0);
  });

  it("understands ingredient objects", () => {
    const draft = normalizeRecipeDraft({
      title: "葱油拌面",
      ingredients: [{ name: "小葱", amount: "一把" }, { ingredient: "面条" }],
    });

    assert.deepEqual(draft?.ingredients, ["小葱 一把", "面条"]);
  });

  it("returns null when nothing usable came back", () => {
    assert.equal(normalizeRecipeDraft({}), null);
    assert.equal(normalizeRecipeDraft("牛腩"), null);
    assert.equal(normalizeRecipeDraft(null), null);
  });
});

describe("parseRecipeDraft", () => {
  it("parses plain JSON", () => {
    const draft = parseRecipeDraft(
      '{"title":"蛋炒饭","category":"staple","calories":480,"ingredients":["米饭"],"steps":["炒"]}',
    );
    assert.equal(draft?.title, "蛋炒饭");
    assert.equal(draft?.calories, 480);
  });

  it("parses JSON wrapped in a code fence", () => {
    const draft = parseRecipeDraft(
      '```json\n{"title":"紫菜蛋花汤","category":"soup","ingredients":["紫菜"]}\n```',
    );
    assert.equal(draft?.title, "紫菜蛋花汤");
    assert.equal(draft?.category, "soup");
  });

  it("parses JSON surrounded by chatter", () => {
    const draft = parseRecipeDraft(
      '好的，整理如下：\n{"title":"凉拌黄瓜","category":"vegetable","calories":80}\n希望有帮助！',
    );
    assert.equal(draft?.title, "凉拌黄瓜");
    assert.equal(draft?.category, "vegetable");
  });

  it("returns null for unparseable model output", () => {
    assert.equal(parseRecipeDraft("抱歉，我没看懂这张图。"), null);
    assert.equal(parseRecipeDraft("{不是 json}"), null);
    assert.equal(parseRecipeDraft(""), null);
  });
});

describe("completionCandidates / parseCompletionDraft", () => {
  it("collects content and reasoning fields in order", () => {
    const candidates = completionCandidates({
      choices: [
        {
          message: {
            content: "  ",
            reasoning: "thinking…",
            reasoning_content: '{"title":"番茄牛腩"}',
          },
        },
      ],
    });

    assert.deepEqual(candidates, ["thinking…", '{"title":"番茄牛腩"}']);
  });

  it("ignores non-string and missing messages", () => {
    assert.deepEqual(completionCandidates({}), []);
    assert.deepEqual(
      completionCandidates({ choices: [{ message: { content: 42 } }] }),
      [],
    );
  });

  it("falls back to a parseable reasoning field", () => {
    const draft = parseCompletionDraft({
      choices: [
        {
          message: {
            content: "",
            reasoning_content:
              '{"title":"葱油拌面","category":"主食","calories":480}',
          },
        },
      ],
    });

    assert.equal(draft?.title, "葱油拌面");
    assert.equal(draft?.category, "staple");
  });
});
