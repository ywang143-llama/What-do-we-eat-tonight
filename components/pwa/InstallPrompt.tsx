"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "tonights-kitchen:install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (standalone) {
      setInstalled(true);
      return;
    }

    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // Ignore storage denial.
    }

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIOS(ios);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);

    const timer = window.setTimeout(() => setVisible(true), 1800);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore.
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      setInstalled(true);
    }
    setDeferred(null);
  };

  if (installed || !visible) return null;
  if (!deferred && !isIOS) return null;

  return (
    <div className="animate-rise rounded-4xl border border-line bg-paper/95 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#F5D9AE] to-[#E8B072] text-[20px]">
          🍲
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-ink">把厨房装进口袋</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
            {isIOS
              ? "在 Safari 点底部的分享按钮，再选「添加到主屏幕」，以后一按就开。"
              : "安装到手机桌面，像原生 App 一样打开，今晚点菜更快。"}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="不再提示"
          className="-mr-1 -mt-1 rounded-full p-1.5 text-ink-soft"
        >
          <X className="size-4" />
        </button>
      </div>

      {isIOS ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-cream px-3 py-2.5 text-[11.5px] text-ink">
          <span className="flex items-center gap-1 font-semibold">
            <Share className="size-3.5 text-terracotta" />
            分享
          </span>
          <span className="text-line">→</span>
          <span className="flex items-center gap-1 font-semibold">
            <SquarePlus className="size-3.5 text-terracotta" />
            添加到主屏幕
          </span>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={install} className="flex-1">
            <Download className="size-4" />
            安装到桌面
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            以后再说
          </Button>
        </div>
      )}
    </div>
  );
}
