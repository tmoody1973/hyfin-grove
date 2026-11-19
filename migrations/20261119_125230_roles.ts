import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'editor' NOT NULL;`)
  // Everyone who has an account before Google sign-in exists is an admin (today: Tarik only).
  await db.execute(sql`UPDATE "users" SET "role" = 'admin';`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Forward-only: re-applying it would promote every editor to admin. Fix forward with a new migration instead.
  throw new Error("This auth migration is forward-only: re-applying it would promote every editor to admin.")
}
