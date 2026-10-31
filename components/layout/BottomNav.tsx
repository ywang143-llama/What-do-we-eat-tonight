"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  Heart,
  NotebookPen,
  Star,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export function BottomNav() {
  const pathname = usePathname();
  const { role, tonight, wishlist } = useKitchen();

  if (!role) return null;

  const pendingWishes = wishlist.filter((wish) => wish.status === "pending").length;
  const dinerCount = tonight?.items.length ?? 0;
  const pendingItems =
    tonight?.items.filter((item) => item.status !== "served").length ?? 0;

  const dinerItems: NavItem[] = [
    { href: "/menu", label: "点菜", icon: UtensilsCrossed },
    { href: "/order", label: "今晚", icon: NotebookPen, badge: dinerCount },
    { href: "/wishlist", label: "心愿", icon: Heart },
    { href: "/history", label: "回顾", icon: Star },
  ];

  const chefItems: NavItem[] = [
    { href: "/chef/orders", label: "订单", icon: ClipboardList, badge: pendingItems },
    { href: "/chef/menu", label: "菜品", icon: BookOpen },
    { href: "/chef/wishlist", label: "心愿", icon: Heart, badge: pendingWishes },
    { href: "/history", label: "回顾", icon: Star },
  ];

  const items = role === "chef" ? chefItems : dinerItems;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-cream via-cream/95 to-transparent pt-5">
      <div className="pointer-events-auto mx-auto w-full max-w-[480px] px-4 pb-safe">
        <nav
          aria-label="主导航"
          className="flex items-center justify-between gap-1 rounded-[26px] border border-line/80 bg-paper/95 px-2 py-1.5 shadow-float backdrop-blur-xl"
        >
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/menu" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;

            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-1.5 transition-colors",
                  active
                    ? "bg-[#F7EADB] text-terracotta-deep"
                    : "text-ink-soft hover:text-ink",
                )}
              >
                <span className="relative">
                  <Icon
                    className="size-[21px]"
                    strokeWidth={active ? 2.4 : 1.9}
                  />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-terracotta px-1 text-[9px] font-bold leading-none text-white ring-2 ring-paper">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[10.5px] leading-none",
                    active ? "font-bold" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
