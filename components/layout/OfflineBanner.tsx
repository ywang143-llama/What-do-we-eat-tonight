"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!window.navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-[11.5px] font-medium text-cream">
      <WifiOff className="size-3.5" />
      现在没有网络 · 已缓存的页面和小厨房数据还能看看
    </div>
  );
}
