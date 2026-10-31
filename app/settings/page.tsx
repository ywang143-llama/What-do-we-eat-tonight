"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChefHat,
  Cloud,
  Database,
  HardDrive,
  Info,
  Link2,
  RotateCcw,
  Settings2,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { InstallGuide } from "@/components/pwa/InstallGuide";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageIntro } from "@/components/ui/PageIntro";
import type { Role } from "@/lib/types";
import { useDocumentTitle } from "@/lib/use-document-title";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: Array<{
  id: Role;
  label: string;
  emoji: string;
  hint: string;
}> = [
  { id: "diner", label: "点餐员", emoji: "🍽️", hint: "挑菜、下单、写心愿" },
  { id: "chef", label: "大厨", emoji: "👨‍🍳", hint: "接单、做菜、管菜单" },
];

export default function SettingsPage() {
  useDocumentTitle("设置");
  const router = useRouter();
  const { role, setRole, mode, notify, resetDemoData, busy } = useKitchen();
  const [confirmReset, setConfirmReset] = useState(false);

  const chooseRole = (nextRole: Role) => {
    setRole(nextRole);
    notify(nextRole === "diner" ? "现在是点餐员" : "现在是大厨", "info");
    router.push(nextRole === "diner" ? "/menu" : "/chef/orders");
  };

  const handleReset = async () => {
    const ok = await resetDemoData();
    if (ok) setConfirmReset(false);
  };

  return (
    <div className="pb-4">
      <PageIntro
        eyebrow="两个人的小厨房"
        title="设置"
        description="换身份、看连接状态，或者把厨房装进手机。"
      />

      <section className="mt-5 rounded-4xl border border-line bg-paper p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-cream-deep text-terracotta">
            <Settings2 className="size-4" />
          </span>
          <div>
            <h2 className="text-[13px] font-bold text-ink">当前身份</h2>
            <p className="text-[10px] text-ink-soft">随时可以切换</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((option) => {
            const active = role === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => chooseRole(option.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-2xl border p-3 text-left transition active:scale-[0.97]",
                  active
                    ? "border-terracotta/40 bg-[#FBF0E0] shadow-sm"
                    : "border-line bg-cream/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[22px]">{option.emoji}</span>
                  {active ? (
                    <span className="rounded-full bg-terracotta px-2 py-0.5 text-[8.5px] font-bold text-white">
                      当前
                    </span>
                  ) : (
                    <ArrowRight className="size-3.5 text-ink-soft/50" />
                  )}
                </div>
                <p className="mt-2 text-[12.5px] font-bold text-ink">
                  {option.label}
                </p>
                <p className="mt-0.5 text-[9.5px] leading-relaxed text-ink-soft">
                  {option.hint}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-3 rounded-4xl border border-line bg-paper p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid size-8 place-items-center rounded-xl",
              mode === "supabase"
                ? "bg-sage-soft text-[#58704B]"
                : "bg-[#FCF1DE] text-[#8A5E1F]",
            )}
          >
            {mode === "supabase" ? (
              <Cloud className="size-4" />
            ) : (
              <HardDrive className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-bold text-ink">数据存放</h2>
            <p className="text-[10px] text-ink-soft">
              {mode === "supabase" ? "Supabase 云端" : "这台设备的浏览器"}
            </p>
          </div>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold",
              mode === "supabase"
                ? "bg-sage-soft text-[#58704B]"
                : "bg-[#FCF1DE] text-[#8A5E1F]",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                mode === "supabase" ? "bg-sage" : "bg-amber",
              )}
            />
            {mode === "supabase" ? "已连接" : "演示模式"}
          </span>
        </div>

        {mode === "local" ? (
          <>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
              现在所有菜品、订单和评价都保存在这台设备的 localStorage 里，刷新不会丢，但换手机就看不到了。
              想两个人实时同步，需要连接 Supabase。
            </p>
            <div className="mt-2.5 rounded-2xl bg-cream/70 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-ink">
                <Database className="size-3" />
                连接云端（一次就好）
              </p>
              <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-[10px] leading-relaxed text-ink-soft">
                <li>在 Supabase 新建项目，运行项目里的 schema.sql</li>
                <li>复制 .env.example 为 .env.local，填入项目 URL 和 anon key</li>
                <li>重新启动应用，就会自动切换成云端厨房</li>
              </ol>
              <p className="mt-1.5 text-[9px] text-ink-soft/75">
                详细步骤在项目的 README.md 里。
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setConfirmReset(true)}
              loading={busy}
            >
              <RotateCcw className="size-3.5" />
              重置演示数据
            </Button>
          </>
        ) : (
          <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
            菜单、订单和心愿会在两台手机之间实时同步。图片保存在 Supabase Storage 的
            dish-images 桶里。
          </p>
        )}
      </section>

      <div className="mt-3">
        <InstallGuide />
      </div>

      <section className="mt-3 overflow-hidden rounded-4xl border border-line bg-paper shadow-card">
        <QuickLink
          href="/menu"
          icon={<UtensilsCrossed className="size-4" />}
          title="点餐菜单"
          subtitle="看看今晚可以点什么"
        />
        <QuickLink
          href="/chef/orders"
          icon={<ChefHat className="size-4" />}
          title="大厨订单"
          subtitle="今晚的菜单和出餐进度"
        />
        <QuickLink
          href="/wishlist"
          icon={<Sparkles className="size-4" />}
          title="心愿单"
          subtitle="想吃但还没吃到的"
          last
        />
      </section>

      <section className="mt-3 rounded-4xl border border-line bg-paper p-4 shadow-card">
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-cream-deep text-ink-soft">
            <Info className="size-4" />
          </span>
          <div>
            <h2 className="text-[12.5px] font-bold text-ink">关于小厨房</h2>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink-soft">
              今晚吃什么 v1.0 · 为两个人做的晚饭小工具。安装和离线缓存会在正式部署后生效。
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[9.5px] text-ink-soft/70">
              <Link2 className="size-2.5" />
              Next.js + Tailwind + Supabase + PWA
            </p>
          </div>
        </div>
      </section>

      <p className="mt-5 text-center text-[10px] text-ink-soft/70">
        两个人，一顿饭，慢慢吃 🧡
      </p>

      <ConfirmDialog
        open={confirmReset}
        title="重置演示数据？"
        description="本机保存的菜品改动、订单、评价和心愿都会被清空，并恢复成初始的示例菜单。这个操作无法撤销。"
        confirmLabel="重置"
        danger
        loading={busy}
        onConfirm={() => void handleReset()}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  subtitle,
  last = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 transition active:bg-cream/60",
        !last && "border-b border-line/60",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream-deep/70 text-terracotta">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold text-ink">{title}</span>
        <span className="block text-[9.5px] text-ink-soft">{subtitle}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-ink-soft/50" />
    </Link>
  );
}
