"use client";
import Script from "next/script";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";
import type { GoogleSignInOptions } from "@/types/auth";

export function GoogleSignIn(options: GoogleSignInOptions) {
  const { host, ready, configured, error, busy, onReady, onScriptError } =
    useGoogleSignIn(options);
  const disabled = options.disabled ?? false;
  return (
    <div className="mt-6 grid gap-3">
      <Script
        src="https://accounts.google.com/gsi/client"
        onReady={onReady}
        onError={onScriptError}
      />
      <div
        inert={busy || disabled}
        aria-busy={busy}
        className={busy || disabled ? "opacity-60" : ""}
      >
        <div
          ref={host}
          className={`flex w-full justify-center ${ready && configured ? "min-h-11" : ""}`}
        />
        {(!ready || !configured) && (
          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-[#d5deea] py-3 text-sm text-[#69788e]"
          >
            Đăng nhập với Google
          </button>
        )}
      </div>
      {busy && (
        <p role="status" className="text-center text-xs text-[#69788e]">
          Đang đăng nhập Google...
        </p>
      )}
      {error && (
        <p role="alert" className="text-center text-xs text-[#9c2032]">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-[#69788e]">
        <span className="h-px flex-1 bg-[#e0e6ef]" />
        hoặc dùng email
        <span className="h-px flex-1 bg-[#e0e6ef]" />
      </div>
    </div>
  );
}
