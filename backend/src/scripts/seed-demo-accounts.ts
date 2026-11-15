import { randomBytes } from 'node:crypto';
import { connectDB, disconnectDB } from '../config/db';
import { login } from '../services/identity/auth.service';
import { seedDemoAccounts } from '../services/identity/demoAccounts.seed';

async function main() {
  // Passwords are supplied at runtime or generated, never committed to source.
  const password =
    process.env.DEMO_SEED_PASSWORD ?? `LawScan!${randomBytes(12).toString('base64url')}`;
  try {
    await connectDB();
    const result = await seedDemoAccounts(password);
    for (const account of result.accounts.filter((row) => row.created)) {
      const session = await login({ email: account.email, password });
      if (!('access' in session) || session.access.role !== account.role) {
        throw new Error(`Kiểm tra đăng nhập hoặc quyền thất bại: ${account.email}`);
      }
      const organizationRole = account.role === 'owner' || account.role === 'staff';
      if (session.access.orgId !== (organizationRole ? result.organizationId : undefined)) {
        throw new Error(`Kiểm tra workspace thất bại: ${account.email}`);
      }
    }
    process.stdout.write(
      JSON.stringify(
        {
          ...result,
          accounts: result.accounts.map((row) => ({
            ...row,
            password: row.created ? password : 'Giữ nguyên mật khẩu hiện tại',
          })),
          verifiedNewLogins: result.accounts.filter((row) => row.created).length,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await disconnectDB();
  }
}

main().catch((error: unknown) => {
  // Avoid exposing database connection credentials through raw driver errors.
  console.error(
    error instanceof Error && !error.name.startsWith('Mongo')
      ? error.message
      : 'Không thể seed tài khoản demo. Kiểm tra kết nối DB.',
  );
  process.exitCode = 1;
});
