"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/state/authStore";
import { registerOnAuthError } from "@/lib/api";

const PUBLIC_PATHS = ["/login"];

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { token, isInitialized, initialize, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    registerOnAuthError(() => {
      logout();
      router.replace("/login");
    });
    initialize();
  }, [initialize, logout, router]);

  useEffect(() => {
    if (!isInitialized) return;

    const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    if (!token && !isPublicPath) {
      router.replace("/login");
    }

    if (token && isPublicPath) {
      router.replace("/");
    }
  }, [isInitialized, token, pathname, router]);

  if (!isInitialized) {
    return null;
  }

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!token && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}
