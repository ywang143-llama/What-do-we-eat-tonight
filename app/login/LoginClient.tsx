"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Unlock,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { PageLoading } from "@/components/ui/PageLoading";
import {
  accessCodeErrorMessage,
  safeNextPath,
} from "@/lib/auth";
import { useDocumentTitle } from "@/lib/use-document-title";

export function LoginClient() {
  useDocumentTitle("解锁厨房");
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    mode,
    authReady,
    authError,
    isUnlocked,
    unlockKitchen,
  } = useKitchen();

  const next = safeNextPath(searchParams.get("next"));
  const safeNext = next && !next.startsWith("/login") ? next : null;
  const destination = safeNext ?? "/";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const blocked = Boolean(
    authError &&
      (authError.includes("Anonymous sign-ins") ||
        authError.includes("成员表") ||
        authError.includes("访问码功能")),
  );

  useEffect(() => {
    if (!authReady || !isUnlocked) return;
    router.replace(destination);
  }, [authReady, destination, isUnlocked, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || blocked) return;
    if (!code.trim()) {
      setError("先输入访问码吧");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await unlockKitchen(code);
      setStatus("解锁成功，正在回厨房…");
      router.replace(destination);
    } catch (unlockError) {
      setError(accessCodeErrorMessage(unlockError));
    } finally {
      setBusy(false);
    }
  };

  if (!authReady) return <PageLoading label="正在准备厨房…" />;

  if (mode === "local") {
    return (
      <div>
        <PageIntro
          eyebrow="本机演示厨房"
          title="现在不用访问码"
          description="这台设备上的演示数据只保存在浏览器里，切换身份就能直接玩。"
        />
        <section className="mt-5 rounded-4xl border border-line bg-paper p-5 shadow-card">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            想要两个人实时同步、把数据放到云端，先在设置里连接 Supabase，再回来设置访问码。
          </p>
          <div className="mt-4 flex gap-2.5">
            <Link href="/" className="flex-1">
              <Button size="md" className="w-full">
                <ArrowLeft className="size-4" />
                回厨房
              </Button>
            </Link>
            <Link href="/menu" className="flex-1">
              <Button size="md" variant="secondary" className="w-full">
                去菜单
              </Button>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (isUnlocked) {
    return (
      <div>
        <PageIntro
          eyebrow="已经解锁"
          title="欢迎回来"
          description="这台设备已经记住了访问码，正在带你回厨房。"
        />
        <section className="mt-5 rounded-4xl border border-line bg-paper p-5 shadow-card">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            如果页面没有自动跳转，点下面的按钮就好。
          </p>
          <Link href={destination} className="mt-4 block">
            <Button size="md" className="w-full">
              继续
            </Button>
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageIntro
        eyebrow="两个人的小厨房"
        title="解锁厨房"
        description="输入大厨设置好的访问码，就能点菜、写心愿和管理菜单。"
      />

      {authError ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-[#FBE9E3] px-3.5 py-3 text-[10.5px] leading-relaxed text-[#9A4530]"
        >
          {authError}
        </p>
      ) : null}

      <section className="mt-5 rounded-4xl border border-line bg-paper p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-rose-soft text-terracotta">
            <LockKeyhole className="size-4" />
          </span>
          <div>
            <h2 className="text-[13px] font-bold text-ink">访问码</h2>
            <p className="text-[10px] text-ink-soft">
              一个码，两个人都能用
            </p>
          </div>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-4">
          <label
            htmlFor="kitchen-code"
            className="mb-1.5 block text-[11.5px] font-semibold text-ink"
          >
            输入访问码
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft/60" />
            <input
              id="kitchen-code"
              type="password"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="比如：our-kitchen-2026"
              className="h-12 w-full rounded-2xl border border-line bg-cream/50 pl-10 pr-3.5 text-[14px] text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            loading={busy}
            disabled={blocked}
            className="mt-3 w-full"
          >
            <Unlock className="size-4" />
            解锁厨房
          </Button>
        </form>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-[#FBE9E3] px-3 py-2 text-[10.5px] leading-relaxed text-[#9A4530]"
          >
            {error}
          </p>
        ) : null}

        {status ? (
          <p
            role="status"
            className="mt-3 flex items-start gap-1.5 rounded-xl bg-[#EFF6E6] px-3 py-2 text-[10.5px] leading-relaxed text-[#4F6B3E]"
          >
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
            {status}
          </p>
        ) : null}

        <p className="mt-3 text-center text-[10px] leading-relaxed text-ink-soft/75">
          访问码由大厨在 Supabase 的 kitchen_access 表里设置。解锁后会记在这台设备上。
        </p>
      </section>

      <div className="mt-4 flex items-center justify-between px-1">
        <Link
          href="/menu"
          className="flex h-9 items-center text-[11px] font-semibold text-ink-soft"
        >
          先只读逛逛菜单
        </Link>
        <Link
          href="/"
          className="flex h-9 items-center text-[11px] font-semibold text-terracotta"
        >
          回厨房
        </Link>
      </div>
    </div>
  );
}
