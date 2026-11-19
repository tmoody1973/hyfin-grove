import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_posts_source" ADD VALUE 'station';
  ALTER TABLE "posts" ADD COLUMN "station_url" varchar;
  ALTER TABLE "posts" ADD COLUMN "station_cds_copy_id" varchar;
  CREATE UNIQUE INDEX "posts_station_station_url_idx" ON "posts" USING btree ("station_url");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ALTER COLUMN "source" SET DATA TYPE text;
  DROP TYPE "public"."enum_posts_source";
  CREATE TYPE "public"."enum_posts_source" AS ENUM('wordpress', 'cds');
  ALTER TABLE "posts" ALTER COLUMN "source" SET DATA TYPE "public"."enum_posts_source" USING "source"::"public"."enum_posts_source";
  DROP INDEX "posts_station_station_url_idx";
  ALTER TABLE "posts" DROP COLUMN "station_url";
  ALTER TABLE "posts" DROP COLUMN "station_cds_copy_id";`)
}
