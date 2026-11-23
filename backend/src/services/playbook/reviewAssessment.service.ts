import { Schema, Type } from '@google/genai';
import { z } from 'zod';
import { placeholderInstruction, Redactor } from '../ai/redaction.service';
import { describeReviewContext, ReviewContext } from '../contract/contractProfile.service';
import type { DocumentCheckResult, CheckResult } from './playbookEvaluation.service';
import { CLAUSE_PLAYBOOKS } from './playbook.service';
import { askJson } from './playbookEvidence.service';
import { FAILED_CHECK_LABELS, UNVERIFIED_COMPLIANCE_LABEL } from './playbookSchema';
import { foldForMatch } from './quoteMatching';

export interface AssessmentPoint {
  text: string;
  checkCodes: string[];
}

export interface AssessmentInput {
  context: ReviewContext;
  results: CheckResult[];
  documentFindings: DocumentCheckResult[];
  referrals: { clauseIndex: number; concern: string }[];
  problemOf: (result: CheckResult) => string[];
  redactor: Redactor;
  signal?: AbortSignal;
}

const MAX_POINTS = 4;
const SEVERITY_WORDS = /nghiem trong|rui ro (cao|lon|nhat)|lon nhat|boc lot|nguy hiem|vo hieu|ro ret|tuong doi so sai/;
const VIOLATION_WORDS = /(?<!phat |ben )vi pham|trai (phap )?luat/;
const IMBALANCE_WORDS = /thien vi|co loi cho|bat loi cho|lech ve/;

const assessmentParser = z.object({
  points: z.array(z.object({ text: z.string().min(1), codes: z.array(z.string()) })),
});

const assessmentResponse: Schema = {
  type: Type.OBJECT,
  properties: {
    points: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { text: { type: Type.STRING }, codes: { type: Type.ARRAY, items: { type: Type.STRING } } },
        required: ['text', 'codes'],
      },
    },
  },
  required: ['points'],
};

interface Line {
  code: string;
  label: string;
  text: string;
}

function resultLines({ results, documentFindings, referrals, problemOf }: AssessmentInput) {
  const where = (clauseIndex?: number) => (clauseIndex === undefined ? 'cả hợp đồng' : `điều khoản index=${clauseIndex}`);
  const open: Line[] = [
    ...results
      .filter((result) => result.outcome === 'failed' || result.outcome === 'unverified')
      .map((result) => ({
        code: result.code,
        label: result.outcome === 'failed' ? FAILED_CHECK_LABELS[result.group] : UNVERIFIED_COMPLIANCE_LABEL,
        text: `${where(result.clauseIndex)}: ${result.title}. ${problemOf(result).join(' ')} Hệ quả: ${result.whyItMatters}`,
      })),
    ...documentFindings.map((finding) => ({
      code: finding.code,
      label: FAILED_CHECK_LABELS[finding.check.group],
      text: `${where(finding.clauseIndex)}: ${finding.title}. ${finding.detail}`,
    })),
  ];
  const questions: Line[] = referrals.map((referral, i) => ({
    code: `CG-${i + 1}`,
    label: 'Câu hỏi cho chuyên gia, chưa phải kết luận',
    text: `${where(referral.clauseIndex)}: ${referral.concern}`,
  }));
  const topicOf = (code: string) => CLAUSE_PLAYBOOKS.find((playbook) => playbook.checks.some((check) => check.code === code))?.title;
  const openTopics = new Set(
    results.filter((result) => result.outcome !== 'passed' && result.outcome !== 'not_applicable').flatMap((result) => topicOf(result.code) ?? []),
  );
  const passed: Line[] = results
    .filter((result) => result.outcome === 'passed' && !openTopics.has(topicOf(result.code) ?? ''))
    .map((result) => ({ code: result.code, label: 'Đạt', text: result.title }));
  return { open, questions, passed };
}

function assessmentPrompt(input: AssessmentInput, lines: ReturnType<typeof resultLines>) {
  const { context, redactor } = input;
  const block = (items: Line[]) =>
    items.length ? items.map((line) => `- [${line.code}] ${line.label} | ${redactor.mask(line.text)}`).join('\n') : '- (không có)';
  return `You write the "Đánh giá tổng quan" of a contract review: a short overall opinion in Vietnamese, like the opening remarks of a lawyer, based ONLY on the check results below.

${describeReviewContext(context)}

Write 2-${MAX_POINTS} points with full Vietnamese diacritics. Each point is one or two sentences, and "codes" lists the codes in square brackets that the point relies on. Cover, when they apply:
- how complete and clear the contract is overall, judged by the results;
- what needs attention first, in this order: "Vi phạm", "Thiếu nội dung", "Chưa rõ ràng", "Nên thương lượng", "Lỗi soạn thảo", "Chưa xác minh được";
- whose interests the "Nên thương lượng" results work against, only if there are such results;
- what is in order, from the passed checks only (name the topics, not the codes); never describe a topic as in order when any result about it did not pass.
When the user's party is known, address the user as "bạn".

Rules:
- Use only the results below. Do not add facts, consequences or legal conclusions that are not in them.
- When you say how many problems there are, count the listed results exactly; do not say "nhiều" for one item.
- Call something a violation ("vi phạm") only when its result is labelled "Vi phạm". Expert questions are open questions, never problems or conclusions.
- Do not grade severity: never use words such as "nghiêm trọng", "rủi ro lớn nhất", "rõ rệt", "bóc lột", and do not call the contract "an toàn".
- When no result failed, say that no problem was found against the checked criteria and name what was checked.${placeholderInstruction(redactor)}

Results that did not pass:
${block(lines.open)}

Questions suggested for a lawyer:
${block(lines.questions)}

Passed checks:
${block(lines.passed)}`;
}

function acceptPoint(point: { text: string; codes: string[] }, lines: ReturnType<typeof resultLines>, redactor: Redactor) {
  const known = new Map([...lines.open, ...lines.questions, ...lines.passed].map((line) => [line.code, line]));
  const codes = [...new Set(point.codes.map((code) => code.replace(/[[\]\s]/g, '')))].filter((code) => known.has(code));
  if (codes.length === 0) return null;
  const text = redactor.unmask(point.text).trim();
  const folded = foldForMatch(text);
  if (SEVERITY_WORDS.test(folded)) return null;
  const labels = codes.map((code) => known.get(code)?.label);
  if (VIOLATION_WORDS.test(folded) && !labels.includes(FAILED_CHECK_LABELS.compliance)) return null;
  if (IMBALANCE_WORDS.test(folded) && !labels.includes(FAILED_CHECK_LABELS.balance)) return null;
  return { text, checkCodes: codes.filter((code) => !code.startsWith('CG-')) };
}

export async function writeAssessment(input: AssessmentInput): Promise<AssessmentPoint[]> {
  const lines = resultLines(input);
  const { points } = await askJson(assessmentPrompt(input, lines), assessmentResponse, assessmentParser, input.signal);
  return points
    .slice(0, MAX_POINTS)
    .flatMap((point) => {
      const accepted = acceptPoint(point, lines, input.redactor);
      return accepted ? [accepted] : [];
    });
}
