"use client";

import { cn } from "@/lib/utils";

const TRACK_HEIGHT = 24;
const TRACK_WIDTH = 44;
const KNOB_SIZE = 20;
const INSET = 2;

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

/**
 * iOS-style switch.
 *
 * The knob is positioned with an explicit `left` value instead of Tailwind's
 * `translate-x-[…]` utility: that utility relies on the CSS `translate`
 * property (registered custom properties), which older iOS Safari ignores —
 * leaving the knob stuck on the left even when the switch is on.
 */
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
          "relative block rounded-full transition-colors duration-200",
          checked ? "bg-sage" : "bg-line",
        )}
        style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT }}
      >
        <span
          aria-hidden
          className="absolute rounded-full bg-white shadow-sm"
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            top: (TRACK_HEIGHT - KNOB_SIZE) / 2,
            left: checked ? TRACK_WIDTH - KNOB_SIZE - INSET : INSET,
            transition: "left 200ms ease",
          }}
        />
      </span>
    </button>
  );
}
