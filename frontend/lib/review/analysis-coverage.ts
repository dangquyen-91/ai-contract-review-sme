import type { CheckCoverage } from "@/types/contracts";

export function analysisCoverageNotes(version?: { checkCoverage?: CheckCoverage | null }) {
  const coverage = version?.checkCoverage;
  if (!coverage) return ["Chưa có thông tin phạm vi kiểm tra theo tiêu chí mới."];
  const notes: string[] = [];
  if (coverage.notChecked) notes.push(`${coverage.notChecked} phép kiểm không thực hiện được vì thông tin chưa chắc chắn.`);
  if (coverage.unverified) notes.push(`${coverage.unverified} phép kiểm chưa xác minh được căn cứ hoặc điều kiện áp dụng.`);
  const uncovered = coverage.uncoveredTopics?.map((topic) => topic.name) ?? [];
  if (uncovered.length) notes.push(`Chưa có bộ tiêu chí kiểm tra cho: ${uncovered.join(", ")}.`);
  else if (coverage.clauseTypesWithoutPlaybook?.length) notes.push("Một số loại điều khoản chưa có bộ tiêu chí kiểm tra.");
  return notes;
}

export function coverageCounts(coverage: CheckCoverage) {
  return [
    { label: "Đạt", value: coverage.passed },
    { label: "Không đạt", value: coverage.failed },
    { label: "Không áp dụng", value: coverage.notApplicable },
    { label: "Không kiểm tra được", value: coverage.notChecked },
    { label: "Chưa xác minh", value: coverage.unverified },
  ];
}
