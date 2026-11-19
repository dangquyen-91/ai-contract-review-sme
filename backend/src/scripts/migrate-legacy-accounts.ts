import { connectDB, disconnectDB } from '../config/db';
import { MembershipModel } from '../models/membership.model';
import { migrateLegacyAccounts } from '../migrations/legacyAccounts.migration';

// Dry-run by default: prints what would change and rolls every transaction back.
// Pass --apply to write. Safe to re-run; migrated accounts are skipped.
async function main() {
  const apply = process.argv.includes('--apply');
  try {
    await connectDB();
    await MembershipModel.init();
    const report = await migrateLegacyAccounts({ apply });
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (!apply) process.stdout.write('\nDry run only. Re-run with --apply to write these changes.\n');
    if (report.skipped.length) process.exitCode = 2;
  } finally {
    await disconnectDB();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
