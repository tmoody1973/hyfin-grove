import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "sub" varchar;
  CREATE INDEX "users_sub_idx" ON "users" USING btree ("sub");`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Forward-only: re-applying it would unlink every Google account, so a reassigned address could take over an old account. Fix forward with a new migration instead.
  throw new Error("This auth migration is forward-only: re-applying it would unlink every Google account, so a reassigned address could take over an old account.")
}
