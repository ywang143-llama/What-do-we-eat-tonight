"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { formatDateFriendly, todayISO } from "@/lib/utils";

export function Header() {
  const { role, setRole, notify } = useKitchen();
  const router = useRouter();
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(formatDateFriendly(todayISO()));
  }, []);

  const isChef = role === "chef";
  const otherRole = isChef ? "diner" : "chef";

  const handleSwitch = () => {
    setRole(otherRole);
    notify(
      otherRole === "diner" ? "切换到点餐员 🍽️" : "切换到大厨 👨‍🍳",
      "info",
    );
    router.push(otherRole === "diner" ? "/menu" : "/chef/orders");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 px-4 pb-2.5 header-safe-top">
        <Link
          href={role === "chef" ? "/chef/orders" : role === "diner" ? "/menu" : "/"}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[15px] bg-gradient-to-br from-[#F2C67D] via-[#E3A050] to-[#C26A4A] text-[20px] shadow-[0_8px_16px_-10px_rgba(169,85,58,0.9)]">
            🍲
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-bold leading-tight tracking-tight text-ink">
              今晚吃什么
            </span>
            <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-ink-soft">
              {today || "两个人的小厨房"}
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          {role ? (
            <button
              type="button"
              onClick={handleSwitch}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-paper/90 px-2.5 text-[11.5px] font-semibold text-ink shadow-sm transition active:scale-95"
              aria-label={`当前是${isChef ? "大厨" : "点餐员"}，点击切换身份`}
            >
              <span className="text-[14px]">{isChef ? "👨‍🍳" : "🍽️"}</span>
              <span>{isChef ? "大厨" : "点餐员"}</span>
              <ArrowLeftRight className="size-3 text-ink-soft" />
            </button>
          ) : (
            <Link
              href="/"
              className="flex h-9 items-center rounded-full border border-line bg-paper/90 px-3 text-[11.5px] font-semibold text-ink"
            >
              选择身份
            </Link>
          )}
          <Link
            href="/settings"
            aria-label="设置"
            className="grid size-9 place-items-center rounded-full border border-line bg-paper/90 text-ink-soft transition active:scale-95"
          >
            <Settings2 className="size-[17px]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
