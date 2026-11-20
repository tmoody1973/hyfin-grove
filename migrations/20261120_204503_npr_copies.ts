import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_npr_origin" AS ENUM('race', 'picked');
  ALTER TYPE "public"."enum_posts_source" ADD VALUE 'npr';
  ALTER TABLE "posts" ADD COLUMN "npr_origin" "enum_posts_npr_origin";
  ALTER TABLE "posts" ADD COLUMN "npr_picked_by_id" integer;
  ALTER TABLE "posts" ADD COLUMN "npr_picked_at" timestamp(3) with time zone;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_npr_picked_by_id_users_id_fk" FOREIGN KEY ("npr_picked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_npr_npr_picked_by_idx" ON "posts" USING btree ("npr_picked_by_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP CONSTRAINT "posts_npr_picked_by_id_users_id_fk";
  
  ALTER TABLE "posts" ALTER COLUMN "source" SET DATA TYPE text;
  DROP TYPE "public"."enum_posts_source";
  CREATE TYPE "public"."enum_posts_source" AS ENUM('wordpress', 'cds', 'station');
  ALTER TABLE "posts" ALTER COLUMN "source" SET DATA TYPE "public"."enum_posts_source" USING "source"::"public"."enum_posts_source";
  DROP INDEX "posts_npr_npr_picked_by_idx";
  ALTER TABLE "posts" DROP COLUMN "npr_origin";
  ALTER TABLE "posts" DROP COLUMN "npr_picked_by_id";
  ALTER TABLE "posts" DROP COLUMN "npr_picked_at";
  DROP TYPE "public"."enum_posts_npr_origin";`)
}
