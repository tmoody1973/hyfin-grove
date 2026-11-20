import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "support_page_plans" ALTER COLUMN "price" SET NOT NULL;
  ALTER TABLE "support_page_plans" ALTER COLUMN "donate_label" SET NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "support_page_plans" ALTER COLUMN "price" DROP NOT NULL;
  ALTER TABLE "support_page_plans" ALTER COLUMN "donate_label" DROP NOT NULL;`)
}
