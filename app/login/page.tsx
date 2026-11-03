import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoading } from "@/components/ui/PageLoading";

import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "解锁厨房",
  description: "输入今晚吃什么的访问码，解锁云端厨房。",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading label="正在准备解锁…" />}>
      <LoginClient />
    </Suspense>
  );
}
