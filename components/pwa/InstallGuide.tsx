"use client";

import { CheckCircle2, Share, Smartphone, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

export function InstallGuide() {
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
          true,
    );
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
  }, []);

  return (
    <section className="rounded-4xl border border-line bg-paper p-4 shadow-soft">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-cream-deep text-terracotta">
          <Smartphone className="size-[18px]" />
        </span>
        <div>
          <h2 className="text-[14px] font-bold text-ink">安装到手机</h2>
          <p className="text-[11px] text-ink-soft">像 App 一样从桌面打开</p>
        </div>
      </div>

      {standalone ? (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-sage-soft px-3 py-2.5 text-[12px] font-medium text-[#4F6544]">
          <CheckCircle2 className="size-4" />
          已经安装在这台设备上啦
        </p>
      ) : (
        <div className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-ink-soft">
          <div className="rounded-2xl bg-cream/70 px-3 py-2.5">
            <p className="mb-1 font-semibold text-ink">iPhone / iPad · Safari</p>
            <p className="flex flex-wrap items-center gap-1">
              点
              <Share className="inline size-3.5 text-terracotta" />
              分享按钮 → 选
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <SquarePlus className="size-3.5" />
                添加到主屏幕
              </span>
            </p>
          </div>
          <div className="rounded-2xl bg-cream/70 px-3 py-2.5">
            <p className="mb-1 font-semibold text-ink">Android · Chrome</p>
            <p>
              点右上角
              <span className="font-semibold text-ink"> ⋮ </span>
              菜单 → 选「安装应用」或「添加到主屏幕」
            </p>
          </div>
          <p className="px-1 text-[10.5px] text-ink-soft/80">
            {ios
              ? "提示：只有 Safari 支持在 iPhone 上安装网页 App。"
              : "安装后即使网络慢一点，厨房也能快速打开。"}
          </p>
        </div>
      )}
    </section>
  );
}
