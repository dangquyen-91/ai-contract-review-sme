"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { clearSessionCache } from "@/lib/session-cache";

export function usePasswordRecovery() {
  const client = useQueryClient();
  const lock = useRef(false);
  const [challenge, setChallenge] = useState<{ challengeId: string; email: string; expiresAt: string } | null>(null);
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [done, setDone] = useState(false);
  const request = useMutation({ mutationFn: authApi.forgotPassword, retry: false });
  const reset = useMutation({ mutationFn: authApi.resetPassword, retry: false });
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const busy = request.isPending || reset.isPending;
  async function send(email: string) {
    if (lock.current || busy || Date.now() < retryAt) return false;
    lock.current = true;
    reset.reset();
    try {
      const result = await request.mutateAsync(email.trim().toLowerCase());
      setChallenge({ challengeId: result.challengeId, email: email.trim().toLowerCase(), expiresAt: result.expiresAt });
      setRemaining(result.resendAfterSeconds);
      setRetryAt(Date.now() + result.resendAfterSeconds * 1000);
      return true;
    } catch { return false; }
    finally { lock.current = false; }
  }
  async function submit(values: { code: string; password: string }) {
    if (!challenge || busy || lock.current || done) return false;
    lock.current = true;
    try {
      await reset.mutateAsync({ challengeId: challenge.challengeId, ...values });
      setDone(true);
      setChallenge(null);
      await clearSessionCache(client);
      return true;
    } catch { return false; }
    finally { lock.current = false; }
  }
  function changeEmail() {
    if (busy || lock.current) return;
    setChallenge(null);
    request.reset(); reset.reset();
    // Keep the server's resend deadline even when the user returns to email entry.
  }
  return { challenge, remaining, done, busy, error: request.error?.message || reset.error?.message, send, submit, changeEmail };
}
