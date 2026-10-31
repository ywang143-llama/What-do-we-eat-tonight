import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  emoji = "🍲",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-4xl border border-dashed border-line bg-paper/70 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="grid size-16 place-items-center rounded-full bg-cream-deep/70 text-3xl">
        {emoji}
      </div>
      <h3 className="mt-4 text-[16px] font-bold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-ink-soft">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
