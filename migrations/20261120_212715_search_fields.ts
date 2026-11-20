import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_search_kind" AS ENUM('story', 'show', 'host', 'event', 'page');
  ALTER TABLE "search" ADD COLUMN "kind" "enum_search_kind";
  ALTER TABLE "search" ADD COLUMN "href" varchar;
  ALTER TABLE "search" ADD COLUMN "label" varchar;
  ALTER TABLE "search" ADD COLUMN "date" timestamp(3) with time zone;
  ALTER TABLE "search" ADD COLUMN "image_url" varchar;
  ALTER TABLE "search" ADD COLUMN "excerpt" varchar;
  ALTER TABLE "search" ADD COLUMN "body" varchar;
  ALTER TABLE "search" ADD COLUMN "visible" boolean DEFAULT false;
  ALTER TABLE "search_rels" ADD COLUMN "shows_id" integer;
  ALTER TABLE "search_rels" ADD COLUMN "hosts_id" integer;
  ALTER TABLE "search_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "search_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_shows_fk" FOREIGN KEY ("shows_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_hosts_fk" FOREIGN KEY ("hosts_id") REFERENCES "public"."hosts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "search_kind_idx" ON "search" USING btree ("kind");
  CREATE INDEX "search_visible_idx" ON "search" USING btree ("visible");
  CREATE INDEX "search_rels_shows_id_idx" ON "search_rels" USING btree ("shows_id");
  CREATE INDEX "search_rels_hosts_id_idx" ON "search_rels" USING btree ("hosts_id");
  CREATE INDEX "search_rels_events_id_idx" ON "search_rels" USING btree ("events_id");
  CREATE INDEX "search_rels_pages_id_idx" ON "search_rels" USING btree ("pages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "search_rels" DROP CONSTRAINT "search_rels_shows_fk";
  
  ALTER TABLE "search_rels" DROP CONSTRAINT "search_rels_hosts_fk";
  
  ALTER TABLE "search_rels" DROP CONSTRAINT "search_rels_events_fk";
  
  ALTER TABLE "search_rels" DROP CONSTRAINT "search_rels_pages_fk";
  
  DROP INDEX "search_kind_idx";
  DROP INDEX "search_visible_idx";
  DROP INDEX "search_rels_shows_id_idx";
  DROP INDEX "search_rels_hosts_id_idx";
  DROP INDEX "search_rels_events_id_idx";
  DROP INDEX "search_rels_pages_id_idx";
  ALTER TABLE "search" DROP COLUMN "kind";
  ALTER TABLE "search" DROP COLUMN "href";
  ALTER TABLE "search" DROP COLUMN "label";
  ALTER TABLE "search" DROP COLUMN "date";
  ALTER TABLE "search" DROP COLUMN "image_url";
  ALTER TABLE "search" DROP COLUMN "excerpt";
  ALTER TABLE "search" DROP COLUMN "body";
  ALTER TABLE "search" DROP COLUMN "visible";
  ALTER TABLE "search_rels" DROP COLUMN "shows_id";
  ALTER TABLE "search_rels" DROP COLUMN "hosts_id";
  ALTER TABLE "search_rels" DROP COLUMN "events_id";
  ALTER TABLE "search_rels" DROP COLUMN "pages_id";
  DROP TYPE "public"."enum_search_kind";`)
}
