"use client";

import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="grid size-11 shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-50"
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200",
          checked ? "bg-sage" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
