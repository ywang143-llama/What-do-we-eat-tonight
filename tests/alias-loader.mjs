/**
 * Resolves the app's `@/…` import alias for `node --test`.
 *
 * The app code uses `@/lib/...` everywhere (see AGENTS.md). Node itself only
 * understands relative/package specifiers, so this hook maps `@/x` to
 * `<repo>/x.ts` (or `/x.tsx`, `/x/index.ts`). Registered from `npm test`.
 *
 * Keep this file dependency-free: it runs before any test does.
 */
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

const CANDIDATES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = resolvePath(root, specifier.slice(2));
    for (const suffix of CANDIDATES) {
      if (existsSync(`${target}${suffix}`)) {
        return nextResolve(pathToFileURL(`${target}${suffix}`).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
