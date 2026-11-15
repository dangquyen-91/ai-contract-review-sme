import { AppError } from '../../errors/AppError';
import { ChatMessageModel } from '../../models/chatMessage.model';
import { ClauseModel } from '../../models/clause.model';
import { ContractModel } from '../../models/contract.model';
import { RiskFindingModel } from '../../models/riskFinding.model';
import { getCurrentVersion, getCurrentVersionWithText } from '../contract/contractVersion.service';
import { generateText, generateTextStream } from '../ai/llm.service';
import { buildReviewContext, describeReviewContext, ReviewContext } from '../contract/contractProfile.service';
import { createRedactor, placeholderInstruction } from '../ai/redaction.service';
import { withUsage } from '../billing/usage.service';
import { LegalRetrievalStatus, searchLegalChunks } from '../legal/legalRetrieval.service';

const HISTORY_LIMIT = 10;
const LEGAL_EXCERPTS_PER_QUESTION = 4;

const SYSTEM_INSTRUCTION = `You are a legal assistant helping a user with no legal background understand a Vietnamese contract they uploaded.
Answer in Vietnamese, in plain language, using ONLY the contract content, the analysis and the legal excerpts provided in the prompt. Refer to clauses by their number (e.g. "Điều 3" or "clause 3") when relevant.
When the answer relies on a legal excerpt, name the article and the law it comes from (e.g. "Điều 301 Luật Thương mại 2005"). Never cite a law or an article that is not in the prompt; if the question is about the law and no excerpt covers it, say that the legal knowledge base has no matching provision instead of answering from memory.
If the answer is not in the contract, say so instead of guessing. You give information, not formal legal advice - recommend consulting a lawyer for important decisions.`;

interface ChatLegalSource {
  legalKnowledgeChunkId: string;
  citationLabel: string;
  sourceTitle: string;
  articleRef?: string;
}

interface ChatResult {
  reply: string;
  legalSources: ChatLegalSource[];
  legalRetrievalStatus: LegalRetrievalStatus;
}

async function loadContractContext(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersionWithText(contractId);
  if (version.segmentationStatus !== 'completed') {
    throw AppError.badRequest('Contract clauses have not been segmented yet');
  }
  return { contract, version };
}

