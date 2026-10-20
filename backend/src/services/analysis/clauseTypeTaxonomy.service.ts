import { ClauseTypeTaxonomyModel } from '../../models/clauseTypeTaxonomy.model';
import { DEFAULT_TAXONOMY } from './clauseTypeTaxonomy.data';

export async function seedDefaultClauseTaxonomy(): Promise<void> {
  await Promise.all(
    DEFAULT_TAXONOMY.map((entry) =>
      ClauseTypeTaxonomyModel.findOneAndUpdate({ code: entry.code }, { $set: entry }, { upsert: true }),
    ),
  );
}

export async function getTaxonomyIdByCode(): Promise<Map<string, string>> {
  const all = await ClauseTypeTaxonomyModel.find();
  return new Map(all.map((t) => [t.code, t._id.toString()]));
}

export async function getTaxonomyByCodes(codes: readonly string[]) {
  const entries = await ClauseTypeTaxonomyModel.find({ code: { $in: codes } });
  const byCode = new Map(entries.map((entry) => [entry.code as string, entry]));
  return codes.flatMap((code) => byCode.get(code) ?? []);
}
