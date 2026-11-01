import {
  completionCandidates,
  parseCompletionDraft,
  RECIPE_SYSTEM_PROMPT,
} from "@/lib/ai-recipe";
import { fetchLinkMeta, isSafeExternalUrl } from "@/lib/link-meta";

/**
 * Server-only bridge to OpenRouter for the "Auto-fill with AI" button in the
 * chef's wish inbox. The key never reaches the browser: the client calls this
 * route, the route calls OpenRouter.
 *
 * Wishes created from a bare RedNote link have no note text, so the route can
 * read the page's Open Graph tags first (see `lib/link-meta.ts`) and feed that
 * to the model instead. Reasoning models (DeepSeek, o-series) may answer in
 * `reasoning_content` rather than `content`, so every candidate is parsed.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

const MAX_TEXT_LENGTH = 4000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
const OPENROUTER_TIMEOUT_MS = 45_000;

export const maxDuration = 60;

// Best-effort, per-instance throttle. Enough to stop accidental loops.
const hits = new Map<string, number[]>();

function allowed(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(
    (stamp) => now - stamp < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

function configuredKey(): string {
  return process.env.OPENROUTER_API_KEY?.trim() ?? "";
}

function modelName(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

function isImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(value) &&
    value.length < 6_000_000
  );
}

/** OpenRouter reports "no endpoints support image input" for text-only models. */
function looksLikeVisionError(detail: string): boolean {
  const text = detail.toLowerCase();
  return (
    text.includes("image") &&
    (text.includes("support") ||
      text.includes("modality") ||
      text.includes("vision") ||
      text.includes("multimodal"))
  );
}

/** Turn an OpenRouter failure into something a person can act on. */
function explainUpstream(
  status: number,
  detail: string,
  model: string,
): string {
  const text = detail.toLowerCase();

  if (status === 0) return "连不上 AI 服务，检查网络后再试一次";
  if (status === 401 || status === 403) {
    return "AI 密钥好像不对，检查一下 OPENROUTER_API_KEY";
  }
  if (status === 402) return "OpenRouter 余额不够了，充值后再试一次";
  if (status === 429) return "AI 被叫得太勤啦，歇一分钟再试";

  // Vision check first: OpenRouter often reports it as a 404, which would
  // otherwise look like an unknown model.
  if (looksLikeVisionError(detail)) {
    return `模型 ${model} 看不了图片：换一个支持图片的模型，或者把笔记文字贴进来`;
  }

  if (status === 404 || (text.includes("model") && text.includes("not found"))) {
    return `找不到模型 ${model}，检查一下 OPENROUTER_MODEL`;
  }

  if (text.includes("context") || text.includes("too long")) {
    return "这条笔记太长了，删掉一些再试";
  }

  return "AI 这会儿有点忙，稍后再试一次";
}

export async function GET() {
  return Response.json({
    configured: Boolean(configuredKey()),
    model: modelName(),
  });
}

