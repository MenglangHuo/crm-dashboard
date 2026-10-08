"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MigrationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/super-admin/migrations");
  }, [router]);

  return null;
}
