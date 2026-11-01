/**
 * Link preview helpers.
 *
 * Wishes created by the iOS Shortcut / REST API only carry a `rednote_url`,
 * so the Review modal reads the page's Open Graph tags to autofill the title,
 * note text and cover image before the AI parser runs.
 *
 * The parsing functions are pure and unit tested (`tests/link-meta.test.ts`);
 * `fetchLinkMeta` is only imported by server routes.
 */

import { cleanSharedTitle } from "@/lib/share-import";

export interface LinkMeta {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 600;
const MAX_HTML = 250_000;
const FETCH_TIMEOUT_MS = 6_000;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  middot: "·",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code.startsWith("#x") || code.startsWith("#X")) {
        const point = Number.parseInt(code.slice(2), 16);
        return Number.isFinite(point) ? safeFromCodePoint(point) : entity;
      }
      if (code.startsWith("#")) {
        const point = Number.parseInt(code.slice(1), 10);
        return Number.isFinite(point) ? safeFromCodePoint(point) : entity;
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
    },
  );
}

function safeFromCodePoint(point: number): string {
  if (point < 1 || point > 0x10ffff) return "";
  try {
    return String.fromCodePoint(point);
  } catch {
    return "";
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value;
}

function tidy(value: string | null, max: number): string | null {
  if (!value) return null;
  const collapsed = decodeHtmlEntities(value).replace(/\s+/gu, " ").trim();
  return collapsed ? truncate(collapsed, max) : null;
}

interface MetaTags {
  byKey: Map<string, string>;
  documentTitle: string | null;
  baseHref: string | null;
}

function readMetaTags(html: string): MetaTags {
  const byKey = new Map<string, string>();

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = new Map<string, string>();
    const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(tag)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[3] ?? match[4] ?? match[5] ?? "";
      attributes.set(key, value);
    }
    const name = (
      attributes.get("property") ??
      attributes.get("name") ??
      ""
    ).toLowerCase();
    const content = attributes.get("content");
    if (name && content && !byKey.has(name)) byKey.set(name, content);
  }

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const baseMatch = /<base\b[^>]*href\s*=\s*["']([^"']+)["']/i.exec(html);

  return {
    byKey,
    documentTitle: titleMatch ? decodeHtmlEntities(titleMatch[1]) : null,
    baseHref: baseMatch ? baseMatch[1] : null,
  };
}

function resolveImage(raw: string | null, baseUrl: string, baseHref: string | null): string | null {
  if (!raw) return null;
  try {
    const base = baseHref ? new URL(baseHref, baseUrl).href : baseUrl;
    const resolved = new URL(decodeHtmlEntities(raw).trim(), base);
    return resolved.protocol === "http:" || resolved.protocol === "https:"
      ? resolved.href
      : null;
  } catch {
    return null;
  }
}

/** Extract Open Graph / Twitter / classic meta tags from an HTML document. */
export function parseLinkMeta(html: string, baseUrl: string): LinkMeta {
  const { byKey, documentTitle, baseHref } = readMetaTags(html);

  const rawTitle =
    byKey.get("og:title") ??
    byKey.get("twitter:title") ??
    documentTitle ??
    null;

  // RedNote appends " - 小红书" and similar noise to titles.
  const cleanedTitle = rawTitle ? cleanSharedTitle(decodeHtmlEntities(rawTitle)) : "";
  const title = cleanedTitle ? truncate(cleanedTitle, MAX_TITLE) : null;

  const description = tidy(
    byKey.get("og:description") ??
      byKey.get("description") ??
      byKey.get("twitter:description") ??
      null,
    MAX_DESCRIPTION,
  );

  return {
    url: baseUrl,
    title,
    description,
    image: resolveImage(
      byKey.get("og:image") ?? byKey.get("twitter:image") ?? null,
      baseUrl,
      baseHref,
    ),
    siteName: tidy(byKey.get("og:site_name") ?? null, 60),
  };
}

function isBlockedHost(host: string): boolean {
  if (!host) return true;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa")
  ) {
    return true;
  }

  // IPv6 literals and anything we cannot reason about.
  if (host.startsWith("[") || host.includes(":")) return true;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!v4) return false;

  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** Reject non-http(s) links and obvious internal/private hosts (SSRF guard). */
export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    return !isBlockedHost(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Fetch a page and read its preview metadata. Server-side only.
 * Throws on network failure or non-HTML responses; callers fall back to manual
 * entry, so the failure message stays short and friendly.
 */
export async function fetchLinkMeta(url: string): Promise<LinkMeta> {
  if (!isSafeExternalUrl(url)) throw new Error("这个链接读不了");

  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`链接返回了 ${response.status}`);
  if (!isSafeExternalUrl(response.url || url)) throw new Error("这个链接读不了");

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("text/html")) {
    throw new Error("这个链接不是网页");
  }

  const html = (await response.text()).slice(0, MAX_HTML);
  return parseLinkMeta(html, response.url || url);
}
