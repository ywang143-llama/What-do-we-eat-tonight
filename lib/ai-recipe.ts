/**
 * Shared recipe-draft helpers for the OpenRouter auto-fill feature.
 * No browser or server-only APIs here, so both the API route and the unit
 * tests can import it.
 */

import type { Category } from "@/lib/types";

export interface RecipeDraft {
  title: string;
  category: Category;
  calories: number;
  ingredients: string[];
  steps: string[];
}

const MAX_ITEMS = 30;
const MAX_TITLE_LENGTH = 40;
const MAX_CALORIES = 5000;

const CATEGORY_ALIASES: Record<string, Category> = {
  staple: "staple",
  主食: "staple",
  米饭: "staple",
  面食: "staple",
  面条: "staple",
  饭: "staple",
  面: "staple",
  vegetable: "vegetable",
  蔬菜: "vegetable",
  素菜: "vegetable",
  青菜: "vegetable",
  凉菜: "vegetable",
  meat: "meat",
  肉类: "meat",
  荤菜: "meat",
  肉禽: "meat",
  肉类禽类: "meat",
  硬菜: "meat",
  soup: "soup",
  汤品: "soup",
  汤: "soup",
  饮料: "soup",
  饮品: "soup",
  snack: "snack",
  小吃: "snack",
  甜品: "snack",
  甜点: "snack",
  点心: "snack",
};

const CATEGORIES: Category[] = ["staple", "vegetable", "meat", "soup", "snack"];

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const name = asString(record.name) || asString(record.ingredient);
        const amount = asString(record.amount) || asString(record.quantity);
        return amount ? `${name} ${amount}`.trim() : name;
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}

export function normalizeCategory(value: unknown): Category {
  const key = asString(value).toLowerCase();
  if ((CATEGORIES as string[]).includes(key)) return key as Category;
  const alias = CATEGORY_ALIASES[asString(value)] ?? CATEGORY_ALIASES[key];
  return alias ?? "staple";
}

/** Keep AI output (or a chef's edit) inside sane bounds. */
export function normalizeRecipeDraft(value: unknown): RecipeDraft | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const ingredients = asStringList(
    record.ingredients ?? record.食材 ?? record.materials,
  );
  const steps = asStringList(record.steps ?? record.做法 ?? record.recipe_steps);
  const title = asString(record.title ?? record.name ?? record.菜名).slice(
    0,
    MAX_TITLE_LENGTH,
  );

  if (!title && !ingredients.length && !steps.length) return null;

  const rawCalories = Number(
    record.calories ?? record.热量 ?? record.kcal ?? 0,
  );
  const calories = Number.isFinite(rawCalories)
    ? Math.min(MAX_CALORIES, Math.max(0, Math.round(rawCalories)))
    : 0;

  return {
    title,
    category: normalizeCategory(record.category ?? record.分类),
    calories,
    ingredients,
    steps,
  };
}

/**
 * Models occasionally wrap JSON in code fences or add a sentence before it.
 * Pull out the first JSON object and normalise it.
 */
export function parseRecipeDraft(raw: string): RecipeDraft | null {
  if (!raw) return null;

  const text = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return normalizeRecipeDraft(JSON.parse(text.slice(start, end + 1)));
  } catch {
    return null;
  }
}

/**
 * Pull the candidate JSON strings out of an OpenRouter completion.
 *
 * Reasoning models (e.g. DeepSeek) may leave `content` empty and put the text
 * in `reasoning` / `reasoning_content`; some wrappers do the opposite. Trying
 * every non-empty field makes the parser work across providers.
 */
export function completionCandidates(payload: unknown): string[] {
  const choices = (payload as {
    choices?: Array<{ message?: Record<string, unknown> }>;
  })?.choices;
  const message = choices?.[0]?.message;
  if (!message) return [];

  return ["content", "reasoning", "reasoning_content"]
    .map((key) => message[key])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** First candidate that parses into a usable draft. */
export function parseCompletionDraft(payload: unknown): RecipeDraft | null {
  for (const candidate of completionCandidates(payload)) {
    const draft = parseRecipeDraft(candidate);
    if (draft) return draft;
  }
  return null;
}

/** The instruction sent to OpenRouter. */
export const RECIPE_SYSTEM_PROMPT = [
  "你是一位帮两个人打理家庭菜谱的助手。",
  "用户会给你一段从小红书分享来的菜谱文字或截图，请整理成一道家常菜。",
  "只输出一个 JSON 对象，不要 Markdown、不要解释，格式如下：",
  '{"title":"菜名（中文，不超过20字）","category":"staple|vegetable|meat|soup|snack","calories":整数千卡,"ingredients":["食材 用量"],"steps":["一步一句，具体可操作"]}',
  "category 只能取：staple 主食、vegetable 蔬菜、meat 肉类/禽类、soup 汤品/饮料、snack 小吃/甜品。",
  "calories 按两人份估算整道菜的热量，取整十位，无法判断时给 0。",
  "信息不足时按常见家常做法补全，不要编造夸张的昂贵食材。",
].join("\n");
