export const APP_TIME_ZONE = "Asia/Shanghai";

/** Tonight's date in China time, as YYYY-MM-DD. */
export function todayISO(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function parseISODate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

/** e.g. 10月30日 周五 */
export function formatDate(iso: string): string {
  const date = parseISODate(iso);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
}

/** e.g. 今天 · 10月30日 周五 */
export function formatDateFriendly(iso: string): string {
  const today = todayISO();
  const yesterday = todayISO(new Date(Date.now() - 86_400_000));
  const prefix = iso === today ? "今天" : iso === yesterday ? "昨天" : "";
  return prefix ? `${prefix} · ${formatDate(iso)}` : formatDate(iso);
}

export function formatTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatCalories(calories: number): string {
  return `${Math.round(calories).toLocaleString("zh-CN")} 千卡`;
}

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function createId(prefix = ""): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}-${random}` : random;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "出了点小问题，再试一次吧";
}

/**
 * Downscale + compress a photo in the browser so uploads stay small
 * (and local demo mode stays inside localStorage limits).
 */
export async function compressImage(
  file: File,
  maxSize = 1200,
  quality = 0.82,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择一张图片");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("图片处理失败，请换一张试试");

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片处理失败，请换一张试试"));
      },
      "image/jpeg",
      quality,
    );
  });
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(blob);
  });
}

export function averageRating(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
