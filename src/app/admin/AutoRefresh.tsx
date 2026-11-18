"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Reloads the dashboard data every minute while the page is open. */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
