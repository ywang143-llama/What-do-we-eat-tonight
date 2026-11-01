import { fetchLinkMeta, isSafeExternalUrl } from "@/lib/link-meta";

/**
 * Reads a shared link's Open Graph tags so the Review modal can prefill the
 * title, note and cover image for wishes that only carry a `rednote_url`
 * (iOS Shortcut / REST API imports).
 *
 * Server-side only: keeps the API surface small and avoids CORS surprises.
 */

export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim() ?? "";

  if (!url || !isSafeExternalUrl(url)) {
    return Response.json(
      { error: "这个链接读不了，换个链接或者手动填写吧" },
      { status: 400 },
    );
  }

  try {
    const meta = await fetchLinkMeta(url);
    if (!meta.title && !meta.description && !meta.image) {
      return Response.json(
        { error: "这个链接没有可读的标题，手动填一下菜名吧" },
        { status: 422 },
      );
    }
    return Response.json({ meta });
  } catch (error) {
    console.warn("[link-meta] fetch failed", url, error);
    return Response.json(
      { error: "链接没打开（小红书可能会挡住自动读取），可以贴文字或截图" },
      { status: 502 },
    );
  }
}
