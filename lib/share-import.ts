/**
 * Pure helpers that turn a Web Share Target payload (typically RedNote /
 * 小红书) into a wishlist draft.
 *
 * Kept free of React / Next / browser APIs so the parser can be unit tested
 * with `npm test`.
 */

export const FALLBACK_SHARE_TITLE = "小红书收藏的菜";

const MAX_TITLE_LENGTH = 40;
const MAX_NOTE_LENGTH = 600;

const URL_PATTERN = /https?:\/\/[^\s<>"'“”「」【】（）()，。；：！？、]+/i;
const TRAILING_PUNCTUATION = /[.,;:!?，。；：！？、)\]}>》」』…]+$/u;

const REDNOTE_HOSTS = ["xiaohongshu.com", "xhslink.com"];

export interface SharedWishDraft {
  /** A human-friendly dish name, never empty. */
  title: string;
  /** The first http(s) link from the share payload, if any. */
  rednote_url: string | null;
  /** The remaining shared text (URLs and boilerplate removed), if any. */
  note: string | null;
  /** True when the saved link points at RedNote. */
  isRedNote: boolean;
}

export type ShareParseResult =
  | { ok: true; draft: SharedWishDraft }
  | { ok: false; reason: "empty" };

/** Anything with a `get`, e.g. URLSearchParams / ReadonlyURLSearchParams / a plain object. */
export type ShareParams =
  | { get: (key: string) => string | null }
  | Record<string, string | string[] | null | undefined>;

function readParam(params: ShareParams, key: string): string {
  if (typeof (params as { get?: unknown }).get === "function") {
    const value = (params as { get: (key: string) => string | null }).get(key);
    return typeof value === "string" ? value.trim() : "";
  }

  const value = (params as Record<string, string | string[] | null | undefined>)[
    key
  ];
  if (Array.isArray(value)) return (value[0] ?? "").trim();
  return typeof value === "string" ? value.trim() : "";
}

/** First http(s) URL inside a piece of text, without trailing punctuation. */
export function extractSharedUrl(value: string): string | null {
  if (!value) return null;
  const match = URL_PATTERN.exec(value);
  if (!match) return null;
  const cleaned = match[0].replace(TRAILING_PUNCTUATION, "");
  return cleaned.length > "https://".length ? cleaned : null;
}

export function isRedNoteUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return REDNOTE_HOSTS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value;
}

/**
 * Best-effort dish name from a shared title or note text.
 * RedNote shares look like:
 *   "番茄牛腩 - 小红书 35 【番茄牛腩】… http://xhslink.com/a/xxxx
 *    复制本条信息，打开【小红书】App查看精彩内容！"
 */
export function cleanSharedTitle(raw: string): string {
  if (!raw) return "";

  const withoutUrls = raw.replace(URL_PATTERN, " ");
  const withoutBoilerplate = withoutUrls
    .replace(/复制本条信息[\s\S]*$/u, " ")
    .replace(/打开【?小红书】?[^。！!\n]*$/u, " ")
    .replace(/\s*[-|｜–—]\s*小红书.*$/u, " ")
    .replace(/小红书\s*[:：]\s*/gu, " ")
    .replace(/[#＃][^\s#＃]+/gu, " ");

  const firstLine =
    withoutBoilerplate
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .find(Boolean) ?? "";

  const cleaned = firstLine
    .replace(/^[\s\-–—·|•]+/u, "")
    .replace(/^[【「（(“"]+/u, "")
    .replace(/[】」）)”"]+$/u, "")
    .replace(/\s*[-|｜–—]\s*$/u, "")
    .trim();

  return truncate(cleaned, MAX_TITLE_LENGTH);
}

function buildNote(rawText: string, title: string): string | null {
  if (!rawText) return null;

  const cleaned = rawText
    .replace(URL_PATTERN, " ")
    .replace(/复制本条信息[\s\S]*$/u, " ")
    .replace(/\s+\n/gu, "\n")
    .replace(/[ \t]+/gu, " ")
    .trim();

  if (!cleaned) return null;
  if (cleaned === title) return null;
  return truncate(cleaned, MAX_NOTE_LENGTH);
}

/**
 * Parse the `title` / `text` / `url` parameters a share sheet sends to
 * `/import?title=…&text=…&url=…`.
 */
export function parseSharedWish(params: ShareParams): ShareParseResult {
  const rawTitle = readParam(params, "title");
  const rawText = readParam(params, "text");
  const rawUrl = readParam(params, "url");

  if (!rawTitle && !rawText && !rawUrl) {
    return { ok: false, reason: "empty" };
  }

  const rednoteUrl =
    extractSharedUrl(rawUrl) ??
    extractSharedUrl(rawText) ??
    extractSharedUrl(rawTitle);

  const title =
    cleanSharedTitle(rawTitle) ||
    cleanSharedTitle(rawText) ||
    (rednoteUrl ? FALLBACK_SHARE_TITLE : "");

  if (!title) return { ok: false, reason: "empty" };

  return {
    ok: true,
    draft: {
      title,
      rednote_url: rednoteUrl,
      note: buildNote(rawText || rawTitle, title),
      isRedNote: isRedNoteUrl(rednoteUrl),
    },
  };
}
