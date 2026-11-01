"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "再想想",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        type="button"
        aria-label="关闭"
        onClick={onCancel}
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise relative w-full max-w-[480px] rounded-t-[30px] border border-line bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-float"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <button
          type="button"
          onClick={onCancel}
          aria-label="关闭"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-cream text-ink-soft"
        >
          <X className="size-4" />
        </button>
        <h2 className="pr-10 text-[17px] font-bold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex gap-2.5">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
