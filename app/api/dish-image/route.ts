import { buildUnsplashUrl, mapUnsplashResults } from "@/lib/image-search";

/**
 * Photo search for the chef's "自动找图" button (Unsplash).
 *
 * Server-side only so the access key never reaches the browser. Without
 * `UNSPLASH_ACCESS_KEY` the route answers 503 and the UI tells the chef to
 * upload a photo by hand.
 */

export const maxDuration = 30;

const TIMEOUT_MS = 10_000;

export async function GET(request: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim() ?? "";
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  const page = Number(params.get("page") ?? "1");

  if (!query) {
    return Response.json(
      { error: "先填上菜名，我才知道要找什么图" },
      { status: 400 },
    );
  }

  if (!key) {
    return Response.json(
      {
        error:
          "还没配置图片搜索（UNSPLASH_ACCESS_KEY），先手动拍一张吧",
      },
      { status: 503 },
    );
  }

  let response: Response;
  try {
    response = await fetch(buildUnsplashUrl(query, page), {
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
        "Accept-Language": "zh-CN",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return Response.json(
      { error: "连不上图片服务，稍后再试一次" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn(
      "[dish-image] Unsplash error",
      response.status,
      detail.slice(0, 300),
    );
    return Response.json(
      {
        error:
          response.status === 401 || response.status === 403
            ? "图片搜索密钥好像不对，检查一下 UNSPLASH_ACCESS_KEY"
            : "图片搜索这会儿不太顺，稍后再试",
      },
      { status: 502 },
    );
  }

  const images = mapUnsplashResults(await response.json().catch(() => null));
  if (!images.length) {
    return Response.json(
      { error: `没找到「${query}」的照片，换个菜名再试试` },
      { status: 404 },
    );
  }

  return Response.json({ query, images });
}
