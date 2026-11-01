/**
 * Helpers for the Unsplash-backed "自动找图" button.
 *
 * Pure functions only — the network call lives in
 * `app/api/dish-image/route.ts`, and these are unit tested directly.
 */

export interface DishImageCandidate {
  id: string;
  url: string;
  thumb: string;
  alt: string | null;
  creditName: string;
  creditLink: string;
  photoLink: string | null;
}

const MAX_RESULTS = 6;

export function buildUnsplashUrl(query: string, page = 1): URL {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query.trim());
  url.searchParams.set("per_page", String(MAX_RESULTS));
  url.searchParams.set(
    "page",
    String(Math.min(20, Math.max(1, Math.round(page) || 1))),
  );
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");
  return url;
}

interface UnsplashPhoto {
  id?: unknown;
  alt_description?: unknown;
  description?: unknown;
  urls?: Record<string, unknown>;
  user?: { name?: unknown; links?: { html?: unknown } };
  links?: { html?: unknown };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Map an Unsplash search payload into the small shape the UI needs. */
export function mapUnsplashResults(payload: unknown): DishImageCandidate[] {
  const results = (payload as { results?: UnknownPhoto[] })?.results;
  if (!Array.isArray(results)) return [];

  return results
    .map((photo, index) => {
      const urls = photo.urls ?? {};
      const url = asString(urls.regular) ?? asString(urls.full);
      if (!url) return null;

      return {
        id: asString(photo.id) ?? `photo-${index}`,
        url,
        thumb: asString(urls.small) ?? asString(urls.thumb) ?? url,
        alt:
          asString(photo.alt_description) ??
          asString(photo.description) ??
          null,
        creditName: asString(photo.user?.name) ?? "Unsplash",
        creditLink:
          asString(photo.user?.links?.html) ?? "https://unsplash.com",
        photoLink: asString(photo.links?.html),
      } satisfies DishImageCandidate;
    })
    .filter((candidate): candidate is DishImageCandidate => candidate !== null)
    .slice(0, MAX_RESULTS);
}

type UnknownPhoto = {
  id?: unknown;
  alt_description?: unknown;
  description?: unknown;
  urls?: Record<string, unknown>;
  user?: { name?: unknown; links?: { html?: unknown } };
  links?: { html?: unknown };
};
