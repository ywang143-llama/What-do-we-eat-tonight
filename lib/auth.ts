import type { Role } from "@/lib/types";

export const ROLE_LABELS: Record<Role, string> = {
  diner: "点餐员",
  chef: "大厨",
};

export function roleLabel(role: Role | null): string {
  return role ? ROLE_LABELS[role] : "访客";
}

/** Only the chef mode exposes the editing tools. */
export function canManageRole(role: Role | null): boolean {
  return role === "chef";
}

/** Where a chosen role should land. */
export function roleHome(role: Role | null): string {
  return canManageRole(role) ? "/chef/orders" : "/menu";
}

/** Keep post-unlock redirects on this site. */
export function safeNextPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  // Browsers may normalise backslashes to slashes, which could turn
  // `/\evil.example` into a protocol-relative redirect.
  if (value.includes("\\")) return null;
  return value;
}

/** Turn the few Supabase access-code failures into actionable Chinese copy. */
export function accessCodeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const text = message.toLowerCase();

  if (text.includes("anonymous sign-ins are disabled")) {
    return "Supabase 的匿名登录还没开启，请到 Authentication → Providers 打开 Anonymous sign-ins";
  }
  if (
    text.includes("could not find the function") ||
    text.includes("schema cache") ||
    text.includes("does not exist")
  ) {
    return "访问码功能还没创建，请重新运行 supabase/schema.sql";
  }
  if (text.includes("permission denied") || text.includes("row-level security")) {
    return "还没有解锁权限，刷新一下再试";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "试得太勤啦，歇一会儿再试";
  }

  return message || "解锁没成功，再试一次吧";
}
