import { parseRecipeDraft, RECIPE_SYSTEM_PROMPT } from "@/lib/ai-recipe";
import { fetchLinkMeta, isSafeExternalUrl } from "@/lib/link-meta";

/**
 * Server-only bridge to OpenRouter for the "Auto-fill with AI" button in the
 * chef's wish inbox. The key never reaches the browser: the client calls this
 * route, the route calls OpenRouter.
 *
 * Wishes created from a bare RedNote link have no note text, so the route can
 * read the page's Open Graph tags first (see `lib/link-meta.ts`) and feed that
 * to the model instead.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

const MAX_TEXT_LENGTH = 4000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;

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

  const userContent: Array<Record<string, unknown>> = [];
  if (text) {
    userContent.push({
      type: "text",
      text: `这是从小红书分享来的菜谱内容，请整理成家常菜：\n${text}`,
    });
  } else {
    userContent.push({
      type: "text",
      text: "这是从小红书分享来的菜谱截图，请整理成家常菜。",
    });
  }
  if (image) {
    userContent.push({ type: "image_url", image_url: { url: image } });
  }

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Tonight's Kitchen",
      },
      body: JSON.stringify({
        model: modelName(),
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: "system", content: RECIPE_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return Response.json(
      { error: "连不上 AI 服务，检查网络后再试一次" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn("[ai-recipe] OpenRouter responded", response.status, detail);
    return Response.json(
      {
        error:
          response.status === 401 || response.status === 403
            ? "AI 密钥好像不对，检查一下 OPENROUTER_API_KEY"
            : "AI 这会儿有点忙，稍后再试一次",
      },
      { status: 502 },
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | null;
  const content = payload?.choices?.[0]?.message?.content ?? "";
  const draft = parseRecipeDraft(content);

  if (!draft) {
    return Response.json(
      { error: "AI 没读懂这条笔记，先把菜名和食材填上吧" },
      { status: 422 },
    );
  }

  return Response.json({ draft });
}
