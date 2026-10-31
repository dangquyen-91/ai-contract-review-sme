import { z } from "zod";
import { riskCodeLabels } from "@/config/risk-display";
import type { RiskCode } from "@/types/contracts";

const bulletText = z.string().refine((value) => {
  const points = value.split("\n").map((point) => point.trim()).filter(Boolean);
  return points.length <= 20 && points.every((point) => point.length <= 2000);
}, "Tối đa 20 ý, mỗi ý không quá 2.000 ký tự.");

export const verificationFindingSchema = z.object({
  title: z.string().trim().min(1, "Nhập tiêu đề rủi ro.").max(300, "Tiêu đề tối đa 300 ký tự."),
  severity: z.enum(["high", "medium", "low"]),
  riskCode: z.enum(Object.keys(riskCodeLabels) as [RiskCode, ...RiskCode[]]),
  problem: bulletText.refine((value) => Boolean(value.trim()), "Nhập ít nhất một vấn đề."),
  consequences: bulletText,
  recommendations: bulletText,
  reason: z.string().trim().max(2000, "Lý do tối đa 2.000 ký tự."),
  clauseIndex: z.string().refine((value) => value === "" || /^\d+$/.test(value), "Điều khoản không hợp lệ."),
});
export type VerificationFindingForm = z.infer<typeof verificationFindingSchema>;
