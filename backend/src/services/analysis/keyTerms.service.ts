import { AppError } from '../../errors/AppError';
import { ClauseModel } from '../../models/clause.model';
import { ContractModel } from '../../models/contract.model';
import { resolveVersion } from '../contract/contractVersion.service';
import { playbookFieldLabel } from '../playbook/playbook.service';

export async function listKeyTerms(orgId: string, contractId: string, versionId?: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
  const version = await resolveVersion(contractId, versionId);
  const terms = version.keyTerms ?? [];
  const clauseIds = terms.flatMap((t) => (t.clauseId ? [t.clauseId] : []));
  const clauses = clauseIds.length
    ? await ClauseModel.find({ _id: { $in: clauseIds } }).select('index title')
    : [];
  const clauseById = new Map(clauses.map((c) => [c._id.toString(), c]));

  return {
    extractedAt: version.keyTermsExtractedAt ?? null,
    terms: terms.map((t) => {
      const clause = t.clauseId ? clauseById.get(t.clauseId.toString()) : undefined;
      return {
        key: t.key,
        label: t.label ?? playbookFieldLabel(t.key) ?? t.key,
        value: t.numberValue ?? t.booleanValue ?? t.textValue ?? null,
        deferred: Boolean(t.deferred),
        clause: clause ? { index: clause.index, title: clause.title ?? null } : null,
        quote: t.quote ?? null,
      };
    }),
  };
}
