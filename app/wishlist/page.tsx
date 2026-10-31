"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Heart,
  Plus,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { DishImage } from "@/components/ui/DishImage";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageIntro } from "@/components/ui/PageIntro";
import { PageLoading } from "@/components/ui/PageLoading";
import { useDocumentTitle } from "@/lib/use-document-title";
import { formatDate, todayISO } from "@/lib/utils";

export default function WishlistPage() {
  useDocumentTitle("心愿单");
  const { ready, wishlist, addWish, getDish } = useKitchen();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const pending = useMemo(
    () =>
      wishlist
        .filter((wish) => wish.status === "pending_review")
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [wishlist],
  );
  const approved = useMemo(
    () =>
      wishlist
        .filter((wish) => wish.status === "ready")
        .sort((a, b) =>
          (b.approved_at ?? b.created_at).localeCompare(
            a.approved_at ?? a.created_at,
          ),
        ),
    [wishlist],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    const ok = await addWish(name, note);
    setSaving(false);
    if (ok) {
      setName("");
      setNote("");
    }
  };

  if (!ready) return <PageLoading label="正在翻开小心愿…" />;

  return (
    <div>
      <PageIntro
        eyebrow="点餐员 · 小心愿"
        title="心愿单"
        description="现在吃不到也没关系，先记下来，等大厨慢慢学。"
        action={
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FBEEEA] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#A05B4A]">
            <Heart className="size-3.5" />
            {pending.length} 个愿望
          </span>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="mt-5 animate-rise rounded-4xl border border-line bg-paper p-4 shadow-card"
      >
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-rose-soft text-terracotta">
            <Sparkles className="size-4" />
          </span>
          <h2 className="text-[13.5px] font-bold text-ink">又想吃什么啦？</h2>
        </div>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={30}
          placeholder="菜名，比如「麻辣香锅」"
          className="mt-3 h-12 w-full rounded-2xl border border-line bg-cream/50 px-3.5 text-[14px] text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10"
        />
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={120}
          placeholder="写点小要求：微辣、多加藕片、想周末吃…"
          className="mt-2 w-full resize-none rounded-2xl border border-line bg-cream/50 px-3.5 py-3 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="px-1 text-[10px] text-ink-soft/60">
            {note.length}/120
          </span>
          <Button type="submit" size="md" loading={saving} disabled={!name.trim()}>
            <Plus className="size-4" />
            放进心愿单
          </Button>
        </div>
      </form>

      <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[#EAD8BF] bg-[#FBF1E1] px-3.5 py-3">
        <ExternalLink className="mt-0.5 size-4 shrink-0 text-amber" />
        <p className="text-[11px] leading-relaxed text-[#7E5B31]">
          在小红书看到想吃的？用手机「分享」到今晚吃什么，就会自动躺进大厨的心愿收件箱。
        </p>
      </div>

      <section className="mt-6">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <h2 className="text-[13px] font-bold text-ink">等大厨翻牌</h2>
          <span className="text-[10.5px] text-ink-soft">{pending.length} 个</span>
        </div>

        {pending.length ? (
          <ul className="space-y-2.5">
            {pending.map((wish) => (
              <li
                key={wish.id}
                className="animate-rise flex items-start gap-3 rounded-3xl border border-line bg-paper px-4 py-3.5 shadow-card"
              >
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-[#FCF1DE] text-[18px]">
                  🤞
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[13.5px] font-bold text-ink">
                      {wish.title}
                    </h3>
                    <span className="shrink-0 rounded-full bg-[#FCF1DE] px-1.5 py-0.5 text-[9px] font-semibold text-[#8A5E1F]">
                      等大厨翻牌
                    </span>
                  </div>
                  {wish.note ? (
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-soft">
                      {wish.note}
                    </p>
                  ) : null}
                  {wish.source === "share" ? (
                    wish.rednote_url ? (
                      <a
                        href={wish.rednote_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-terracotta"
                      >
                        <ExternalLink className="size-3" />
                        查看收藏的原笔记
                      </a>
                    ) : (
                      <p className="mt-1.5 text-[10px] text-ink-soft/70">
                        从分享收藏
                      </p>
                    )
                  ) : null}
                  <p className="mt-1.5 text-[9.5px] text-ink-soft/60">
                    {formatDate(todayISO(new Date(wish.created_at)))} 记下
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            emoji="💭"
            title="暂时没有新的心愿"
            description="想吃什么就写下来，大厨会经常来看看的。"
          />
        )}
      </section>

      {approved.length ? (
        <section className="mt-6">
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <h2 className="text-[13px] font-bold text-ink">已经实现</h2>
            <span className="text-[10.5px] text-ink-soft">
              {approved.length} 道
            </span>
          </div>
          <ul className="space-y-2.5">
            {approved.map((wish) => {
              const dish = wish.dish_id ? getDish(wish.dish_id) : null;
              return (
                <li
                  key={wish.id}
                  className="flex items-center gap-3 rounded-3xl border border-[#DCE8D0] bg-[#F7FAF2] p-3 shadow-card"
                >
                  <div className="size-12 shrink-0 overflow-hidden rounded-2xl">
                    {dish ? (
                      <DishImage dish={dish} emojiClassName="text-[22px]" />
                    ) : (
                      <div className="grid size-full place-items-center bg-sage-soft text-[20px]">
                        ✅
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[13px] font-bold text-ink">
                      {dish?.name ?? wish.title}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-[10.5px] font-medium text-[#58704B]">
                      <CheckCircle2 className="size-3" />
                      大厨已经学会啦
                    </p>
                  </div>
                  <Link
                    href="/menu"
                    className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-[10.5px] font-bold text-[#58704B] shadow-sm"
                  >
                    去点
                    <ArrowRight className="size-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="mt-6 text-center text-[10.5px] text-ink-soft/70">
          心愿会被好好收着的 🧡
        </p>
      )}
    </div>
  );
}
