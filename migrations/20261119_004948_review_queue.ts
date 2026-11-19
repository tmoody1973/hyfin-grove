import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_sorting_reasons" AS ENUM('low-confidence', 'top-traffic', 'recent');
  CREATE TABLE "posts_sorting_reasons" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_posts_sorting_reasons",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "posts" ADD COLUMN "sorting_reviewed" boolean DEFAULT false;
  ALTER TABLE "posts_sorting_reasons" ADD CONSTRAINT "posts_sorting_reasons_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_sorting_reasons_order_idx" ON "posts_sorting_reasons" USING btree ("order");
  CREATE INDEX "posts_sorting_reasons_parent_idx" ON "posts_sorting_reasons" USING btree ("parent_id");
  CREATE INDEX "posts_sorting_sorting_needs_review_idx" ON "posts" USING btree ("sorting_needs_review");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_sorting_reasons" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts_sorting_reasons" CASCADE;
  DROP INDEX "posts_sorting_sorting_needs_review_idx";
  ALTER TABLE "posts" DROP COLUMN "sorting_reviewed";
  DROP TYPE "public"."enum_posts_sorting_reasons";`)
}
