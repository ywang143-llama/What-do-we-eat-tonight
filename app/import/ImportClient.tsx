"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BookmarkPlus,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { parseSharedWish } from "@/lib/share-import";
import { useDocumentTitle } from "@/lib/use-document-title";

export function ImportClient() {
  useDocumentTitle("收藏这道菜");
  const searchParams = useSearchParams();
  const { ready, addSharedWish } = useKitchen();

  const parsed = useMemo(() => parseSharedWish(searchParams), [searchParams]);
  const started = useRef(false);
  const [status, setStatus] = useState<"working" | "saved" | "failed" | "empty">(
    parsed.ok ? "working" : "empty",
  );

  const save = useCallback(async () => {
    if (!parsed.ok) return;
    setStatus("working");
    const ok = await addSharedWish({
      title: parsed.draft.title,
      rednote_url: parsed.draft.rednote_url,
      note: parsed.draft.note,
    });
    setStatus(ok ? "saved" : "failed");
  }, [addSharedWish, parsed]);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    void save();
  }, [ready, save]);

  return (
    <div>
      <PageIntro
        eyebrow="分享 · 心愿收件箱"
        title="收下这道菜"
        description="从分享进来的菜谱会先放在大厨的收件箱，整理好就能上架。"
      />

      <section className="mt-5 animate-rise rounded-4xl border border-line bg-paper p-5 shadow-card">
        {status === "working" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Loader2 className="size-7 animate-spin text-terracotta" />
            <p className="mt-3 text-[13px] font-semibold text-ink">
              正在放进心愿收件箱…
            </p>
            <p className="mt-1 text-[11px] text-ink-soft">马上就好</p>
          </div>
        ) : null}

        {status === "saved" && parsed.ok ? (
          <div className="text-center">
            <span className="grid mx-auto size-14 place-items-center rounded-full bg-sage-soft text-sage">
              <CheckCircle2 className="size-7" />
            </span>
            <h2 className="mt-3 text-[16px] font-bold text-ink">
              已经收进心愿收件箱
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              大厨打开「心愿」就能看到它，可以一键用 AI 自动填写食材和热量。
            </p>

            <div className="mt-4 rounded-2xl bg-cream/60 px-4 py-3 text-left">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-soft">
                <BookmarkPlus className="size-3.5" />
                刚收下的菜
              </p>
              <p className="mt-1 text-[14px] font-bold text-ink">
                {parsed.draft.title}
              </p>
              {parsed.draft.rednote_url ? (
                <a
                  href={parsed.draft.rednote_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-terracotta"
                >
                  <ExternalLink className="size-3" />
                  查看原笔记
                </a>
              ) : null}
            </div>

            <div className="mt-5 flex gap-2.5">
              <Link href="/chef/wishlist" className="flex-1">
                <Button size="md" className="w-full">
                  去心愿收件箱
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button size="md" variant="secondary" className="w-full">
                  回厨房
                </Button>
              </Link>
            </div>
          </div>
        ) : null}

        {status === "failed" ? (
          <div className="text-center">
            <span className="grid mx-auto size-14 place-items-center rounded-full bg-rose-soft text-terracotta">
              <AlertCircle className="size-7" />
            </span>
            <h2 className="mt-3 text-[16px] font-bold text-ink">
              这次没放进去
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              可能这条笔记已经收藏过了，或者网络断了一下。再试一次看看吧。
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button size="md" className="flex-1" onClick={() => void save()}>
                <RotateCcw className="size-4" />
                再试一次
              </Button>
              <Link href="/chef/wishlist" className="flex-1">
                <Button size="md" variant="secondary" className="w-full">
                  看看收件箱
                </Button>
              </Link>
            </div>
          </div>
        ) : null}

        {status === "empty" ? (
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-cream-deep/70 text-[24px]">
              💭
            </span>
            <h2 className="mt-3 text-[16px] font-bold text-ink">
              没收到可以收藏的内容
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              在小红书里点「分享 → 今晚吃什么」再试一次，也可以直接在心愿单里写下菜名。
            </p>
            <div className="mt-5 flex gap-2.5">
              <Link href="/wishlist" className="flex-1">
                <Button size="md" className="w-full">
                  去写心愿
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button size="md" variant="secondary" className="w-full">
                  回厨房
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-ink-soft/70">
        小提示：先把这个网页「添加到主屏幕」，小红书的分享面板里就会出现「今晚吃什么」。
      </p>
    </div>
  );
}
