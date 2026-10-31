import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoading } from "@/components/ui/PageLoading";

import { ImportClient } from "./ImportClient";

export const metadata: Metadata = {
  title: "收藏这道菜",
  description: "把小红书分享的菜谱存进今晚吃什么的心愿收件箱。",
};

export default function ImportPage() {
  return (
    <Suspense fallback={<PageLoading label="正在收下这条菜谱…" />}>
      <ImportClient />
    </Suspense>
  );
}
