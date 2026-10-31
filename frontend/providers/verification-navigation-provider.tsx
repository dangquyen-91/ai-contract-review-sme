"use client";

import { createContext, useContext, type ReactNode } from "react";

const ExpertIdentity = createContext("");
export function VerificationNavigationProvider({ expertId, children }: { expertId: string; children: ReactNode }) {
  return <ExpertIdentity.Provider value={expertId}>{children}</ExpertIdentity.Provider>;
}
export const useVerificationNavigationIdentity = () => useContext(ExpertIdentity);
