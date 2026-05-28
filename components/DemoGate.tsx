"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DemoGate({ slug }: { slug: string }) {
  const router = useRouter();

  useEffect(() => {
    const authed = sessionStorage.getItem("demo_authed");
    if (!authed) {
      router.replace(`/demo?redirect=/shop/${slug}`);
    }
  }, [slug]);

  return null;
}
