"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  Heart,
  Trash2,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageIntro } from "@/components/ui/PageIntro";
import { PageLoading } from "@/components/ui/PageLoading";
import type { Wish } from "@/lib/types";
import { useDocumentTitle } from "@/lib/use-document-title";
import { cn, formatDate, todayISO } from "@/lib/utils";

export default function ChefWishlistPage() {
  useDocumentTitle("心愿审批");
  const { ready, wishlist, getDish, deleteWish } = useKitchen();
  const [pendingDelete, setPendingDelete] = useState<Wish | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pending = useMemo(
    () => wishlist.filter((wish) => wish.status === "pending"),
    [wishlist],
  );

  const approved = useMemo(
    () =>
      wishlist
        .filter((wish) => wish.status === "approved")
        .sort((a, b) =>
          (b.approved_at ?? b.created_at).localeCompare(
            a.approved_at ?? a.created_at,
          ),
        ),
    [wishlist],
  );

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const ok = await deleteWish(pendingDelete.id);
    setDeleting(false);
    if (ok) setPendingDelete(null);
  };

  if (!ready) return <PageLoading label="正在看看点餐员的心愿…" />;

  return (
    <div>
      <PageIntro
        eyebrow="大厨 · 心愿审批"
        title="想吃的心愿"
        description="点餐员把想吃的都记在这里，能做的就收进菜单吧。"
        action={
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FBEEEA] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#A05B4A]">
            <Heart className="size-3.5" />
            {pending.length} 个待看
          </span>
        }
      />

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#EAD8BF] bg-[#FBF1E1] px-3.5 py-3">
        <Wand2 className="mt-0.5 size-4 shrink-0 text-amber" />
        <p className="text-[11px] leading-relaxed text-[#7E5B31]">
          点「做成这道菜」会打开新菜表单，菜名和心愿都已经填好。保存后，点餐员会在心愿单里看到「已经实现」。
        </p>
      </div>

      <section className="mt-5">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <h2 className="text-[13px] font-bold text-ink">待实现</h2>
          <span className="text-[10px] text-ink-soft">{pending.length} 个</span>
        </div>

        {pending.length ? (
          <ul className="space-y-2.5">
            {pending.map((wish, index) => (
              <li
                key={wish.id}
                style={{ animationDelay: `${index * 45}ms` }}
                className="animate-rise rounded-3xl border border-line bg-paper p-3.5 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-rose-soft text-[18px]">
                    💭
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-bold text-ink">
                      {wish.name}
                    </h3>
                    {wish.note ? (
                      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                        {wish.note}
                      </p>
                    ) : null}
                    <p className="mt-1.5 flex items-center gap-1 text-[9.5px] text-ink-soft/70">
                      <CalendarDays className="size-2.5" />
                      {formatDate(todayISO(new Date(wish.created_at)))} 记下
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(wish)}
                    aria-label={`删除心愿${wish.name}`}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft/60 transition hover:bg-rose-soft hover:text-terracotta"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/chef/wishlist/${wish.id}`}
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full">
                      <ChefHat className="size-3.5" />
                      做成这道菜
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingDelete(wish)}
                  >
                    <Trash2 className="size-3.5" />
                    移除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            emoji="🌙"
            title="心愿都看完了"
            description="点餐员还没有写下新的心愿，晚点再来看看吧。"
          />
        )}
      </section>

      {approved.length ? (
        <section className="mt-6">
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <h2 className="text-[13px] font-bold text-ink">已实现</h2>
            <span className="text-[10px] text-ink-soft">
              {approved.length} 道
            </span>
          </div>
          <ul className="space-y-2">
            {approved.map((wish) => {
              const dish = wish.dish_id ? getDish(wish.dish_id) : null;
              return (
                <li
                  key={wish.id}
                  className="flex items-center gap-2.5 rounded-2xl border border-[#DCE8D0] bg-[#F8FBF4] px-3.5 py-3"
                >
                  <CheckCircle2 className="size-4 shrink-0 text-sage" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-ink">
                      {dish?.name ?? wish.name}
                    </p>
                    <p className="text-[9.5px] text-ink-soft">
                      {wish.approved_at
                        ? `${formatDate(todayISO(new Date(wish.approved_at)))} 收进菜单`
                        : "已加入菜单"}
                    </p>
                  </div>
                  {dish ? (
                    <Link
                      href={`/chef/menu/${dish.id}`}
                      className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-2.5 text-[10px] font-semibold text-[#58704B] shadow-sm"
                    >
                      看看
                      <ArrowRight className="size-3" />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p
        className={cn(
          "mt-6 text-center text-[10px] text-ink-soft/70",
          !approved.length && "hidden",
        )}
      >
        被认真对待的小心愿，都会变成饭桌上的菜 🧡
      </p>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="移除这个心愿？"
        description={
          pendingDelete
            ? `「${pendingDelete.name}」会从心愿单里消失，点餐员不会收到通知。`
            : ""
        }
        confirmLabel="移除"
        danger
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
