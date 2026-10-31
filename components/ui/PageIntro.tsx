import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageIntroProps) {
  return (
    <div className={cn("animate-rise", className)}>
      {eyebrow ? (
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-terracotta">
          <span className="size-1.5 rounded-full bg-terracotta" />
          {eyebrow}
        </p>
      ) : null}
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-[27px] font-bold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {action}
      </div>
      {description ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          {description}
        </p>
      ) : null}
    </div>
  );
}
