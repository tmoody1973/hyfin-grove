import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cds_sync_status" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"last_run_at" timestamp(3) with time zone,
  	"last_success_at" timestamp(3) with time zone,
  	"last_error" varchar,
  	"last_counts" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "posts" ADD COLUMN "cds_body" jsonb;
  ALTER TABLE "posts" ADD COLUMN "cds_document_id" varchar;
  ALTER TABLE "posts" ADD COLUMN "cds_canonical_url" varchar;
  ALTER TABLE "posts" ADD COLUMN "cds_image_url" varchar;
  ALTER TABLE "posts" ADD COLUMN "cds_editorial_last_modified" timestamp(3) with time zone;
  ALTER TABLE "posts" ADD COLUMN "cds_last_checked_at" timestamp(3) with time zone;
  ALTER TABLE "posts" ADD COLUMN "cds_withdrawn_at" timestamp(3) with time zone;
  CREATE UNIQUE INDEX "posts_cds_cds_document_id_idx" ON "posts" USING btree ("cds_document_id");
  CREATE INDEX "posts_cds_cds_withdrawn_at_idx" ON "posts" USING btree ("cds_withdrawn_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cds_sync_status" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cds_sync_status" CASCADE;
  DROP INDEX "posts_cds_cds_document_id_idx";
  DROP INDEX "posts_cds_cds_withdrawn_at_idx";
  ALTER TABLE "posts" DROP COLUMN "cds_body";
  ALTER TABLE "posts" DROP COLUMN "cds_document_id";
  ALTER TABLE "posts" DROP COLUMN "cds_canonical_url";
  ALTER TABLE "posts" DROP COLUMN "cds_image_url";
  ALTER TABLE "posts" DROP COLUMN "cds_editorial_last_modified";
  ALTER TABLE "posts" DROP COLUMN "cds_last_checked_at";
  ALTER TABLE "posts" DROP COLUMN "cds_withdrawn_at";`)
}