export async function POST(request: Request) {
  const apiKey = configuredKey();
  if (!apiKey) {
    return Response.json(
      {
        error:
          "还没配置 AI 密钥（OPENROUTER_API_KEY），先在服务端填上，或者手动写吧",
      },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  if (!allowed(ip)) {
    return Response.json(
      { error: "AI 被叫得太勤啦，歇一分钟再试" },
      { status: 429 },
    );
  }

  let body: { text?: unknown; image?: unknown; url?: unknown };
  try {
    body = (await request.json()) as {
      text?: unknown;
      image?: unknown;
      url?: unknown;
    };
  } catch {
    return Response.json({ error: "请求格式不太对，再试一次" }, { status: 400 });
  }

  const image = isImageDataUrl(body.image) ? body.image : null;
  const linkUrl =
    typeof body.url === "string" && isSafeExternalUrl(body.url)
      ? body.url.trim()
      : null;
  let text = typeof body.text === "string"
    ? body.text.trim().slice(0, MAX_TEXT_LENGTH)
    : "";

  // A wish that only carries a RedNote link has no text to parse yet, so read
  // the page preview first and feed that to the model.
  if (!text && !image && linkUrl) {
    try {
      const meta = await fetchLinkMeta(linkUrl);
      const preview = [meta.title, meta.description]
        .filter(Boolean)
        .join("\n")
        .trim();
      if (!preview) {
        return Response.json(
          { error: "这个链接里没有可读的内容，贴一下笔记文字或截图吧" },
          { status: 422 },
        );
      }
      text = preview.slice(0, MAX_TEXT_LENGTH);
    } catch {
      return Response.json(
        {
          error:
            "链接没打开（小红书可能会挡住自动读取），贴一下笔记文字或截图吧",
        },
        { status: 502 },
      );
    }
  }

  if (!text && !image) {
    return Response.json(
      { error: "把笔记文字或截图给我，我才能帮你整理呀" },
      { status: 400 },
    );
  }

  const buildUserContent = (withImage: boolean) => {
    const content: Array<Record<string, unknown>> = [];
    if (text) {
      content.push({
        type: "text",
        text: `这是从小红书分享来的菜谱内容，请整理成家常菜：\n${text}`,
      });
    } else {
      content.push({
        type: "text",
        text: "这是从小红书分享来的菜谱截图，请整理成家常菜。",
      });
    }
    if (withImage && image) {
      content.push({ type: "image_url", image_url: { url: image } });
    }
    return content;
  };

  const model = modelName();

  const buildBody = (jsonMode: boolean, withImage: boolean) =>
    JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 900,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: RECIPE_SYSTEM_PROMPT },
        { role: "user", content: buildUserContent(withImage) },
      ],
    });

  type Attempt =
    | { ok: true; payload: unknown }
    | { ok: false; status: number; detail: string };

  const callOpenRouter = async (
    jsonMode: boolean,
    withImage: boolean,
  ): Promise<Attempt> => {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Tonight's Kitchen",
        },
        body: buildBody(jsonMode, withImage),
        signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
      });

      if (response.ok) {
        return { ok: true, payload: await response.json().catch(() => null) };
      }

      return {
        ok: false,
        status: response.status,
        detail: await response.text().catch(() => ""),
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        detail: error instanceof Error ? error.message : "network error",
      };
    }
  };

  let attempt = await callOpenRouter(true, true);

  // Not every model/provider accepts JSON mode; retry once without it.
  if (
    !attempt.ok &&
    attempt.status === 400 &&
    /response_format|json/i.test(attempt.detail)
  ) {
    console.warn("[ai-recipe] model rejected JSON mode, retrying without it", {
      model,
    });
    attempt = await callOpenRouter(false, true);
  }

  // Text-only models (e.g. deepseek/deepseek-chat) reject the whole request
  // when a screenshot is attached. If the chef also pasted text, retry without
  // the image instead of failing.
  let imageSkipped = false;
  if (!attempt.ok && image && text && looksLikeVisionError(attempt.detail)) {
    console.warn("[ai-recipe] model cannot read images, retrying with text only", {
      model,
    });
    imageSkipped = true;
    attempt = await callOpenRouter(false, false);
  }

  if (!attempt.ok) {
    console.warn("[ai-recipe] OpenRouter error", {
      model,
      status: attempt.status,
      detail: attempt.detail.slice(0, 400),
    });
    return Response.json(
      { error: explainUpstream(attempt.status, attempt.detail, model) },
      { status: 502 },
    );
  }

  const draft = parseCompletionDraft(attempt.payload);

  if (!draft) {
    const [candidate] = completionCandidates(attempt.payload);
    console.warn("[ai-recipe] unparseable completion", {
      model,
      preview: candidate?.slice(0, 400) ?? "(empty response)",
    });
    return Response.json(
      { error: "AI 的回复不是菜谱格式，再点一次或者手动填一下吧" },
      { status: 422 },
    );
  }

  return Response.json({
    draft,
    model,
    ...(imageSkipped
      ? { warning: "这个模型看不了图片，已按你贴的文字整理" }
      : {}),
  });
}