async function buildContractContext(
  reviewContext: ReviewContext,
  version: {
    _id: unknown;
    summaryPoints?: string[];
    overallAssessment?: string[];
    analysisFocus?: string | null;
  },
): Promise<string> {
  const clauses = await ClauseModel.find({ contractVersionId: version._id }).sort({ index: 1 });
  const findings = await RiskFindingModel.find({
    contractVersionId: version._id,
    'verification.verdict': { $ne: 'rejected' },
  }).populate<{
    expectedClauseTypeId: { name: string } | null;
  }>('expectedClauseTypeId');

  const clauseIndexById = new Map(clauses.map((c) => [c._id.toString(), c.index]));

  const clauseBlock = clauses
    .map((c) => `[clause ${c.index + 1}]${c.title ? ` ${c.title}` : ''}\n${c.text}`)
    .join('\n\n');

  const legalBasisOf = (f: (typeof findings)[number]) => {
    const texts = f.legalBasis.map((b) => b.text).filter(Boolean);
    return texts.length ? ` Legal basis: ${texts.join(' ')}` : '';
  };
  const findingLines = findings.flatMap((f) => {
    if (!f.clauseId)
      return [`- (${f.severity}, missing clause) ${f.title}: ${f.problem.join(' ')}${legalBasisOf(f)}`];
    const clauseIndex = clauseIndexById.get(f.clauseId.toString());
    if (clauseIndex === undefined) return [];
    return [`- (${f.severity}, clause ${clauseIndex + 1}) ${f.title}: ${f.problem.join(' ')}${legalBasisOf(f)}`];
  });
  const findingBlock =
    findingLines.length > 0 ? findingLines.join('\n') : '(no risk findings recorded)';

  return [
    describeReviewContext(reviewContext),
    version.analysisFocus ? `Analysis focus requested by user: ${version.analysisFocus}` : '',
    version.summaryPoints?.length
      ? `Summary:\n${version.summaryPoints.map((p) => `- ${p}`).join('\n')}`
      : '',
    version.overallAssessment?.length
      ? `Overall assessment:\n${version.overallAssessment.map((p) => `- ${p}`).join('\n')}`
      : '',
    `Clauses:\n"""\n${clauseBlock}\n"""`,
    `Risk findings:\n${findingBlock}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function buildHistoryBlock(contractVersionId: unknown): Promise<string> {
  const recent = await ChatMessageModel.find({ contractVersionId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(HISTORY_LIMIT);
  if (recent.length === 0) return '';
  const lines = recent
    .reverse()
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
  return `Previous conversation:\n${lines}\n\n`;
}

async function retrieveLegalContext(question: string, legalSourceCodes: string[], signal: AbortSignal) {
  const {
    matches: [found = []],
    status,
  } = await searchLegalChunks([question], LEGAL_EXCERPTS_PER_QUESTION, { legalSourceCodes, signal });
  const excerpts = found
    .map((m, i) => `[L${i + 1}] ${m.citationLabel}${m.articleRef ? `, ${m.articleRef}` : ''}\n${m.chunkText}`)
    .join('\n\n');
  return {
    block: found.length
      ? `Legal excerpts that may be relevant to the question (retrieved by search, they may or may not apply):\n"""\n${excerpts}\n"""\n\n`
      : '',
    status,
    sources: found.map(
      (m): ChatLegalSource => ({
        legalKnowledgeChunkId: m.chunkId,
        citationLabel: m.citationLabel,
        sourceTitle: m.sourceTitle,
        articleRef: m.articleRef,
      }),
    ),
  };
}

async function prepareChat(orgId: string, contractId: string, message: string) {
  const { contract, version } = await loadContractContext(orgId, contractId);

  const reviewContext = await buildReviewContext(contract);
  const redactor = createRedactor(version.extractedText ?? '', reviewContext.redactionPolicy);
  const contextBlock = await buildContractContext(reviewContext, version);
  const historyBlock = await buildHistoryBlock(version._id);

  return {
    versionId: version._id,
    redactor,
    systemInstruction: SYSTEM_INSTRUCTION + placeholderInstruction(redactor),
    retrieveLegal: (signal: AbortSignal) =>
      retrieveLegalContext(redactor.mask(message), reviewContext.legalSourceCodes, signal),
    buildPrompt: (legalBlock: string) =>
      redactor.mask(`${contextBlock}\n\n${legalBlock}${historyBlock}User question: ${message}`),
  };
}

async function saveExchange(
  versionId: unknown,
  orgId: string,
  userId: string,
  message: string,
  reply: string,
  legalSources: ChatLegalSource[],
) {
  await ChatMessageModel.insertMany([
    { contractVersionId: versionId, orgId, userId, role: 'user', content: message },
    { contractVersionId: versionId, orgId, userId, role: 'assistant', content: reply, legalSources },
  ]);
}

export async function askAboutContract(
  orgId: string,
  userId: string,
  contractId: string,
  message: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  const { versionId, redactor, systemInstruction, retrieveLegal, buildPrompt } = await prepareChat(
    orgId,
    contractId,
    message,
  );
  const usage = await withUsage(
    {
      orgId,
      userId,
      contractId,
      kind: 'chat',
      idempotencyKey,
      payload: { versionId: versionId.toString(), message },
    },
    async (runSignal): Promise<ChatResult> => {
      const legal = await retrieveLegal(runSignal);
      const reply = redactor.unmask(await generateText(buildPrompt(legal.block), systemInstruction, runSignal));
      runSignal.throwIfAborted();
      await saveExchange(versionId, orgId, userId, message, reply, legal.sources);
      return { reply, legalSources: legal.sources, legalRetrievalStatus: legal.status };
    },
    signal,
  );
  return { ...usage.result, runId: usage.runId, replayed: usage.replayed };
}

export async function streamAboutContract(
  orgId: string,
  userId: string,
  contractId: string,
  message: string,
  onToken: (token: string) => void,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  const { versionId, redactor, systemInstruction, retrieveLegal, buildPrompt } = await prepareChat(
    orgId,
    contractId,
    message,
  );

  const usage = await withUsage(
    {
      orgId,
      userId,
      contractId,
      kind: 'chat',
      idempotencyKey,
      payload: { versionId: versionId.toString(), message },
    },
    async (runSignal): Promise<ChatResult> => {
      const legal = await retrieveLegal(runSignal);
      const unmasker = redactor.createStreamUnmasker();
      let reply = '';
      const emit = (text: string) => {
        if (!text) return;
        reply += text;
        onToken(text);
      };
      for await (const token of generateTextStream(buildPrompt(legal.block), systemInstruction, runSignal)) {
        emit(unmasker.push(token));
      }
      emit(unmasker.flush());
      runSignal.throwIfAborted();
      if (!reply) throw AppError.internal('LLM returned an empty response.');
      await saveExchange(versionId, orgId, userId, message, reply, legal.sources);
      return { reply, legalSources: legal.sources, legalRetrievalStatus: legal.status };
    },
    signal,
  );
  if (usage.replayed) onToken(usage.result.reply);
  return { ...usage.result, runId: usage.runId, replayed: usage.replayed };
}

export async function listChatMessages(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersion(contractId);
  return ChatMessageModel.find({ contractVersionId: version._id }).sort({ createdAt: 1, _id: 1 });
}
