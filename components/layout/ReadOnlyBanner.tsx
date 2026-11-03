"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, LockKeyhole } from "lucide-react";

import { useKitchen } from "@/components/providers/KitchenProvider";

/**
 * Shown in cloud mode when nobody is signed in. The live menu and wishes stay
 * readable; every write action is hidden or disabled until email login.
 */
export function ReadOnlyBanner() {
  const pathname = usePathname();
  const { mode, authReady, isReadOnly } = useKitchen();

  if (pathname === "/login") return null;
  if (mode !== "supabase" || !authReady || !isReadOnly) return null;

  return (
    <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-2xl border border-[#EAD8BF] bg-[#FBF1E1] px-3.5 py-2.5 text-[#7E5B31]">
      <Eye className="size-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-[10.5px] leading-relaxed">
        只读演示 · Viewing live demo in read-only mode.
      </p>
      <Link
        href="/login"
        className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-white/75 px-3 text-[10.5px] font-semibold text-[#7E5B31] shadow-sm transition active:scale-95"
      >
        <LockKeyhole className="size-3" />
        解锁
      </Link>
    </div>
  );
}
