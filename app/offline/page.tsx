"use client";

import Link from "next/link";
import { Home, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useDocumentTitle } from "@/lib/use-document-title";

export default function OfflinePage() {
  useDocumentTitle("暂时离线");

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
      <div className="grid size-20 place-items-center rounded-full bg-cream-deep/80 text-[36px]">
        🍲
      </div>
      <h1 className="mt-5 text-[22px] font-bold text-ink">厨房暂时断网了</h1>
      <p className="mt-2 max-w-[280px] text-[12.5px] leading-relaxed text-ink-soft">
        别担心，之前看过的页面还在这里。等网络回来，今晚的菜单就能继续更新。
      </p>
      <div className="mt-6 flex gap-2">
        <Button
          variant="secondary"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-4" />
          再试一次
        </Button>
        <Link href="/">
          <Button>
            <Home className="size-4" />
            回厨房
          </Button>
        </Link>
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-[10px] text-ink-soft/60">
        <WifiOff className="size-3" />
        离线的厨房也可以点进来看看
      </p>
    </div>
  );
}
