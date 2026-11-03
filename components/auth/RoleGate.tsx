"use client";

import Link from "next/link";
import { LockKeyhole, Unlock, UserRound, UtensilsCrossed } from "lucide-react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/PageLoading";

/**
 * Friendly stand-in for chef-only routes when the current visitor has not
 * unlocked the kitchen or is in diner mode. It explains the next step instead
 * of hard-redirecting, because the role switch is a local UI mode.
 */
export function RoleGate() {
  const { authReady, isUnlocked, role } = useKitchen();

  if (!authReady) return <PageLoading label="正在确认厨房状态…" />;

  if (!isUnlocked) {
    return (
      <EmptyState
        emoji="🔐"
        title="输入访问码后才能进入大厨厨房"
        description="现在可以只读浏览菜单和心愿。解锁之后，就能管理菜单、整理小红书菜谱。"
        action={
          <Link href="/login">
            <Button size="sm">
              <Unlock className="size-3.5" />
              去解锁
            </Button>
          </Link>
        }
      />
    );
  }

  if (!role) {
    return (
      <EmptyState
        emoji="🍽️"
        title="先选择今晚的身份"
        description="解锁成功啦。先选一下你是点餐员还是大厨，再进厨房。"
        action={
          <Link href="/">
            <Button size="sm">
              <UserRound className="size-3.5" />
              去选身份
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <EmptyState
      emoji="🍽️"
      title="这里是大厨的厨房"
      description="点餐员可以浏览菜单、点菜和写心愿。需要整理菜单时，切换到大厨身份就好。"
      action={
        <Link href="/menu">
          <Button size="sm">
            <UtensilsCrossed className="size-3.5" />
            去点菜
          </Button>
        </Link>
      }
    />
  );
}

/** Small inline hint used when a write control is hidden in read-only mode. */
export function ReadOnlyHint() {
  return (
    <p className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line bg-paper/70 px-3.5 py-3 text-[10.5px] leading-relaxed text-ink-soft">
      <LockKeyhole className="size-3.5 shrink-0 text-amber" />
      解锁后就能动手啦。
    </p>
  );
}
