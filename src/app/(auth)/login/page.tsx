import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="glass-strong rounded-3xl p-7 sm:p-9">
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-11 rounded-2xl" />
            <div>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="mt-1.5 h-3.5 w-44" />
            </div>
          </div>
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-6 h-11 w-full" />
          <Skeleton className="mt-4 h-11 w-full" />
          <Skeleton className="mt-6 h-12 w-full rounded-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
