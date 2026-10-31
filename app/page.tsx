"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
  HeartHandshake,
  Settings2,
  Sparkles,
} from "lucide-react";

import { BowlHero } from "@/components/illustrations/BowlHero";
import { useKitchen } from "@/components/providers/KitchenProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import type { Role } from "@/lib/types";
import { useDocumentTitle } from "@/lib/use-document-title";
import { cn } from "@/lib/utils";

const ROLES: Array<{
  id: Role;
  emoji: string;
  badge: string;
  title: string;
  description: string;
  card: string;
  avatar: string;
  chip: string;
}> = [
  {
    id: "diner",
    emoji: "🍽️",
    badge: "女朋友",
    title: "我是点餐员",
    description: "挑好今晚想吃的，剩下的交给大厨",
    card: "from-[#FFF9EE] via-[#FDF1DC] to-[#F8E1B9] border-[#EFD8B2]",
    avatar: "bg-[#FFF6E5]",
    chip: "bg-[#F7E2BE] text-[#8C6027]",
  },
  {
    id: "chef",
    emoji: "👨‍🍳",
    badge: "男朋友",
    title: "我是大厨",
    description: "看看今晚的订单，系上围裙开火",
    card: "from-[#FDF0EA] via-[#F9E2D7] to-[#F2CBBB] border-[#EFD2C3]",
    avatar: "bg-[#FFF3ED]",
    chip: "bg-[#F5D8C9] text-[#9C4F35]",
  },
];

export default function HomePage() {
  useDocumentTitle("今晚吃什么");
  const { role, roleReady, setRole, mode } = useKitchen();
  const router = useRouter();

  const enter = (nextRole: Role) => {
    setRole(nextRole);
    router.push(nextRole === "diner" ? "/menu" : "/chef/orders");
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-5 page-safe-top">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-24 size-56 rounded-full bg-amber-soft/25 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-32 size-52 rounded-full bg-rose-soft/40 blur-2xl"
      />

      <header className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-[15px] bg-gradient-to-br from-[#F2C67D] via-[#E3A050] to-[#C26A4A] text-[20px] shadow-[0_8px_16px_-10px_rgba(169,85,58,0.9)]">
            🍲
          </span>
          <div>
            <p className="text-[9px] font-semibold tracking-[0.22em] text-ink-soft">
              两个人的小厨房
            </p>
            <p className="text-[13.5px] font-bold leading-tight text-ink">
              今晚吃什么
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          aria-label="设置"
          className="grid size-10 place-items-center rounded-full border border-line bg-paper/80 text-ink-soft shadow-sm backdrop-blur transition active:scale-95"
        >
          <Settings2 className="size-[18px]" />
        </Link>
      </header>

      <section className="relative mt-5 animate-rise">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-paper/80 px-3 py-1.5 text-[11px] font-semibold text-terracotta shadow-sm backdrop-blur">
          <HeartHandshake className="size-3.5" />
          两个人的小厨房
        </p>
        <h1 className="mt-3.5 text-[33px] font-bold leading-[1.2] tracking-[-0.02em] text-ink">
          今晚，
          <br />
          <span className="relative text-terracotta">
            想吃点什么？
            <svg
              aria-hidden
              viewBox="0 0 180 12"
              className="absolute -bottom-1.5 left-0 h-2.5 w-[86%] text-amber-soft"
              preserveAspectRatio="none"
            >
              <path
                d="M2 9C42 3 96 2 178 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>
        <p className="mt-3 max-w-[280px] text-[13px] leading-relaxed text-ink-soft">
          一个人点菜，一个人下厨。
          <br />
          把晚饭这件小事，过得认真一点。
        </p>

        <BowlHero className="mx-auto -mb-2 mt-1 w-[272px] max-w-full" />
      </section>

      <section className="relative mt-4 space-y-3 pb-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-ink-soft">
          <Sparkles className="size-3.5 text-amber" />
          现在，你是——
        </p>

        {ROLES.map((item, index) => {
          const isCurrent = roleReady && role === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => enter(item.id)}
              style={{ animationDelay: `${index * 70 + 90}ms` }}
              className={cn(
                "animate-rise group flex w-full items-center gap-3.5 rounded-[26px] border bg-gradient-to-br p-4 text-left shadow-card transition-all duration-200 active:scale-[0.985]",
                item.card,
                isCurrent
                  ? "ring-2 ring-terracotta/60 ring-offset-2 ring-offset-cream"
                  : "hover:shadow-soft",
              )}
            >
              <span
                className={cn(
                  "grid size-[52px] shrink-0 place-items-center rounded-[19px] text-[26px] shadow-inner",
                  item.avatar,
                )}
              >
                {item.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-ink">
                    {item.title}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9.5px] font-semibold",
                      item.chip,
                    )}
                  >
                    {item.badge}
                  </span>
                  {isCurrent ? (
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-semibold text-terracotta">
                      上次选择
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-soft">
                  {item.description}
                </span>
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/60 text-terracotta transition group-hover:translate-x-0.5">
                <ChevronRight className="size-4" strokeWidth={2.4} />
              </span>
            </button>
          );
        })}

        <div className="flex items-center justify-center gap-5 pt-1 text-[10px] font-medium text-ink-soft/90">
          <span className="flex items-center gap-1">
            <span className="grid size-4 place-items-center rounded-full bg-amber-soft/70 text-[8px] text-[#8C6027]">
              1
            </span>
            选菜
          </span>
          <ArrowRight className="size-3 text-line" />
          <span className="flex items-center gap-1">
            <span className="grid size-4 place-items-center rounded-full bg-amber-soft/70 text-[8px] text-[#8C6027]">
              2
            </span>
            提交
          </span>
          <ArrowRight className="size-3 text-line" />
          <span className="flex items-center gap-1">
            <span className="grid size-4 place-items-center rounded-full bg-amber-soft/70 text-[8px] text-[#8C6027]">
              3
            </span>
            开饭
          </span>
        </div>
      </section>

      <div className="relative mt-4">
        <InstallPrompt />
      </div>

      <footer className="relative mt-auto flex items-center justify-between pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 text-[10.5px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              mode === "supabase" ? "bg-sage" : "bg-amber",
            )}
          />
          {mode === "supabase" ? "云端厨房已连接" : "本机演示模式"}
        </span>
        <span>两个人，一顿饭 🧡</span>
      </footer>
    </div>
  );
}
