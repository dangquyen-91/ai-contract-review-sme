import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { seedAccounts } from '../services/identity/seedAccounts.service';

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Demo accounts can only be seeded in development or test');
  }
  try {
    await connectDB();
    console.table(await seedAccounts(process.env.SEED_ACCOUNT_PASSWORD ?? 'SeedAccount123!'));
  } finally {
    await disconnectDB();
  }
}

main().catch((error: unknown) => {
  console.error('Account seed failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
