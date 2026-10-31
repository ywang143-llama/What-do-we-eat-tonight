import Link from "next/link";

import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
      <div className="grid size-20 place-items-center rounded-full bg-cream-deep/80 text-[36px]">
        🥄
      </div>
      <h1 className="mt-5 text-[22px] font-bold text-ink">这道菜不在菜单里</h1>
      <p className="mt-2 max-w-[260px] text-[12.5px] leading-relaxed text-ink-soft">
        可能是链接写错了，也可能菜单刚刚更新。回厨房看看吧。
      </p>
      <Link href="/" className="mt-6">
        <Button>回到厨房</Button>
      </Link>
    </div>
  );
}
