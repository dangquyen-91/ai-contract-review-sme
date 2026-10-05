import { AppError } from '../errors/AppError';
import { ChatMessageModel } from '../models/chatMessage.model';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { RiskFindingModel } from '../models/riskFinding.model';
import { getCurrentVersion } from './contractVersion.service';
import { generateText } from './llm.service';
import { CONTRACT_TYPE_LABELS } from './riskDetection.service';

const HISTORY_LIMIT = 10;

const SYSTEM_INSTRUCTION = `You are a legal assistant helping a small business owner understand a Vietnamese contract they uploaded.
Answer in Vietnamese, in plain language, using ONLY the contract content and analysis provided in the prompt. Refer to clauses by their number (e.g. "Dieu 3" or "clause 3") when relevant.
If the answer is not in the contract, say so instead of guessing. You give information, not formal legal advice - recommend consulting a lawyer for important decisions.`;

async function loadContractContext(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersion(contractId);
  if (version.segmentationStatus !== 'completed') {
    throw AppError.badRequest('Contract clauses have not been segmented yet');
  }
  return { contract, version };
}

async function buildContractContext(
  contract: { type: keyof typeof CONTRACT_TYPE_LABELS },
  version: { _id: unknown; summary?: string | null; analysisFocus?: string | null },
): Promise<string> {
  const clauses = await ClauseModel.find({ contractVersionId: version._id }).sort({ index: 1 });
  const findings = await RiskFindingModel.find({ contractVersionId: version._id }).populate<{
    expectedClauseTypeId: { name: string } | null;
  }>('expectedClauseTypeId');

  const clauseIndexById = new Map(clauses.map((c) => [c._id.toString(), c.index]));

  const clauseBlock = clauses
    .map((c) => `[clause ${c.index + 1}]${c.title ? ` ${c.title}` : ''}\n${c.text}`)
    .join('\n\n');

  const findingBlock =
    findings.length > 0
      ? findings
          .map((f) => {
            const where = f.clauseId ? `clause ${(clauseIndexById.get(f.clauseId.toString()) ?? 0) + 1}` : 'missing clause';
            return `- (${f.severity}, ${where}) ${f.title}: ${f.explanation}`;
          })
          .join('\n')
      : '(no risk findings recorded)';

  return [
    `Contract type: ${CONTRACT_TYPE_LABELS[contract.type]}`,
    version.analysisFocus ? `Analysis focus requested by user: ${version.analysisFocus}` : '',
    version.summary ? `Summary:\n${version.summary}` : '',
    `Clauses:\n"""\n${clauseBlock}\n"""`,
    `Risk findings:\n${findingBlock}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function buildHistoryBlock(contractVersionId: unknown): Promise<string> {
  const recent = await ChatMessageModel.find({ contractVersionId })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT);
  if (recent.length === 0) return '';
  const lines = recent
    .reverse()
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
  return `Previous conversation:\n${lines}\n\n`;
}

export async function askAboutContract(
  orgId: string,
  userId: string,
  contractId: string,
  message: string,
) {
  const { contract, version } = await loadContractContext(orgId, contractId);

  const contextBlock = await buildContractContext(contract, version);
  const historyBlock = await buildHistoryBlock(version._id);
  const prompt = `${contextBlock}\n\n${historyBlock}User question: ${message}`;

  const reply = await generateText(prompt, SYSTEM_INSTRUCTION);

  await ChatMessageModel.insertMany([
    { contractVersionId: version._id, orgId, userId, role: 'user', content: message },
    { contractVersionId: version._id, orgId, userId, role: 'assistant', content: reply },
  ]);

  return { reply };
}

export async function listChatMessages(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersion(contractId);
  return ChatMessageModel.find({ contractVersionId: version._id }).sort({ createdAt: 1 });
}
