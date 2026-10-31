"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useVerificationListNavigation } from "@/hooks/expert-verification/use-verification-list-navigation";

export function VerificationWorkspaceLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const { remember } = useVerificationListNavigation();
  return <Link href={href} {...props} onClick={(event) => {
    onClick?.(event);
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && typeof href === "string") {
      remember(href, event.currentTarget.closest<HTMLElement>("[data-verification-row]"));
    }
  }} />;
}
