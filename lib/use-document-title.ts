"use client";

import { useEffect } from "react";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · 今晚吃什么`;
  }, [title]);
}
