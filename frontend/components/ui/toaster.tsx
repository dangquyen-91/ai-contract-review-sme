"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4_000}
      toastOptions={{
        style: { fontFamily: "var(--font-geist-sans), Arial, sans-serif" },
      }}
    />
  );
}
