"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { useKitchen } from "@/components/providers/KitchenProvider";

export function DataErrorBanner() {
  const { error, refresh } = useKitchen();
  if (!error) return null;

  return (
    <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-2xl border border-[#E7BBAE] bg-[#FBECE7] px-3.5 py-3 text-[#8F4231]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-bold">厨房还没连上</p>
        <p className="mt-0.5 break-words text-[10.5px] leading-relaxed">
          {error}
        </p>
        <p className="mt-1 text-[9.5px] leading-relaxed opacity-80">
          如果是第一次连接 Supabase，请先运行项目里的 supabase/schema.sql。
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-2 flex h-8 items-center gap-1.5 rounded-full bg-white/70 px-3 text-[10.5px] font-semibold"
        >
          <RefreshCw className="size-3" />
          再试一次
        </button>
      </div>
    </div>
  );
}
