/**
 * Prisma 7 CLI configuration.
 * Database URL and migration/seed settings live here; schema.prisma only defines provider.
 *
 * Migrations (migrate dev / migrate deploy) must use a DIRECT connection, not PgBouncer
 * transaction-mode pooler, or you get: "prepared statement \"s1\" already exists".
 * Set DIRECT_DATABASE_URL to your direct DB URL (e.g. Supabase port 5432, host db.xxx.supabase.co).
 * The app runtime continues to use DATABASE_URL (pooler is fine for the Nest app).
 * @see https://www.prisma.io/docs/orm/reference/prisma-config-reference
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node -r tsconfig-paths/register prisma/seed.ts',
  },
  datasource: {
    url:
      process.env.DIRECT_DATABASE_URL ||
      process.env.DATABASE_URL ||
      '',
    ...(process.env.SHADOW_DATABASE_URL && {
      shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
    }),
  },
});
