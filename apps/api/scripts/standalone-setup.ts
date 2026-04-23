/**
 * Standalone Setup Script
 *
 * Creates a group and an initial administrator user for standalone
 * deployments.  Run once against a freshly migrated database.
 *
 * No BullMQ, no HTTP calls, no NestJS bootstrap — pure Prisma.
 *
 * Required env vars:
 *   DATABASE_URL            — PostgreSQL connection string
 *   STANDALONE_GROUP_NAME   — display name for the group (e.g. "Acme Ltd")
 *   STANDALONE_GROUP_EMAIL  — email for the initial admin user
 *
 * Optional env vars:
 *   STANDALONE_SKIP_EMAIL=true — suppress the welcome-email note in output
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import { RoleScope, systemRole } from '../prisma/generated/enums';
import * as bcrypt from 'bcrypt';
import { seedDefaultChartOfAccounts } from '../seeders/seed-account-chart';

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Read a required env var.  Exits with a clear message rather than letting
 * Prisma or downstream code produce a confusing error.
 * Returning `string` (not `string | undefined`) lets TypeScript trust the
 * result without needing non-null assertions throughout the script.
 */
function requireEnv(key: string): string {
  const val = process.env[key]?.trim();
  if (!val) {
    console.error(`✗ Missing required env var: ${key}`);
    process.exit(1);
  }
  return val;
}

const groupName = requireEnv('STANDALONE_GROUP_NAME');
const groupEmail = requireEnv('STANDALONE_GROUP_EMAIL');
const skipEmail = process.env.STANDALONE_SKIP_EMAIL === 'true';

// ─── Prisma ───────────────────────────────────────────────────────────────────

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mirror of src/auth/utils/helper.ts — inlined to keep the script
 * self-contained without importing from src/ in a plain ts-node context.
 */
function generateSubdomain(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\nXFinance — Standalone Setup');
  console.log('─'.repeat(44));

  // ── Guard: abort if any group already exists ───────────────────────────────
  const existingCount = await prisma.group.count();
  if (existingCount > 0) {
    console.error(
      `\n✗ ${existingCount} group(s) already exist in this database.`,
    );
    console.error(
      '  standalone-setup is intended for fresh databases only.',
    );
    console.error(
      '  If you need to reset, drop/recreate the database first.\n',
    );
    process.exit(1);
  }

  // ── Guard: administrator role template must already be seeded ──────────────
  const templateAdminRole = await prisma.role.findFirst({
    where: {
      name: 'administrator',
      isSystemRole: true,
      groupId: null,
      scope: RoleScope.ADMIN,
    },
    include: { rolePermissions: true },
  });

  if (!templateAdminRole) {
    console.error('\n✗ Administrator role template not found.');
    console.error(
      '  Run:  npm run seed:admin-role\n  then retry this script.\n',
    );
    process.exit(1);
  }

  // ── 1. Create group ────────────────────────────────────────────────────────
  console.log(`\n[1/4] Creating group "${groupName}"...`);
  const group = await prisma.group.create({
    data: {
      name: groupName,
      legalName: groupName,
      logo: { publicId: '', secureUrl: '' },
      taxId: 'N/A',
      industry: 'General',
      address: 'N/A',
      city: 'N/A',
      province: 'N/A',
      postalCode: 'N/A',
      country: 'N/A',
      email: groupEmail,
      phone: 'N/A',
      subdomain: generateSubdomain(groupName),
    },
  });
  console.log(`      ✓ Group created  (id: ${group.id})`);

  // ── 2. Clone administrator role from template ──────────────────────────────
  console.log(
    `\n[2/4] Cloning administrator role ` +
      `(${templateAdminRole.rolePermissions.length} permissions)...`,
  );
  const adminRole = await prisma.role.create({
    data: {
      name: 'administrator',
      groupId: group.id,
      isSystemRole: true,
      scope: RoleScope.ADMIN,
      description: 'Group administrator role (cloned from template)',
      rolePermissions: {
        create: templateAdminRole.rolePermissions.map((rp) => ({
          permissionId: rp.permissionId,
        })),
      },
    },
  });
  console.log(`      ✓ Role cloned  (id: ${adminRole.id})`);

  // ── 3. Seed default chart of accounts ─────────────────────────────────────
  console.log('\n[3/4] Seeding default chart of accounts...');
  try {
    await seedDefaultChartOfAccounts(group.id);
    // seedDefaultChartOfAccounts prints its own per-item progress lines
  } catch (err) {
    // Non-fatal — operator can re-run seed:account-types manually
    console.warn(`      ⚠ Chart of accounts seeding failed: ${err}`);
    console.warn(
      '        Run npm run seed:account-types manually after setup.',
    );
  }

  // ── 4. Create admin user ───────────────────────────────────────────────────
  console.log(`\n[4/4] Creating admin user (${groupEmail})...`);
  const password = 'Password123';
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email: groupEmail,
      firstName: groupName,
      lastName: 'Administrator',
      password: hashed,
      groupId: group.id,
      roleId: adminRole.id,
      systemRole: systemRole.admin,
      adminEntities: [], // empty = full access to all entities in this group
    },
  });
  console.log('      ✓ Admin user created');

  // Subscription creation is intentionally skipped — standalone mode has
  // no subscription records (see CLAUDE.md Key Design Decisions).
  //
  // Welcome email is intentionally skipped — credentials are printed below.

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(44));
  console.log('✓ Standalone setup complete\n');
  console.log(`  Group ID:   ${group.id}`);
  console.log(
    '  Set this as DEFAULT_GROUP_ID in your .env and restart the app.',
  );
  console.log(`\n  Admin login: ${groupEmail} / ${password}`);
  if (!skipEmail) {
    console.log(
      '\n  Note: set STANDALONE_SKIP_EMAIL=true to suppress this block.',
    );
  }
  console.log('─'.repeat(44) + '\n');
}

main()
  .catch((err) => {
    console.error(
      '\n✗ Setup failed:',
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
